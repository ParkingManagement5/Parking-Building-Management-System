package com.swp391.parking.integration;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.response.BookingResponse;
import com.swp391.parking.dto.response.PaymentResponse;
import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.scheduler.BookingScheduler;
import com.swp391.parking.service.BookingService;
import com.swp391.parking.service.ParkingSessionService;
import com.swp391.parking.service.PaymentService;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import com.swp391.parking.util.QrTokenUtil;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BookingQrExpiryIntegrationTest extends AbstractIntegrationTestSupport {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private ParkingSessionService parkingSessionService;

    @Autowired
    private BookingScheduler bookingScheduler;

    @Autowired
    private QrTokenUtil qrTokenUtil;

    @Test
    void pendingPaymentDeadlineShouldKeepExistingMinNowPlus15MinutesOrStartMinus5MinutesRule() {
        BookingResponse response = createPendingBooking("pending-deadline", LocalDateTime.now().plusHours(1));

        assertThat(response.getExpiredAt()).isEqualTo(response.getReservedAt().plusMinutes(15));
    }

    @Test
    void depositConfirmationShouldUseBookingStartPlus30MinutesForPersistedAndJwtExpiry() {
        LocalDateTime startTime = LocalDateTime.now().plusHours(2).withNano(987_654_321);
        BookingResponse pending = createPendingBooking("confirm-expiry", startTime);

        BookingResponse confirmed = confirmDepositForBooking(pending);

        LocalDateTime expectedExpiry = startTime.plusMinutes(30).withNano(0);
        assertThat(confirmed.getExpiredAt()).isEqualTo(expectedExpiry);
        assertThat(jwtExpiration(confirmed.getQrToken())).isEqualTo(expectedExpiry);
    }

    @Test
    void expiredPendingPaymentBookingCannotBeConfirmedAndSlotRemainsAvailable() {
        User driver = createUser("expired-pending-driver", Role.RoleName.DRIVER);
        Booking booking = pendingBookingEntityFor(driver, "EP-01", "59A-10000",
                LocalDateTime.now().plusHours(2), LocalDateTime.now().minusMinutes(1));

        assertThatThrownBy(() -> bookingService.confirmBookingAfterPayment(booking.getId()))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Booking after = bookingRepository.findById(booking.getId()).orElseThrow();
        ParkingSlot slot = parkingSlotRepository.findById(booking.getSlot().getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(Booking.BookingStatus.PENDING_PAYMENT);
        assertThat(slot.getStatus()).isEqualTo(ParkingSlot.Status.AVAILABLE);
    }

    @Test
    void regenerateQrShouldIssueDifferentTokenWithoutChangingOrExtendingExpiry() {
        User driver = createUser("regen-driver", Role.RoleName.DRIVER);
        BookingResponse confirmed = confirmedBookingFor(driver, "RG-01", "59A-10001",
                LocalDateTime.now().plusHours(2));
        String originalToken = confirmed.getQrToken();
        LocalDateTime originalExpiredAt = confirmed.getExpiredAt();

        BookingResponse regenerated = bookingService.regenerateQr(confirmed.getBookingId(), driver.getUserId().longValue());

        assertThat(regenerated.getQrToken()).isNotEqualTo(originalToken);
        assertThat(regenerated.getExpiredAt()).isEqualTo(originalExpiredAt);
        assertThat(jwtExpiration(regenerated.getQrToken())).isEqualTo(originalExpiredAt);
    }

    @Test
    void createBookingShouldRejectInactiveSlot() {
        User driver = createUser("inactive-slot-driver", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Inactive Slot Building");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Inactive Slot Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Inactive Slot Zone");
        ParkingSlot slot = createSlot(zone, "INACTIVE-01", ParkingSlot.Status.AVAILABLE);
        slot.setIsActive(false);
        parkingSlotRepository.save(slot);
        Vehicle vehicle = createVehicle(driver, vehicleType, "59A-19999");

        CreateBookingRequest request = new CreateBookingRequest();
        request.setVehicleId(vehicle.getId());
        request.setSlotId(slot.getId());
        request.setBookingStartTime(LocalDateTime.now().plusHours(2));
        request.setBookingEndTime(LocalDateTime.now().plusHours(4));

        assertThatThrownBy(() -> bookingService.createBooking(driver.getUserId().longValue(), request))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appException = (AppException) ex;
                    assertThat(appException.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(appException.getMessage()).contains("vô hiệu hóa");
                });

        assertThat(bookingRepository.findByVehicle_IdAndStatusIn(
                vehicle.getId(),
                java.util.List.of(
                        Booking.BookingStatus.PENDING_PAYMENT,
                        Booking.BookingStatus.CONFIRMED,
                        Booking.BookingStatus.CHECKED_IN,
                        Booking.BookingStatus.WAITING_PAYMENT)))
                .isEmpty();
        ParkingSlot unchangedSlot = parkingSlotRepository.findById(slot.getId()).orElseThrow();
        assertThat(unchangedSlot.getIsActive()).isFalse();
        assertThat(unchangedSlot.getStatus()).isEqualTo(ParkingSlot.Status.AVAILABLE);
    }

    @Test
    void standaloneVerifyShouldRejectReplacedQrAndAcceptCurrentQr() {
        User driver = createUser("verify-regenerated-driver", Role.RoleName.DRIVER);
        BookingResponse confirmed = confirmedBookingFor(driver, "VR-01", "59A-18888",
                LocalDateTime.now().plusHours(2));
        String oldToken = confirmed.getQrToken();

        assertThat(bookingService.verifyQrToken(oldToken).getBookingId())
                .isEqualTo(confirmed.getBookingId());

        BookingResponse regenerated = bookingService.regenerateQr(
                confirmed.getBookingId(), driver.getUserId().longValue());

        assertThatThrownBy(() -> bookingService.verifyQrToken(oldToken))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> {
                    AppException appException = (AppException) ex;
                    assertThat(appException.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(appException.getMessage()).contains("thay the");
                });

        BookingResponse verifiedCurrent = bookingService.verifyQrToken(regenerated.getQrToken());
        assertThat(verifiedCurrent.getBookingId()).isEqualTo(confirmed.getBookingId());
        assertThat(verifiedCurrent.getQrToken()).isEqualTo(regenerated.getQrToken());
    }

    @Test
    void regenerateQrShouldRejectExpiredConfirmedBookingWithoutExtendingExpiry() {
        User driver = createUser("expired-regen-driver", Role.RoleName.DRIVER);
        Booking booking = confirmedBookingEntityFor(driver, "ER-01", "59A-10002",
                LocalDateTime.now().minusHours(2), LocalDateTime.now().minusMinutes(1));
        LocalDateTime originalExpiredAt = booking.getExpiredAt();
        String originalToken = booking.getQrToken();

        assertThatThrownBy(() -> bookingService.regenerateQr(booking.getId(), driver.getUserId().longValue()))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        Booking after = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(after.getExpiredAt()).isEqualTo(originalExpiredAt);
        assertThat(after.getQrToken()).isEqualTo(originalToken);
    }

    @Test
    void schedulerShouldExpireConfirmedBookingUsingExpiredAtAndReleaseReservedSlot() {
        User driver = createUser("scheduler-driver", Role.RoleName.DRIVER);
        Booking booking = confirmedBookingEntityFor(driver, "SC-01", "59A-10003",
                LocalDateTime.now().minusHours(1), LocalDateTime.now().minusSeconds(1));

        bookingScheduler.expireConfirmedNoShow();

        Booking expired = bookingRepository.findById(booking.getId()).orElseThrow();
        ParkingSlot releasedSlot = parkingSlotRepository.findById(booking.getSlot().getId()).orElseThrow();
        assertThat(expired.getStatus()).isEqualTo(Booking.BookingStatus.EXPIRED);
        assertThat(releasedSlot.getStatus()).isEqualTo(ParkingSlot.Status.AVAILABLE);
    }

    @Test
    void bookingQrEntryShouldStillWorkAndRemainOneTimeUse() {
        User staff = createUser("entry-staff", Role.RoleName.STAFF);
        User driver = createUser("entry-driver", Role.RoleName.DRIVER);
        BookingResponse confirmed = confirmedBookingFor(driver, "EN-01", "59A-10004",
                LocalDateTime.now().plusHours(2));
        Booking booking = bookingRepository.findById(confirmed.getBookingId()).orElseThrow();
        Gate entryGate = createGate(booking.getSlot().getZone().getFloor().getBuilding(), "ENTRY-QR", Gate.GateType.ENTRY);

        SessionEntryRequest request = new SessionEntryRequest();
        request.setGateId(entryGate.getId());
        request.setEntryMode(ParkingSession.EntryMode.BOOKING.name());
        request.setLicensePlate("59A-10004");
        request.setQrToken(confirmed.getQrToken());
        request.setStaffUserId(staff.getUserId().longValue());

        parkingSessionService.processEntry(request);

        Booking checkedIn = bookingRepository.findById(confirmed.getBookingId()).orElseThrow();
        assertThat(checkedIn.getStatus()).isEqualTo(Booking.BookingStatus.CHECKED_IN);
        assertThat(checkedIn.getQrUsedAt()).isNotNull();

        assertThatThrownBy(() -> parkingSessionService.processEntry(request))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    private BookingResponse confirmedBookingFor(User driver, String slotCode, String licensePlate, LocalDateTime startTime) {
        BookingResponse pending = createPendingBooking(driver, slotCode, licensePlate, startTime);
        return confirmDepositForBooking(pending);
    }

    private BookingResponse createPendingBooking(String suffix, LocalDateTime startTime) {
        User driver = createUser("driver-" + suffix, Role.RoleName.DRIVER);
        return createPendingBooking(driver, "BK-" + suffix, "59A-" + Math.abs(suffix.hashCode() % 90000 + 10000), startTime);
    }

    private BookingResponse createPendingBooking(User driver, String slotCode, String licensePlate, LocalDateTime startTime) {
        ParkingBuilding building = createBuilding("Booking QR " + slotCode);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Booking QR Car " + slotCode, VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Booking QR Zone " + slotCode);
        ParkingSlot slot = createSlot(zone, slotCode, ParkingSlot.Status.AVAILABLE);
        Vehicle vehicle = createVehicle(driver, vehicleType, licensePlate);

        CreateBookingRequest request = new CreateBookingRequest();
        request.setVehicleId(vehicle.getId());
        request.setSlotId(slot.getId());
        request.setBookingStartTime(startTime);
        request.setBookingEndTime(startTime.plusHours(2));

        return bookingService.createBooking(driver.getUserId().longValue(), request);
    }

    private Booking pendingBookingEntityFor(User driver, String slotCode, String licensePlate,
                                            LocalDateTime bookingStartTime, LocalDateTime expiredAt) {
        ParkingBuilding building = createBuilding("Manual Pending " + slotCode);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Manual Pending Car " + slotCode, VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Manual Pending Zone " + slotCode);
        ParkingSlot slot = createSlot(zone, slotCode, ParkingSlot.Status.AVAILABLE);
        Vehicle vehicle = createVehicle(driver, vehicleType, licensePlate);
        LocalDateTime reservedAt = LocalDateTime.now().minusMinutes(20).withNano(0);

        Booking booking = Booking.builder()
                .userId(driver.getUserId().longValue())
                .vehicle(vehicle)
                .slot(slot)
                .bookingStartTime(bookingStartTime)
                .bookingEndTime(bookingStartTime.plusHours(2))
                .reservedAt(reservedAt)
                .expiredAt(expiredAt.withNano(0))
                .depositAmount(new BigDecimal("10000"))
                .status(Booking.BookingStatus.PENDING_PAYMENT)
                .build();
        return bookingRepository.save(booking);
    }

    private BookingResponse confirmDepositForBooking(BookingResponse pending) {
        PaymentResponse deposit = paymentService.createDeposit(
                pending.getBookingId().intValue(),
                pending.getDepositAmount() != null ? pending.getDepositAmount() : BigDecimal.ZERO,
                Payment.PaymentMethod.CASH);
        paymentService.confirmDeposit(deposit.getPaymentId());
        return bookingService.getBooking(pending.getBookingId());
    }

    private Booking confirmedBookingEntityFor(User driver, String slotCode, String licensePlate,
                                              LocalDateTime bookingStartTime, LocalDateTime expiredAt) {
        ParkingBuilding building = createBuilding("Manual Confirmed " + slotCode);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Manual Confirmed Car " + slotCode, VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Manual Confirmed Zone " + slotCode);
        ParkingSlot slot = createSlot(zone, slotCode, ParkingSlot.Status.RESERVED);
        Vehicle vehicle = createVehicle(driver, vehicleType, licensePlate);
        LocalDateTime issuedAt = LocalDateTime.now().withNano(0);

        Booking booking = Booking.builder()
                .userId(driver.getUserId().longValue())
                .vehicle(vehicle)
                .slot(slot)
                .bookingStartTime(bookingStartTime)
                .bookingEndTime(bookingStartTime.plusHours(2))
                .reservedAt(issuedAt)
                .expiredAt(expiredAt.withNano(0))
                .qrIssuedAt(issuedAt)
                .depositAmount(new BigDecimal("10000"))
                .depositPaidAt(issuedAt)
                .status(Booking.BookingStatus.CONFIRMED)
                .build();
        booking = bookingRepository.save(booking);
        booking.setQrToken(qrTokenUtil.generateBookingQrToken(
                booking.getId(),
                vehicle.getLicensePlate(),
                slot.getId(),
                booking.getExpiredAt()));
        return bookingRepository.save(booking);
    }

    private LocalDateTime jwtExpiration(String token) {
        Claims claims = qrTokenUtil.parseQrToken(token);
        return LocalDateTime.ofInstant(claims.getExpiration().toInstant(), ZoneId.systemDefault());
    }
}

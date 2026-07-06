package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.response.BookingResponse;
import com.swp391.parking.entity.*;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.*;
import com.swp391.parking.service.BookingService;
import com.swp391.parking.service.NotificationService;
import com.swp391.parking.service.SystemConfigService;
import com.swp391.parking.util.LicensePlateUtil;
import com.swp391.parking.util.QrTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final ParkingSessionRepository sessionRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final PaymentRepository paymentRepository;
    private final QrTokenUtil qrTokenUtil;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final SystemConfigService systemConfigService;

    @Override
    @Transactional
    public BookingResponse createBooking(Long currentUserId, CreateBookingRequest request) {
        LocalDateTime now = LocalDateTime.now();
        expireStaleOpenBookings(now);

        // Load vehicle (BE2) â€” kiá»ƒm tra chá»§ sá»Ÿ há»¯u
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "KhÃ´ng tÃ¬m tháº¥y xe"));
        if (!vehicle.getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Xe nÃ y khÃ´ng thuá»™c vá» báº¡n");
        }

        // Load slot (BE2)
        ParkingSlot slot = parkingSlotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "KhÃ´ng tÃ¬m tháº¥y slot"));

        // [BR-02] Loáº¡i xe pháº£i match zone â€” so sÃ¡nh slotSize
        ParkingSlot.SlotSize vehicleSlotSize = vehicle.getVehicleType().getSlotSize() != null
                ? ParkingSlot.SlotSize.valueOf(vehicle.getVehicleType().getSlotSize().name())
                : null;
        if (vehicleSlotSize == null || vehicleSlotSize != slot.getSlotSize()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "KÃ­ch cá»¡ xe (" + vehicle.getVehicleType().getSlotSize()
                            + ") khÃ´ng phÃ¹ há»£p vá»›i slot " + slot.getSlotCode()
                            + " (" + slot.getSlotSize() + ")");
        }

        // Slot pháº£i Ä‘ang Ä‘Æ°á»£c kÃ­ch hoáº¡t trÆ°á»›c khi kiá»ƒm tra tráº¡ng thÃ¡i khai thÃ¡c.
        if (!Boolean.TRUE.equals(slot.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Slot " + slot.getSlotCode() + " Ä‘ang bá»‹ vÃ´ hiá»‡u hÃ³a, khÃ´ng thá»ƒ Ä‘áº·t");
        }

        // [BR-11] Slot khÃ´ng Ä‘Æ°á»£c MAINTENANCE
        if (slot.getStatus() == ParkingSlot.Status.MAINTENANCE) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Slot Ä‘ang báº£o trÃ¬, khÃ´ng thá»ƒ Ä‘áº·t");
        }
        if (slot.getStatus() != ParkingSlot.Status.AVAILABLE) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Slot " + slot.getSlotCode() + " khÃ´ng kháº£ dá»¥ng (tráº¡ng thÃ¡i: " + slot.getStatus() + ")");
        }

        // [BR-06] 1 xe chá»‰ cÃ³ 1 booking active
        bookingRepository.findByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(
                        Booking.BookingStatus.PENDING_PAYMENT,
                        Booking.BookingStatus.CONFIRMED,
                        Booking.BookingStatus.CHECKED_IN,
                        Booking.BookingStatus.WAITING_PAYMENT
                )
        ).ifPresent(b -> {
            throw new AppException(HttpStatus.CONFLICT,
                    "Xe nÃ y Ä‘ang cÃ³ booking active (#" + b.getId() + ")");
        });

        // [BR-06b] Xe Ä‘ang cÃ³ session chÆ°a hoÃ n táº¥t (walk-in hoáº·c booking) â†’ khÃ´ng cho Ä‘áº·t thÃªm
        boolean hasOpenSession = sessionRepository.existsByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(ParkingSession.SessionStatus.ACTIVE, ParkingSession.SessionStatus.WAITING_PAYMENT)
        );
        if (hasOpenSession) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Xe Ä‘ang cÃ³ phiÃªn Ä‘á»— xe chÆ°a hoÃ n táº¥t, khÃ´ng thá»ƒ Ä‘áº·t booking má»›i");
        }

        // Kiá»ƒm tra slot Ä‘Ã£ cÃ³ booking active chÆ°a
        bookingRepository.findBySlot_IdAndStatusIn(
                slot.getId(),
                List.of(
                        Booking.BookingStatus.PENDING_PAYMENT,
                        Booking.BookingStatus.CONFIRMED,
                        Booking.BookingStatus.CHECKED_IN
                )
        ).ifPresent(b -> {
            throw new AppException(HttpStatus.CONFLICT,
                    "Slot " + slot.getSlotCode() + " Ä‘Ã£ cÃ³ booking active (#" + b.getId() + ")");
        });

        LocalDateTime startTime = request.getBookingStartTime();
        if (startTime == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Thieu bookingStartTime");
        }

        long minAdvanceMinutes = systemConfigService.getLongValue("BOOKING_MIN_ADVANCE_MINUTES", 10);
        long qrExpireBufferMinutes = systemConfigService.getLongValue("QR_EXPIRE_BUFFER_MINUTES", 15);

        long minutesUntilStart = ChronoUnit.MINUTES.between(now, startTime);
        if (minutesUntilStart < minAdvanceMinutes) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Pháº£i Ä‘áº·t trÆ°á»›c Ã­t nháº¥t " + minAdvanceMinutes + " phÃºt.");
        }

        LocalDateTime endTime = request.getBookingEndTime() != null
                ? request.getBookingEndTime() : startTime.plusHours(2);

        if (!endTime.isAfter(startTime)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "bookingEndTime phai sau bookingStartTime");
        }

        // expired_at = MIN(now+QR_EXPIRE_BUFFER_MINUTES, start-5p)
        LocalDateTime expiredAt = now.plusMinutes(qrExpireBufferMinutes).isBefore(startTime.minusMinutes(5))
                ? now.plusMinutes(qrExpireBufferMinutes) : startTime.minusMinutes(5);
        if (expiredAt.isBefore(now)) {
            expiredAt = now.plusMinutes(qrExpireBufferMinutes);
        }

        // TÃ­nh deposit (tiá»n Ä‘áº·t chá»— â€” máº¥t náº¿u khÃ´ng Ä‘áº¿n)
        BigDecimal deposit = calculateDeposit(vehicle.getVehicleType().getName(), minutesUntilStart);

        Booking booking = Booking.builder()
                .userId(currentUserId)
                .vehicle(vehicle)
                .slot(slot)
                .bookingStartTime(startTime)
                .bookingEndTime(endTime)
                .reservedAt(now)
                .expiredAt(expiredAt)
                .depositAmount(deposit)
                .status(Booking.BookingStatus.PENDING_PAYMENT)
                .build();

        booking = bookingRepository.save(booking);
        log.info("Booking #{} táº¡o bá»Ÿi user #{}, deposit={}", booking.getId(), currentUserId, deposit);

        notificationService.notify(currentUserId,
                "Dat cho thanh cong",
                "Booking #" + booking.getId() + " cho slot " + slot.getSlotCode() + " da duoc tao. Vui long thanh toan coc de nhan QR.",
                "info", "BOOKING", booking.getId().intValue());

        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse confirmBookingAfterPayment(Long bookingId) {
        Booking booking = getBookingEntity(bookingId);

        // Idempotent: if already CONFIRMED (e.g., duplicate IPN callback), return current state
        if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
            return toResponse(booking);
        }

        if (booking.getStatus() != Booking.BookingStatus.PENDING_PAYMENT) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Booking #" + bookingId + " khÃ´ng á»Ÿ tráº¡ng thÃ¡i chá» thanh toÃ¡n (hiá»‡n: " + booking.getStatus() + ")");
        }

        LocalDateTime now = LocalDateTime.now();

        // Booking QR is valid until bookingStartTime + 30 minutes.
        LocalDateTime qrExpiry = confirmedBookingQrExpiry(booking);
        if (!qrExpiry.isAfter(now)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking Ä‘Ã£ quÃ¡ háº¡n vÃ o bÃ£i");
        }

        String qr = qrTokenUtil.generateBookingQrToken(
                booking.getId(),
                booking.getVehicle().getLicensePlate(),
                booking.getSlot().getId(),
                qrExpiry);

        booking.setQrToken(qr);
        booking.setQrIssuedAt(now);
        booking.setDepositPaidAt(now);
        booking.setStatus(Booking.BookingStatus.CONFIRMED);
        booking.setExpiredAt(qrExpiry);

        // Mark slot RESERVED
        ParkingSlot slot = booking.getSlot();
        slot.setStatus(ParkingSlot.Status.RESERVED);
        parkingSlotRepository.save(slot);

        booking = bookingRepository.save(booking);
        log.info("Booking #{} CONFIRMED, QR issued, slot {} RESERVED",
                bookingId, slot.getSlotCode());

        notificationService.notify(booking.getUserId(),
                "QR da duoc tao",
                "Booking #" + bookingId + " da xac nhan. Dua QR cho staff tai cong vao.",
                "success", "BOOKING", bookingId.intValue());

        Booking confirmedBooking = booking;
        userRepository.findById(confirmedBooking.getUserId().intValue())
                .ifPresent(user -> emailService.sendBookingQrEmail(user, confirmedBooking));

        return toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBooking(Long bookingId, Long currentUserId, boolean staffScoped) {
        Booking booking = getBookingEntity(bookingId);
        enforceStaffBuildingScope(booking, currentUserId, staffScoped);
        return toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse verifyQrToken(String qrToken, Long currentUserId, boolean staffScoped) {
        if (qrToken == null || qrToken.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Thiáº¿u QR token");
        }

        Long bookingId;
        try {
            bookingId = qrTokenUtil.parseQrToken(qrToken).get("booking_id", Long.class);
        } catch (Exception ex) {
            throw new AppException(HttpStatus.BAD_REQUEST, "QR khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n");
        }

        Booking booking = getBookingEntity(bookingId);
        enforceStaffBuildingScope(booking, currentUserId, staffScoped);
        if (booking.getQrUsedAt() != null) {
            throw new AppException(HttpStatus.CONFLICT, "QR Ä‘Ã£ Ä‘Æ°á»£c dÃ¹ng rá»“i");
        }
        if (booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking khÃ´ng cÃ²n hiá»‡u lá»±c");
        }
        // Token verify pháº£i Ä‘Ãºng token hiá»‡n táº¡i trong DB Ä‘á»ƒ QR cÅ© bá»‹ revoke sau regenerate.
        if (booking.getQrToken() == null || !booking.getQrToken().equals(qrToken)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "QR da bi thay the boi token moi. Dung QR moi nhat.");
        }

        return toResponse(booking);
    }

    @Override
    @Transactional
    public List<BookingResponse> getMyBookings(Long currentUserId) {
        expireStaleOpenBookings(LocalDateTime.now());
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(currentUserId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId, Long currentUserId) {
        Booking booking = getBookingEntity(bookingId);
        if (!booking.getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen huy booking nay");
        }
        if (!List.of(Booking.BookingStatus.PENDING_PAYMENT, Booking.BookingStatus.CONFIRMED)
                .contains(booking.getStatus())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chi huy duoc PENDING_PAYMENT hoac CONFIRMED");
        }

        boolean shouldRefundDeposit = false;
        if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
            long cancelWindowMinutes = systemConfigService.getLongValue("BOOKING_CANCEL_WINDOW_MINUTES", 10);
            shouldRefundDeposit = isWithinCancelRefundWindow(booking.getDepositPaidAt(), cancelWindowMinutes);

            ParkingSlot slot = booking.getSlot();
            slot.setStatus(ParkingSlot.Status.AVAILABLE);
            parkingSlotRepository.save(slot);
        }

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        Booking savedBooking = bookingRepository.save(booking);
        if (shouldRefundDeposit) {
            markDepositRefunded(savedBooking);
        }
        return toResponse(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse regenerateQr(Long bookingId, Long currentUserId) {
        Booking booking = getBookingEntity(bookingId);
        if (!booking.getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "KhÃ´ng cÃ³ quyá»n táº¡o láº¡i QR cho booking nÃ y");
        }
        if (booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chá»‰ táº¡o láº¡i QR cho booking CONFIRMED (hiá»‡n: " + booking.getStatus() + ")");
        }
        if (booking.getQrUsedAt() != null) {
            throw new AppException(HttpStatus.CONFLICT, "QR Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng, khÃ´ng thá»ƒ táº¡o láº¡i");
        }

        LocalDateTime qrExpiry = booking.getExpiredAt();
        if (qrExpiry == null || !qrExpiry.isAfter(LocalDateTime.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "QR da het han, khong the tao lai cho booking nay");
        }

        String newQr = qrTokenUtil.generateBookingQrToken(
                booking.getId(),
                booking.getVehicle().getLicensePlate(),
                booking.getSlot().getId(),
                qrExpiry);

        booking.setQrToken(newQr);
        booking.setQrIssuedAt(LocalDateTime.now());
        booking = bookingRepository.save(booking);

        log.info("Booking #{} QR regenerated, new expiry={}", bookingId, qrExpiry);
        return toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> searchByPlate(String licensePlate, Long currentUserId, boolean staffScoped) {
        if (licensePlate == null || licensePlate.isBlank()) return List.of();
        Map<Long, Booking> matches = new LinkedHashMap<>();
        List<Booking.BookingStatus> activeStatuses = List.of(
                Booking.BookingStatus.PENDING_PAYMENT,
                Booking.BookingStatus.CONFIRMED);
        LicensePlateUtil.lookupCandidates(licensePlate).stream()
                .map(vehicleRepository::findByLicensePlate)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .forEach(vehicle -> bookingRepository.findByVehicle_IdAndStatusIn(vehicle.getId(), activeStatuses)
                        .ifPresent(booking -> matches.putIfAbsent(booking.getId(), booking)));
        return matches.values().stream()
                .filter(booking -> canStaffAccessBooking(booking, currentUserId, staffScoped))
                .map(this::toResponse).toList();
    }

    // â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private Booking getBookingEntity(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "KhÃ´ng tÃ¬m tháº¥y booking #" + id));
    }

    private LocalDateTime confirmedBookingQrExpiry(Booking booking) {
        if (booking.getBookingStartTime() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking thieu bookingStartTime");
        }
        long expireAfterStart = systemConfigService.getLongValue("BOOKING_EXPIRE_AFTER_START", 30);
        return booking.getBookingStartTime().plusMinutes(expireAfterStart).withNano(0);
    }

    private void expireStaleOpenBookings(LocalDateTime now) {
        List<Booking> stalePending = bookingRepository.findByStatusAndExpiredAtBefore(
                Booking.BookingStatus.PENDING_PAYMENT, now);
        if (!stalePending.isEmpty()) {
            stalePending.forEach(b -> b.setStatus(Booking.BookingStatus.EXPIRED));
            bookingRepository.saveAll(stalePending);
        }

        long expireAfterStart = systemConfigService.getLongValue("BOOKING_EXPIRE_AFTER_START", 30);
        List<Booking> staleConfirmed = bookingRepository.findConfirmedNoShow(now.minusMinutes(expireAfterStart));
        if (!staleConfirmed.isEmpty()) {
            staleConfirmed.forEach(b -> {
                b.setStatus(Booking.BookingStatus.EXPIRED);
                ParkingSlot slot = b.getSlot();
                if (slot.getStatus() == ParkingSlot.Status.RESERVED) {
                    slot.setStatus(ParkingSlot.Status.AVAILABLE);
                    parkingSlotRepository.save(slot);
                }
            });
            bookingRepository.saveAll(staleConfirmed);
        }
    }

    private BigDecimal calculateDeposit(String vehicleTypeName, long minutesUntilStart) {
        // BR-03d: chá»‰ CAR vÃ  ELECTRIC_CAR má»›i tÃ­nh cá»c, MOTORBIKE khÃ´ng tÃ­nh
        if (!vehicleTypeName.equalsIgnoreCase("CAR")
                && !vehicleTypeName.equalsIgnoreCase("ELECTRIC_CAR")) {
            return BigDecimal.ZERO;
        }
        if (minutesUntilStart < 10)  return BigDecimal.ZERO;
        if (minutesUntilStart < 120) return new BigDecimal("10000");
        if (minutesUntilStart < 240) return new BigDecimal("15000");
        if (minutesUntilStart < 360) return new BigDecimal("20000");
        return new BigDecimal("30000");
    }

    private boolean isWithinCancelRefundWindow(LocalDateTime depositPaidAt, long cancelWindowMinutes) {
        if (depositPaidAt == null) {
            return false;
        }
        return !depositPaidAt.plusMinutes(cancelWindowMinutes).isBefore(LocalDateTime.now());
    }

    private void markDepositRefunded(Booking booking) {
        paymentRepository.findByBookingIdAndPaymentType(booking.getId().intValue(), Payment.PaymentType.DEPOSIT)
                .filter(payment -> payment.getPaymentStatus() == Payment.PaymentStatus.PAID)
                .ifPresent(payment -> {
                    payment.setPaymentStatus(Payment.PaymentStatus.REFUNDED);
                    if (payment.getTransactionRef() == null || payment.getTransactionRef().isBlank()) {
                        payment.setTransactionRef("BOOKING-CANCEL-REFUND-" + booking.getId() + "-" + System.currentTimeMillis());
                    }
                    paymentRepository.save(payment);
                });
    }

    private void enforceStaffBuildingScope(Booking booking, Long currentUserId, boolean staffScoped) {
        if (!canStaffAccessBooking(booking, currentUserId, staffScoped)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem booking ngoai toa nha duoc phan cong");
        }
    }

    private boolean canStaffAccessBooking(Booking booking, Long currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return true;
        }
        User currentUser = userRepository.findById(Math.toIntExact(currentUserId))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Khong tim thay staff hien tai"));
        if (currentUser.getAssignedBuilding() == null || currentUser.getAssignedBuilding().getId() == null) {
            // Staff without assigned building can see all bookings (e.g. floating/admin staff)
            return true;
        }
        return booking.getSlot() != null
                && booking.getSlot().getZone() != null
                && booking.getSlot().getZone().getFloor() != null
                && booking.getSlot().getZone().getFloor().getBuilding() != null
                && currentUser.getAssignedBuilding().getId().equals(
                        booking.getSlot().getZone().getFloor().getBuilding().getId());
    }

    private BookingResponse toResponse(Booking b) {
        ParkingSlot slot = b.getSlot();
        Zone zone = slot.getZone();
        Floor floor = zone.getFloor();
        ParkingBuilding building = floor.getBuilding();

        return BookingResponse.builder()
                .bookingId(b.getId())
                .userId(b.getUserId())
                .vehicleId(b.getVehicle().getId())
                .licensePlate(b.getVehicle().getLicensePlate())
                .slotId(slot.getId())
                .slotCode(slot.getSlotCode())
                .zoneId(zone.getId())
                .zoneName(zone.getName())
                .floorId(floor.getId())
                .floorName(floor.getName())
                .buildingId(building.getId())
                .buildingName(building.getName())
                .bookingStartTime(b.getBookingStartTime())
                .bookingEndTime(b.getBookingEndTime())
                .reservedAt(b.getReservedAt())
                .expiredAt(b.getExpiredAt())
                .qrToken(b.getStatus() == Booking.BookingStatus.CONFIRMED
                        && b.getQrUsedAt() == null
                        && (b.getExpiredAt() == null || b.getExpiredAt().isAfter(LocalDateTime.now()))
                        ? b.getQrToken()
                        : null)
                .qrIssuedAt(b.getQrIssuedAt())
                .qrUsed(b.getQrUsedAt() != null)
                .depositAmount(b.getDepositAmount())
                .depositPaidAt(b.getDepositPaidAt())
                .status(b.getStatus().name())
                .createdAt(b.getCreatedAt())
                .build();
    }
}


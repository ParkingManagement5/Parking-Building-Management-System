package com.swp391.parking.integration;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.response.SessionResponse;
import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.GateLog;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.GateLogRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.service.ParkingSessionService;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import com.swp391.parking.util.QrTokenUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class ParkingSessionBookingEntryIntegrationTest extends AbstractIntegrationTestSupport {

    private static final ZoneId TEST_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TEST_DATE = LocalDate.of(2026, 6, 19);

    @Autowired
    private ParkingSessionService sessionService;

    @Autowired
    private ParkingSessionRepository sessionRepository;

    @Autowired
    private GateLogRepository gateLogRepository;

    @Autowired
    private QrTokenUtil qrTokenUtil;

    @MockBean
    private Clock clock;

    @Test
    void bookingEntry_validReservedSlot_shouldCheckInAndCreateSessionAndGateLog() {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Valid", ParkingSlot.Status.RESERVED, true, true, true,
                ParkingSlot.SlotSize.MEDIUM, true);
        Booking booking = createConfirmedBooking(facility);

        SessionResponse response = sessionService.processEntry(
                bookingEntryRequest(facility.gate(), booking, facility.vehicle()), facility.staff().getUsername());

        assertEquals("ACTIVE", response.getStatus());
        assertEquals(facility.slot().getId(), response.getSlotId());
        assertEquals(Booking.BookingStatus.CHECKED_IN, bookingRepository.findById(booking.getId()).orElseThrow().getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
        assertEquals(1, sessionRepository.count());
        ParkingSession session = sessionRepository.findAll().get(0);
        assertEquals(facility.slot().getId(), session.getSlot().getId());
        assertEquals(1, gateLogRepository.count());
        assertEquals(GateLog.EventType.ENTRY, gateLogRepository.findAll().get(0).getEventType());
    }

    @Test
    void bookingEntry_slotFromDifferentBuilding_shouldRejectWithoutMutation() {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Different Building", ParkingSlot.Status.RESERVED, true, true, true,
                ParkingSlot.SlotSize.MEDIUM, true);
        ParkingBuilding otherBuilding = createBuilding("Other Booking Gate Building");
        Gate otherGate = createGate(otherBuilding, "OBG-1", Gate.GateType.ENTRY);
        Booking booking = createConfirmedBooking(facility);

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(bookingEntryRequest(otherGate, booking, facility.vehicle()),
                        facility.staff().getUsername()));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(Booking.BookingStatus.CONFIRMED, bookingRepository.findById(booking.getId()).orElseThrow().getStatus());
        assertEquals(ParkingSlot.Status.RESERVED, parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
        assertEquals(0, sessionRepository.count());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    void bookingEntry_inactiveZone_shouldRejectWithoutMutation() {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Inactive Zone", ParkingSlot.Status.RESERVED, true, false, true,
                ParkingSlot.SlotSize.MEDIUM, true);
        Booking booking = createConfirmedBooking(facility);

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(bookingEntryRequest(facility.gate(), booking, facility.vehicle()),
                        facility.staff().getUsername()));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(Booking.BookingStatus.CONFIRMED, bookingRepository.findById(booking.getId()).orElseThrow().getStatus());
        assertEquals(ParkingSlot.Status.RESERVED, parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
        assertEquals(0, sessionRepository.count());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    void bookingEntry_incompatibleSlotSize_shouldRejectWithoutMutation() {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Bad Size", ParkingSlot.Status.RESERVED, true, true, true,
                ParkingSlot.SlotSize.SMALL, true);
        Booking booking = createConfirmedBooking(facility);

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(bookingEntryRequest(facility.gate(), booking, facility.vehicle()),
                        facility.staff().getUsername()));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(Booking.BookingStatus.CONFIRMED, bookingRepository.findById(booking.getId()).orElseThrow().getStatus());
        assertEquals(ParkingSlot.Status.RESERVED, parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
        assertTrue(sessionRepository.findAll().isEmpty());
        assertEquals(0, gateLogRepository.count());
    }

    private TestFacility createFacility(String suffix, ParkingSlot.Status slotStatus, boolean slotActive,
                                        boolean zoneActive, boolean floorActive,
                                        ParkingSlot.SlotSize slotSize, boolean buildingActive) {
        ParkingBuilding building = createBuilding("Booking Entry Building " + suffix);
        building.setIsActive(buildingActive);
        buildingRepository.save(building);
        Floor floor = createFloor(building, 1);
        floor.setIsActive(floorActive);
        floorRepository.save(floor);
        VehicleType vehicleType = createVehicleType("Booking Entry Car " + suffix, VehicleType.SlotSize.MEDIUM);
        Zone zone = createZone(floor, vehicleType, "Booking Entry Zone " + suffix);
        zone.setIsActive(zoneActive);
        zoneRepository.save(zone);
        ParkingSlot slot = createSlot(zone, "BE-" + Math.abs(suffix.hashCode()), slotStatus);
        slot.setSlotSize(slotSize);
        slot.setIsActive(slotActive);
        parkingSlotRepository.save(slot);
        Gate gate = createGate(building, "GBE-" + Math.abs(suffix.hashCode()), Gate.GateType.ENTRY);
        User staff = createUser("booking-entry-staff-" + Math.abs(suffix.hashCode()), Role.RoleName.STAFF);
        User owner = createUser("booking-entry-owner-" + Math.abs(suffix.hashCode()), Role.RoleName.DRIVER);
        Vehicle vehicle = createVehicle(owner, vehicleType, "51B-" + Math.abs(suffix.hashCode()));
        return new TestFacility(gate, slot, vehicle, staff);
    }

    private Booking createConfirmedBooking(TestFacility facility) {
        return bookingRepository.save(Booking.builder()
                .userId(facility.vehicle().getUserId())
                .vehicle(facility.vehicle())
                .slot(facility.slot())
                .bookingStartTime(LocalDateTime.of(TEST_DATE, LocalTime.of(11, 0)))
                .bookingEndTime(LocalDateTime.of(TEST_DATE, LocalTime.of(13, 0)))
                .reservedAt(LocalDateTime.of(TEST_DATE, LocalTime.of(10, 30)))
                .expiredAt(LocalDateTime.of(TEST_DATE, LocalTime.of(12, 30)))
                .depositAmount(BigDecimal.ZERO)
                .status(Booking.BookingStatus.CONFIRMED)
                .build());
    }

    private SessionEntryRequest bookingEntryRequest(Gate gate, Booking booking, Vehicle vehicle) {
        SessionEntryRequest request = new SessionEntryRequest();
        request.setGateId(gate.getId());
        request.setEntryMode(ParkingSession.EntryMode.BOOKING.name());
        request.setQrToken(qrTokenUtil.generateQrToken(
                booking.getId(), vehicle.getLicensePlate(), booking.getSlot().getId(),
                LocalDateTime.now().plusHours(1)));
        return request;
    }

    private void setCurrentTime(LocalTime time) {
        Instant instant = LocalDateTime.of(TEST_DATE, time).atZone(TEST_ZONE).toInstant();
        when(clock.getZone()).thenReturn(TEST_ZONE);
        when(clock.instant()).thenReturn(instant);
    }

    private record TestFacility(Gate gate, ParkingSlot slot, Vehicle vehicle, User staff) {
    }
}

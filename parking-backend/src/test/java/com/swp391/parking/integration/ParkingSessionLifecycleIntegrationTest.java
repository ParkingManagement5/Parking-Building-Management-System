package com.swp391.parking.integration;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ParkingSessionLifecycleIntegrationTest extends AbstractIntegrationTestSupport {

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
    void bookingLifecycle_shouldEnterExitAndCompleteAfterPayment() {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Booking Lifecycle");
        Booking booking = createConfirmedBooking(facility);

        SessionResponse entryResponse = sessionService.processEntry(
                bookingEntryRequest(facility.entryGate(), booking, facility.vehicle()),
                facility.staff().getUsername());

        Booking afterEntryBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        ParkingSession afterEntrySession = sessionRepository.findById(entryResponse.getSessionId()).orElseThrow();
        ParkingSlot afterEntrySlot = parkingSlotRepository.findById(facility.slot().getId()).orElseThrow();
        List<GateLog> afterEntryLogs = gateLogRepository.findAll();
        assertEquals(Booking.BookingStatus.CHECKED_IN, afterEntryBooking.getStatus());
        assertNotNull(afterEntryBooking.getQrUsedAt());
        assertEquals(ParkingSession.SessionStatus.ACTIVE, afterEntrySession.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, afterEntrySlot.getStatus());
        assertEquals(facility.slot().getId(), afterEntrySession.getSlot().getId());
        assertEquals(facility.vehicle().getId(), afterEntrySession.getVehicle().getId());
        assertNotNull(afterEntrySession.getEntryTime());
        assertNull(afterEntrySession.getExitTime());
        assertEquals(1, afterEntryLogs.size());
        assertGateLog(afterEntryLogs.get(0), GateLog.EventType.ENTRY, GateLog.ResultStatus.SUCCESS,
                facility.entryGate(), afterEntrySession, facility.vehicle(), facility.staff());

        setCurrentTime(LocalTime.of(12, 30));
        SessionResponse exitResponse = sessionService.processExit(
                afterEntrySession.getId(), exitRequest(facility.exitGate()), facility.staff().getUsername());

        ParkingSession afterExitSession = sessionRepository.findById(exitResponse.getSessionId()).orElseThrow();
        Booking afterExitBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        ParkingSlot afterExitSlot = parkingSlotRepository.findById(facility.slot().getId()).orElseThrow();
        List<GateLog> afterExitLogs = gateLogRepository.findAll();
        assertEquals(ParkingSession.SessionStatus.WAITING_PAYMENT, afterExitSession.getStatus());
        assertNotNull(afterExitSession.getExitTime());
        LocalDateTime exitTime = afterExitSession.getExitTime();
        assertEquals(ParkingSlot.Status.OCCUPIED, afterExitSlot.getStatus());
        assertEquals(Booking.BookingStatus.CHECKED_IN, afterExitBooking.getStatus());
        assertEquals(2, afterExitLogs.size());
        assertEquals(1, countLogs(afterExitSession.getId(), GateLog.EventType.ENTRY));
        assertEquals(1, countLogs(afterExitSession.getId(), GateLog.EventType.EXIT));
        GateLog exitLog = afterExitLogs.stream()
                .filter(log -> log.getEventType() == GateLog.EventType.EXIT)
                .findFirst()
                .orElseThrow();
        assertGateLog(exitLog, GateLog.EventType.EXIT, GateLog.ResultStatus.MANUAL_CHECK,
                facility.exitGate(), afterExitSession, facility.vehicle(), facility.staff());

        SessionResponse completionResponse = sessionService.completeSessionAfterPayment(afterExitSession.getId());

        ParkingSession completedSession = sessionRepository.findById(completionResponse.getSessionId()).orElseThrow();
        Booking completedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        ParkingSlot completedSlot = parkingSlotRepository.findById(facility.slot().getId()).orElseThrow();
        assertEquals(ParkingSession.SessionStatus.COMPLETED, completedSession.getStatus());
        assertEquals(ParkingSlot.Status.AVAILABLE, completedSlot.getStatus());
        assertEquals(Booking.BookingStatus.COMPLETED, completedBooking.getStatus());
        assertEquals(exitTime, completedSession.getExitTime());
        assertEquals(2, gateLogRepository.count());
    }

    @Test
    void completeSessionAfterPayment_shouldRejectActiveSessionWithoutMutationOrGateLog() {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Active Reject");
        Booking booking = createConfirmedBooking(facility);
        ParkingSession session = sessionRepository.save(ParkingSession.builder()
                .booking(booking)
                .slot(facility.slot())
                .userId(facility.vehicle().getUserId())
                .vehicle(facility.vehicle())
                .entryGate(facility.entryGate())
                .entryTime(LocalDateTime.of(TEST_DATE, LocalTime.NOON))
                .entryMode(ParkingSession.EntryMode.BOOKING)
                .status(ParkingSession.SessionStatus.ACTIVE)
                .build());
        facility.slot().setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(facility.slot());

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.completeSessionAfterPayment(session.getId()));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.ACTIVE,
                sessionRepository.findById(session.getId()).orElseThrow().getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED,
                parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
        assertEquals(Booking.BookingStatus.CONFIRMED,
                bookingRepository.findById(booking.getId()).orElseThrow().getStatus());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    void completeSessionAfterPayment_shouldRejectCompletedSessionWithoutMutationOrGateLog() {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Completed Reject");
        Booking booking = createConfirmedBooking(facility);
        booking.setStatus(Booking.BookingStatus.COMPLETED);
        bookingRepository.save(booking);
        ParkingSlot slot = facility.slot();
        slot.setStatus(ParkingSlot.Status.AVAILABLE);
        parkingSlotRepository.save(slot);
        ParkingSession session = sessionRepository.save(ParkingSession.builder()
                .booking(booking)
                .slot(slot)
                .userId(facility.vehicle().getUserId())
                .vehicle(facility.vehicle())
                .entryGate(facility.entryGate())
                .exitGate(facility.exitGate())
                .entryTime(LocalDateTime.of(TEST_DATE, LocalTime.of(11, 0)))
                .exitTime(LocalDateTime.of(TEST_DATE, LocalTime.of(12, 0)))
                .entryMode(ParkingSession.EntryMode.BOOKING)
                .status(ParkingSession.SessionStatus.COMPLETED)
                .build());

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.completeSessionAfterPayment(session.getId()));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.COMPLETED,
                sessionRepository.findById(session.getId()).orElseThrow().getStatus());
        assertEquals(ParkingSlot.Status.AVAILABLE,
                parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus());
        assertEquals(Booking.BookingStatus.COMPLETED,
                bookingRepository.findById(booking.getId()).orElseThrow().getStatus());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    void walkInCompletion_shouldCompleteSessionAndReleaseSlotWithoutBooking() {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Walk In Completion");
        ParkingSlot slot = facility.slot();
        slot.setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(slot);
        ParkingSession session = sessionRepository.save(ParkingSession.builder()
                .slot(slot)
                .userId(facility.vehicle().getUserId())
                .vehicle(facility.vehicle())
                .entryGate(facility.entryGate())
                .exitGate(facility.exitGate())
                .entryTime(LocalDateTime.of(TEST_DATE, LocalTime.of(11, 0)))
                .exitTime(LocalDateTime.of(TEST_DATE, LocalTime.of(12, 0)))
                .entryMode(ParkingSession.EntryMode.WALK_IN_AUTO)
                .status(ParkingSession.SessionStatus.WAITING_PAYMENT)
                .build());

        SessionResponse response = sessionService.completeSessionAfterPayment(session.getId());

        ParkingSession completedSession = sessionRepository.findById(response.getSessionId()).orElseThrow();
        ParkingSlot completedSlot = parkingSlotRepository.findById(slot.getId()).orElseThrow();
        assertEquals(ParkingSession.SessionStatus.COMPLETED, completedSession.getStatus());
        assertEquals(ParkingSlot.Status.AVAILABLE, completedSlot.getStatus());
        assertNull(completedSession.getBooking());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    @WithMockUser(username = "lifecycle-http-entry-staff", roles = "STAFF")
    void staffEntryEndpoint_shouldCreateActiveSessionAndPersistSlotAndGateLog() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("lifecycle-http-entry-staff", Role.RoleName.STAFF);
        TestFacility facility = createFacility("HTTP Entry");
        Booking booking = createConfirmedBooking(facility);
        SessionEntryRequest request = bookingEntryRequest(facility.entryGate(), booking, facility.vehicle());

        mockMvc.perform(post("/api/sessions/entry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.slotId").value(facility.slot().getId()));

        ParkingSession session = sessionRepository.findAll().get(0);
        assertEquals(ParkingSession.SessionStatus.ACTIVE, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED,
                parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
        assertEquals(Booking.BookingStatus.CHECKED_IN,
                bookingRepository.findById(booking.getId()).orElseThrow().getStatus());
        assertEquals(1, gateLogRepository.count());
        GateLog entryLog = gateLogRepository.findAll().get(0);
        assertEquals(GateLog.EventType.ENTRY, entryLog.getEventType());
        assertEquals(facility.vehicle().getLicensePlate(), entryLog.getLicensePlate());
    }

    @Test
    @WithMockUser(username = "lifecycle-http-exit-staff", roles = "STAFF")
    void staffExitEndpoint_shouldMoveActiveSessionToWaitingPaymentAndKeepSlotOccupied() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("lifecycle-http-exit-staff", Role.RoleName.STAFF);
        TestFacility facility = createFacility("HTTP Exit");
        ParkingSlot slot = facility.slot();
        slot.setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(slot);
        ParkingSession session = sessionRepository.save(ParkingSession.builder()
                .slot(slot)
                .userId(facility.vehicle().getUserId())
                .vehicle(facility.vehicle())
                .entryGate(facility.entryGate())
                .entryTime(LocalDateTime.of(TEST_DATE, LocalTime.of(11, 0)))
                .entryMode(ParkingSession.EntryMode.WALK_IN_AUTO)
                .status(ParkingSession.SessionStatus.ACTIVE)
                .build());

        mockMvc.perform(post("/api/sessions/{id}/exit", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(exitRequest(facility.exitGate()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("WAITING_PAYMENT"));

        ParkingSession exitedSession = sessionRepository.findById(session.getId()).orElseThrow();
        assertEquals(ParkingSession.SessionStatus.WAITING_PAYMENT, exitedSession.getStatus());
        assertNotNull(exitedSession.getExitTime());
        assertEquals(ParkingSlot.Status.OCCUPIED,
                parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus());
        assertEquals(1, gateLogRepository.count());
        GateLog exitLog = gateLogRepository.findAll().get(0);
        assertEquals(GateLog.EventType.EXIT, exitLog.getEventType());
        assertEquals(facility.vehicle().getLicensePlate(), exitLog.getLicensePlate());
    }

    private TestFacility createFacility(String suffix) {
        String key = String.valueOf(Math.abs(suffix.hashCode()));
        ParkingBuilding building = createBuilding("Lifecycle Building " + suffix);
        building.setIs24Hours(true);
        buildingRepository.save(building);
        Floor floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Lifecycle Car " + suffix, VehicleType.SlotSize.MEDIUM);
        Zone zone = createZone(floor, vehicleType, "Lifecycle Zone " + suffix);
        ParkingSlot slot = createSlot(zone, "LC-" + key, ParkingSlot.Status.RESERVED);
        slot.setSlotSize(ParkingSlot.SlotSize.MEDIUM);
        parkingSlotRepository.save(slot);
        Gate entryGate = createGate(building, "LCE-" + key, Gate.GateType.ENTRY);
        Gate exitGate = createGate(building, "LCX-" + key, Gate.GateType.EXIT);
        User staff = createUser("lifecycle-staff-" + key, Role.RoleName.STAFF);
        User owner = createUser("lifecycle-owner-" + key, Role.RoleName.DRIVER);
        Vehicle vehicle = createVehicle(owner, vehicleType, "51L-" + key);
        return new TestFacility(entryGate, exitGate, slot, vehicle, staff);
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

    private SessionExitRequest exitRequest(Gate gate) {
        SessionExitRequest request = new SessionExitRequest();
        request.setGateId(gate.getId());
        request.setPaymentMethod("CASH");
        return request;
    }

    private void assertGateLog(GateLog log, GateLog.EventType eventType, GateLog.ResultStatus resultStatus,
                               Gate gate, ParkingSession session, Vehicle vehicle, User staff) {
        assertEquals(eventType, log.getEventType());
        assertEquals(resultStatus, log.getResultStatus());
        assertEquals(gate.getId(), log.getGate().getId());
        assertEquals(session.getId(), log.getSession().getId());
        assertEquals(vehicle.getLicensePlate(), log.getLicensePlate());
        assertEquals(staff.getUserId().longValue(), log.getStaffUserId());
    }

    private long countLogs(Long sessionId, GateLog.EventType eventType) {
        return gateLogRepository.findAll().stream()
                .filter(log -> log.getSession() != null)
                .filter(log -> log.getSession().getId().equals(sessionId))
                .filter(log -> log.getEventType() == eventType)
                .count();
    }

    private void setCurrentTime(LocalTime time) {
        Instant instant = LocalDateTime.of(TEST_DATE, time).atZone(TEST_ZONE).toInstant();
        when(clock.getZone()).thenReturn(TEST_ZONE);
        when(clock.instant()).thenReturn(instant);
    }

    private record TestFacility(Gate entryGate, Gate exitGate, ParkingSlot slot, Vehicle vehicle, User staff) {
    }
}

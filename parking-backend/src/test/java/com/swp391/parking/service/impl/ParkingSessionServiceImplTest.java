package com.swp391.parking.service.impl;

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
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.GateLogRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.util.QrTokenUtil;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ParkingSessionServiceImplTest {

    private static final Long BUILDING_ID = 1L;
    private static final Long GATE_ID = 2L;
    private static final Long VEHICLE_ID = 3L;
    private static final Long SLOT_ID = 4L;
    private static final Long BOOKING_ID = 5L;
    private static final Long USER_ID = 6L;
    private static final Long OTHER_USER_ID = 66L;
    private static final Long ACTOR_USER_ID = 77L;
    private static final Long SESSION_ID = 7L;
    private static final Long OTHER_BUILDING_ID = 99L;
    private static final String LICENSE_PLATE = "51A-12345";
    private static final String QR_TOKEN = "qr-token";
    private static final String AUTH_USERNAME = "staff";

    @Mock
    private ParkingSessionRepository sessionRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private GateLogRepository gateLogRepository;

    @Mock
    private ParkingSlotRepository parkingSlotRepository;

    @Mock
    private GateRepository gateRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private QrTokenUtil qrTokenUtil;

    @InjectMocks
    private ParkingSessionServiceImpl sessionService;

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = "INVALID")
    void processEntry_shouldRejectNullOrInvalidEntryModeWithBadRequest(String entryMode) {
        SessionEntryRequest request = entryRequest(entryMode);
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processEntry_shouldRejectInactiveGate() {
        SessionEntryRequest request = walkInAutoRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, false)));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processEntry_shouldRejectExitGateForEntry() {
        SessionEntryRequest request = walkInAutoRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.EXIT, true)));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processBookingEntry_shouldRejectVehicleWithOpenSession() {
        SessionEntryRequest request = bookingRequest();
        Booking booking = confirmedBooking();
        Claims claims = claimsForBooking();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(qrTokenUtil.parseQrToken(QR_TOKEN)).willReturn(claims);
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(booking));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        lenient().when(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .thenReturn(true);

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void walkInAuto_shouldAssignBestSlotByGateBuildingId() {
        SessionEntryRequest request = walkInAutoRequest();
        ParkingSlot slot = slot(ParkingSlot.Status.AVAILABLE);
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findFirstAvailableByBuildingAndSlotSizeForUpdate(
                eq(BUILDING_ID), eq(ParkingSlot.SlotSize.MEDIUM), any()))
                .willReturn(List.of(slot));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processEntry(request, AUTH_USERNAME);

        verify(parkingSlotRepository).findFirstAvailableByBuildingAndSlotSizeForUpdate(
                eq(BUILDING_ID), eq(ParkingSlot.SlotSize.MEDIUM), any());
    }

    @Test
    void processManualEntry_shouldLoadSlotWithWriteLock() {
        SessionEntryRequest request = walkInManualRequest();
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.MEDIUM,
                true, true, true, true, BUILDING_ID);
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(slot));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processEntry(request, AUTH_USERNAME);

        verify(parkingSlotRepository).findByIdForUpdate(SLOT_ID);
    }

    @Test
    void processAutoEntry_shouldUseLockedAvailableSlotQuery() {
        SessionEntryRequest request = walkInAutoRequest();
        ParkingSlot slot = slot(ParkingSlot.Status.AVAILABLE);
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findFirstAvailableByBuildingAndSlotSizeForUpdate(
                eq(BUILDING_ID), eq(ParkingSlot.SlotSize.MEDIUM), any()))
                .willReturn(List.of(slot));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processEntry(request, AUTH_USERNAME);

        verify(parkingSlotRepository).findFirstAvailableByBuildingAndSlotSizeForUpdate(
                eq(BUILDING_ID), eq(ParkingSlot.SlotSize.MEDIUM), any());
    }

    @Test
    void processBookingEntry_shouldLockReservedSlotBeforeOccupying() {
        SessionEntryRequest request = bookingRequest();
        Booking booking = confirmedBooking();
        ParkingSlot lockedSlot = slot(ParkingSlot.Status.RESERVED);
        Claims claims = claimsForBooking();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(qrTokenUtil.parseQrToken(QR_TOKEN)).willReturn(claims);
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(booking));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(lockedSlot));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processEntry(request, AUTH_USERNAME);

        verify(parkingSlotRepository).findByIdForUpdate(SLOT_ID);
        assertEquals(ParkingSlot.Status.OCCUPIED, lockedSlot.getStatus());
    }

    @Test
    void processManualEntry_shouldRejectWhenLockedSlotIsNoLongerAvailable() {
        SessionEntryRequest request = walkInManualRequest();
        ParkingSlot slot = manualSlot(ParkingSlot.Status.OCCUPIED, ParkingSlot.SlotSize.MEDIUM,
                true, true, true, true, BUILDING_ID);
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(slot));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processBookingEntry_shouldRejectWhenLockedSlotIsNotReservedOrExpectedStatus() {
        SessionEntryRequest request = bookingRequest();
        Booking booking = confirmedBooking();
        ParkingSlot lockedSlot = slot(ParkingSlot.Status.OCCUPIED);
        Claims claims = claimsForBooking();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(qrTokenUtil.parseQrToken(QR_TOKEN)).willReturn(claims);
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(booking));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(lockedSlot));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(bookingRepository, never()).save(any());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processAutoEntry_shouldReturnNoSlotWhenLockedQueryFindsNone() {
        SessionEntryRequest request = walkInAutoRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findFirstAvailableByBuildingAndSlotSizeForUpdate(
                eq(BUILDING_ID), eq(ParkingSlot.SlotSize.MEDIUM), any()))
                .willReturn(List.of());

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(parkingSlotRepository, never()).save(any());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void bookingEntryGateLog_shouldUseSessionVehiclePlateWhenRequestPlateIsNull() {
        SessionEntryRequest request = bookingRequest();
        request.setLicensePlate(null);
        Claims claims = claimsForBooking();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(qrTokenUtil.parseQrToken(QR_TOKEN)).willReturn(claims);
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(confirmedBooking()));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        lenient().when(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .thenReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(slot(ParkingSlot.Status.RESERVED)));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processEntry(request, AUTH_USERNAME);

        ArgumentCaptor<GateLog> gateLogCaptor = ArgumentCaptor.forClass(GateLog.class);
        verify(gateLogRepository).save(gateLogCaptor.capture());
        assertEquals(LICENSE_PLATE, gateLogCaptor.getValue().getLicensePlate());
    }

    @Test
    void processBookingEntry_shouldUseAuthenticatedActorForGateLog() {
        SessionEntryRequest request = bookingRequest();
        Claims claims = claimsForBooking();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(qrTokenUtil.parseQrToken(QR_TOKEN)).willReturn(claims);
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(confirmedBooking()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(slot(ParkingSlot.Status.RESERVED)));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processEntry(request, AUTH_USERNAME);

        ArgumentCaptor<GateLog> gateLogCaptor = ArgumentCaptor.forClass(GateLog.class);
        verify(gateLogRepository).save(gateLogCaptor.capture());
        assertEquals(ACTOR_USER_ID, gateLogCaptor.getValue().getStaffUserId());
    }

    @Test
    void processWalkInAuto_shouldUseAuthenticatedActorForGateLog() {
        SessionEntryRequest request = walkInAutoRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        stubSuccessfulWalkInAuto();

        sessionService.processEntry(request, AUTH_USERNAME);

        ArgumentCaptor<GateLog> gateLogCaptor = ArgumentCaptor.forClass(GateLog.class);
        verify(gateLogRepository).save(gateLogCaptor.capture());
        assertEquals(ACTOR_USER_ID, gateLogCaptor.getValue().getStaffUserId());
    }

    @Test
    void processWalkInManual_shouldUseAuthenticatedActorForGateLog() {
        SessionEntryRequest request = walkInManualRequest();
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.MEDIUM,
                true, true, true, true, BUILDING_ID);
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(slot));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processEntry(request, AUTH_USERNAME);

        ArgumentCaptor<GateLog> gateLogCaptor = ArgumentCaptor.forClass(GateLog.class);
        verify(gateLogRepository).save(gateLogCaptor.capture());
        assertEquals(ACTOR_USER_ID, gateLogCaptor.getValue().getStaffUserId());
    }

    @Test
    void walkInManual_shouldRejectWrongSlotSize() {
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.LARGE,
                true, true, true, true, BUILDING_ID);

        AppException exception = assertWalkInManualRejected(slot);

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void walkInManual_shouldRejectSlotFromDifferentBuilding() {
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.MEDIUM,
                true, true, true, true, OTHER_BUILDING_ID);

        AppException exception = assertWalkInManualRejected(slot);

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void walkInManual_shouldRejectInactiveSlot() {
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.MEDIUM,
                false, true, true, true, BUILDING_ID);

        AppException exception = assertWalkInManualRejected(slot);

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void walkInManual_shouldRejectInactiveZone() {
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.MEDIUM,
                true, false, true, true, BUILDING_ID);

        AppException exception = assertWalkInManualRejected(slot);

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void walkInManual_shouldRejectInactiveFloor() {
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.MEDIUM,
                true, true, false, true, BUILDING_ID);

        AppException exception = assertWalkInManualRejected(slot);

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void walkInManual_shouldRejectInactiveBuilding() {
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.MEDIUM,
                true, true, true, false, BUILDING_ID);

        AppException exception = assertWalkInManualRejected(slot);

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void walkInManual_shouldRejectMaintenanceSlot() {
        ParkingSlot slot = manualSlot(ParkingSlot.Status.MAINTENANCE, ParkingSlot.SlotSize.MEDIUM,
                true, true, true, true, BUILDING_ID);

        AppException exception = assertWalkInManualRejected(slot);

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void walkInManual_shouldCreateActiveSessionOccupySlotAndLogPlate() {
        SessionEntryRequest request = walkInManualRequest();
        ParkingSlot slot = manualSlot(ParkingSlot.Status.AVAILABLE, ParkingSlot.SlotSize.MEDIUM,
                true, true, true, true, BUILDING_ID);
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(slot));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        SessionResponse response = sessionService.processEntry(request, AUTH_USERNAME);

        assertEquals("ACTIVE", response.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, slot.getStatus());

        ArgumentCaptor<ParkingSlot> slotCaptor = ArgumentCaptor.forClass(ParkingSlot.class);
        verify(parkingSlotRepository).save(slotCaptor.capture());
        assertEquals(ParkingSlot.Status.OCCUPIED, slotCaptor.getValue().getStatus());

        ArgumentCaptor<ParkingSession> sessionCaptor = ArgumentCaptor.forClass(ParkingSession.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        ParkingSession savedSession = sessionCaptor.getValue();
        assertEquals(ParkingSession.EntryMode.WALK_IN_MANUAL, savedSession.getEntryMode());
        assertEquals(ParkingSession.SessionStatus.ACTIVE, savedSession.getStatus());
        assertEquals(LICENSE_PLATE, savedSession.getVehicle().getLicensePlate());
        assertEquals(SLOT_ID, savedSession.getSlot().getId());

        ArgumentCaptor<GateLog> gateLogCaptor = ArgumentCaptor.forClass(GateLog.class);
        verify(gateLogRepository).save(gateLogCaptor.capture());
        assertEquals(LICENSE_PLATE, gateLogCaptor.getValue().getLicensePlate());
    }

    @Test
    void processExit_shouldRejectInactiveGate() {
        SessionExitRequest request = exitRequest("CASH");
        ParkingSession session = activeSession();
        ParkingSlot slot = session.getSlot();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.EXIT, false)));
        lenient().when(sessionRepository.save(any(ParkingSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processExit(SESSION_ID, request, AUTH_USERNAME));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.ACTIVE, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, slot.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processExit_shouldRejectEntryOnlyGate() {
        SessionExitRequest request = exitRequest("CASH");
        ParkingSession session = activeSession();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        lenient().when(sessionRepository.save(any(ParkingSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processExit(SESSION_ID, request, AUTH_USERNAME));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.ACTIVE, session.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processExit_shouldRejectSessionNotActive() {
        SessionExitRequest request = exitRequest("CASH");
        ParkingSession session = activeSession();
        ParkingSlot slot = session.getSlot();
        session.setStatus(ParkingSession.SessionStatus.WAITING_PAYMENT);
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processExit(SESSION_ID, request, AUTH_USERNAME));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.WAITING_PAYMENT, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, slot.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processExit_validationFailureShouldNotMutateSessionOrSlot() {
        SessionExitRequest request = exitRequest("CASH");
        ParkingSession session = activeSession();
        ParkingSlot slot = session.getSlot();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        lenient().when(sessionRepository.save(any(ParkingSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processExit(SESSION_ID, request, AUTH_USERNAME));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.ACTIVE, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, slot.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(parkingSlotRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processExit_shouldMoveActiveSessionToWaitingPayment() {
        SessionExitRequest request = exitRequest("CASH");
        ParkingSession session = activeSession();
        Gate exitGate = gate(Gate.GateType.EXIT, true);
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(exitGate));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        SessionResponse response = sessionService.processExit(SESSION_ID, request, AUTH_USERNAME);

        assertEquals("WAITING_PAYMENT", response.getStatus());
        assertEquals(ParkingSession.SessionStatus.WAITING_PAYMENT, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, session.getSlot().getStatus());
        assertEquals(exitGate, session.getExitGate());
        assertNotNull(session.getExitTime());

        ArgumentCaptor<ParkingSession> sessionCaptor = ArgumentCaptor.forClass(ParkingSession.class);
        verify(sessionRepository).save(sessionCaptor.capture());
        assertEquals(ParkingSession.SessionStatus.WAITING_PAYMENT, sessionCaptor.getValue().getStatus());

        ArgumentCaptor<GateLog> gateLogCaptor = ArgumentCaptor.forClass(GateLog.class);
        verify(gateLogRepository).save(gateLogCaptor.capture());
        GateLog gateLog = gateLogCaptor.getValue();
        assertEquals(session, gateLog.getSession());
        assertEquals(exitGate, gateLog.getGate());
        assertEquals(LICENSE_PLATE, gateLog.getLicensePlate());
        assertEquals(GateLog.EventType.EXIT, gateLog.getEventType());
    }

    @Test
    void processExit_shouldUseAuthenticatedActorForGateLog() {
        SessionExitRequest request = exitRequest("CASH");
        ParkingSession session = activeSession();
        Gate exitGate = gate(Gate.GateType.EXIT, true);
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(exitGate));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processExit(SESSION_ID, request, AUTH_USERNAME);

        ArgumentCaptor<GateLog> gateLogCaptor = ArgumentCaptor.forClass(GateLog.class);
        verify(gateLogRepository).save(gateLogCaptor.capture());
        assertEquals(ACTOR_USER_ID, gateLogCaptor.getValue().getStaffUserId());
    }

    @Test
    void processEntry_shouldRejectWhenAuthenticatedUserNotFound() {
        SessionEntryRequest request = bookingRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(bookingRepository, never()).save(any());
        verify(parkingSlotRepository, never()).save(any());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processExit_shouldRejectWhenAuthenticatedUserNotFound() {
        SessionExitRequest request = exitRequest("CASH");
        ParkingSession session = activeSession();
        ParkingSlot slot = session.getSlot();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.EXIT, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processExit(SESSION_ID, request, AUTH_USERNAME));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.ACTIVE, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, slot.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(parkingSlotRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void completeSessionAfterPayment_shouldCompleteWaitingPaymentSession() {
        ParkingSession session = waitingPaymentSession();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        SessionResponse response = sessionService.completeSessionAfterPayment(SESSION_ID);

        assertEquals(ParkingSession.SessionStatus.COMPLETED, session.getStatus());
        assertEquals("COMPLETED", response.getStatus());
        verify(sessionRepository).save(session);
    }

    @Test
    void completeSessionAfterPayment_shouldReleaseOccupiedSlot() {
        ParkingSession session = waitingPaymentSession();
        ParkingSlot slot = session.getSlot();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        sessionService.completeSessionAfterPayment(SESSION_ID);

        assertEquals(ParkingSlot.Status.AVAILABLE, slot.getStatus());
        verify(parkingSlotRepository).save(slot);
    }

    @Test
    void completeSessionAfterPayment_shouldCompleteLinkedBooking() {
        ParkingSession session = waitingPaymentSessionWithBooking();
        Booking booking = session.getBooking();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        sessionService.completeSessionAfterPayment(SESSION_ID);

        assertEquals(Booking.BookingStatus.COMPLETED, booking.getStatus());
        verify(bookingRepository).save(booking);
    }

    @Test
    void completeSessionAfterPayment_shouldAllowWalkInWithoutBooking() {
        ParkingSession session = waitingPaymentSession();
        session.setBooking(null);
        ParkingSlot slot = session.getSlot();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        sessionService.completeSessionAfterPayment(SESSION_ID);

        assertEquals(ParkingSession.SessionStatus.COMPLETED, session.getStatus());
        assertEquals(ParkingSlot.Status.AVAILABLE, slot.getStatus());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void completeSessionAfterPayment_shouldRejectSessionNotWaitingPayment() {
        ParkingSession session = activeSession();
        ParkingSlot slot = session.getSlot();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.completeSessionAfterPayment(SESSION_ID));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.ACTIVE, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, slot.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(parkingSlotRepository, never()).save(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void completeSessionAfterPayment_shouldRejectMissingSlot() {
        ParkingSession session = waitingPaymentSession();
        session.setSlot(null);
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.completeSessionAfterPayment(SESSION_ID));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(ParkingSession.SessionStatus.WAITING_PAYMENT, session.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(parkingSlotRepository, never()).save(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void completeSessionAfterPayment_shouldRejectMissingSession() {
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.completeSessionAfterPayment(SESSION_ID));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(parkingSlotRepository, never()).save(any());
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void getOwnedSession_shouldReturnSessionWhenDriverOwnsVehicle() {
        ParkingSession session = activeSession();
        given(userRepository.findByUsername("driver")).willReturn(Optional.of(user(USER_ID)));
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        SessionResponse response = sessionService.getOwnedSession(SESSION_ID, "driver");

        assertEquals(SESSION_ID, response.getSessionId());
        assertEquals(USER_ID, response.getUserId());
        assertEquals(VEHICLE_ID, response.getVehicleId());
    }

    @Test
    void getOwnedSession_shouldReturnNotFoundWhenSessionBelongsToAnotherDriver() {
        ParkingSession session = activeSession();
        session.getVehicle().setUserId(OTHER_USER_ID);
        session.setUserId(OTHER_USER_ID);
        given(userRepository.findByUsername("driver")).willReturn(Optional.of(user(USER_ID)));
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.getOwnedSession(SESSION_ID, "driver"));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
    }

    @Test
    void getOwnedSession_shouldReturnNotFoundWhenSessionDoesNotExist() {
        given(userRepository.findByUsername("driver")).willReturn(Optional.of(user(USER_ID)));
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.getOwnedSession(SESSION_ID, "driver"));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
    }

    @Test
    void getOwnedSession_shouldReturnNotFoundWhenAuthenticatedUserDoesNotExist() {
        given(userRepository.findByUsername("missing-driver")).willReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.getOwnedSession(SESSION_ID, "missing-driver"));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(sessionRepository, never()).findById(any());
    }

    @Test
    void getSession_shouldReturnSessionForPrivilegedPath() {
        ParkingSession session = activeSession();
        given(sessionRepository.findById(SESSION_ID)).willReturn(Optional.of(session));

        SessionResponse response = sessionService.getSession(SESSION_ID);

        assertEquals(SESSION_ID, response.getSessionId());
        assertEquals(USER_ID, response.getUserId());
    }

    private AppException assertWalkInManualRejected(ParkingSlot slot) {
        SessionEntryRequest request = walkInManualRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(userRepository.findByUsername(AUTH_USERNAME)).willReturn(Optional.of(user(ACTOR_USER_ID, AUTH_USERNAME)));
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle()));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findByIdForUpdate(SLOT_ID)).willReturn(Optional.of(slot));
        lenient().when(sessionRepository.save(any(ParkingSession.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request, AUTH_USERNAME));

        verify(sessionRepository, never()).save(any());
        verify(parkingSlotRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
        return exception;
    }

    private void stubSuccessfulWalkInAuto() {
        Vehicle vehicle = vehicle();
        ParkingSlot slot = slot(ParkingSlot.Status.AVAILABLE);
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(parkingSlotRepository.findFirstAvailableByBuildingAndSlotSizeForUpdate(
                eq(BUILDING_ID), eq(ParkingSlot.SlotSize.MEDIUM), any()))
                .willReturn(List.of(slot));
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));
    }

    private SessionEntryRequest entryRequest(String entryMode) {
        SessionEntryRequest request = new SessionEntryRequest();
        request.setGateId(GATE_ID);
        request.setEntryMode(entryMode);
        return request;
    }

    private SessionEntryRequest walkInAutoRequest() {
        SessionEntryRequest request = entryRequest(ParkingSession.EntryMode.WALK_IN_AUTO.name());
        request.setLicensePlate(LICENSE_PLATE);
        return request;
    }

    private SessionEntryRequest walkInManualRequest() {
        SessionEntryRequest request = entryRequest(ParkingSession.EntryMode.WALK_IN_MANUAL.name());
        request.setLicensePlate(LICENSE_PLATE);
        request.setSlotId(SLOT_ID);
        return request;
    }

    private SessionEntryRequest bookingRequest() {
        SessionEntryRequest request = entryRequest(ParkingSession.EntryMode.BOOKING.name());
        request.setQrToken(QR_TOKEN);
        return request;
    }

    private SessionExitRequest exitRequest(String paymentMethod) {
        SessionExitRequest request = new SessionExitRequest();
        request.setGateId(GATE_ID);
        request.setPaymentMethod(paymentMethod);
        return request;
    }

    private Claims claimsForBooking() {
        Claims claims = mock(Claims.class);
        given(claims.get("booking_id", Long.class)).willReturn(BOOKING_ID);
        return claims;
    }

    private Booking confirmedBooking() {
        return Booking.builder()
                .id(BOOKING_ID)
                .userId(USER_ID)
                .vehicle(vehicle())
                .slot(slot(ParkingSlot.Status.RESERVED))
                .status(Booking.BookingStatus.CONFIRMED)
                .build();
    }

    private ParkingSession activeSession() {
        return ParkingSession.builder()
                .id(SESSION_ID)
                .slot(slot(ParkingSlot.Status.OCCUPIED))
                .userId(USER_ID)
                .vehicle(vehicle())
                .entryGate(gate(Gate.GateType.ENTRY, true))
                .entryMode(ParkingSession.EntryMode.WALK_IN_MANUAL)
                .status(ParkingSession.SessionStatus.ACTIVE)
                .build();
    }

    private ParkingSession waitingPaymentSession() {
        ParkingSession session = activeSession();
        session.setStatus(ParkingSession.SessionStatus.WAITING_PAYMENT);
        return session;
    }

    private ParkingSession waitingPaymentSessionWithBooking() {
        ParkingSession session = waitingPaymentSession();
        session.setEntryMode(ParkingSession.EntryMode.BOOKING);
        session.setBooking(checkedInBooking());
        return session;
    }

    private Booking checkedInBooking() {
        return Booking.builder()
                .id(BOOKING_ID)
                .userId(USER_ID)
                .vehicle(vehicle())
                .slot(slot(ParkingSlot.Status.OCCUPIED))
                .status(Booking.BookingStatus.CHECKED_IN)
                .build();
    }

    private Vehicle vehicle() {
        return Vehicle.builder()
                .id(VEHICLE_ID)
                .userId(USER_ID)
                .licensePlate(LICENSE_PLATE)
                .vehicleType(VehicleType.builder()
                        .id(10L)
                        .name("CAR")
                        .slotSize(VehicleType.SlotSize.MEDIUM)
                        .build())
                .build();
    }

    private User user(Long userId) {
        return user(userId, "driver");
    }

    private User user(Long userId, String username) {
        return User.builder()
                .userId(userId.intValue())
                .username(username)
                .fullName("Driver User")
                .email("driver@example.com")
                .passwordHash("hash")
                .status(User.UserStatus.ACTIVE)
                .build();
    }

    private ParkingSlot slot(ParkingSlot.Status status) {
        return ParkingSlot.builder()
                .id(SLOT_ID)
                .slotCode("A-01")
                .slotSize(ParkingSlot.SlotSize.MEDIUM)
                .status(status)
                .build();
    }

    private ParkingSlot manualSlot(ParkingSlot.Status status,
                                   ParkingSlot.SlotSize slotSize,
                                   boolean slotActive,
                                   boolean zoneActive,
                                   boolean floorActive,
                                   boolean buildingActive,
                                   Long buildingId) {
        ParkingBuilding building = ParkingBuilding.builder()
                .id(buildingId)
                .isActive(buildingActive)
                .build();
        Floor floor = Floor.builder()
                .id(20L)
                .building(building)
                .floorNumber(1)
                .name("Floor 1")
                .isActive(floorActive)
                .build();
        Zone zone = Zone.builder()
                .id(30L)
                .floor(floor)
                .vehicleType(VehicleType.builder()
                        .id(10L)
                        .name("CAR")
                        .slotSize(VehicleType.SlotSize.MEDIUM)
                        .build())
                .name("Zone A")
                .isActive(zoneActive)
                .build();

        return ParkingSlot.builder()
                .id(SLOT_ID)
                .zone(zone)
                .slotCode("A-01")
                .slotSize(slotSize)
                .status(status)
                .isActive(slotActive)
                .build();
    }

    private Gate gate(Gate.GateType gateType, boolean active) {
        return Gate.builder()
                .id(GATE_ID)
                .building(ParkingBuilding.builder().id(BUILDING_ID).build())
                .gateCode("G-01")
                .gateType(gateType)
                .isActive(active)
                .build();
    }
}

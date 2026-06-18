package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.GateLog;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.GateLogRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
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
    private static final String LICENSE_PLATE = "51A-12345";
    private static final String QR_TOKEN = "qr-token";

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
    private QrTokenUtil qrTokenUtil;

    @Mock
    private SlotAssignmentService slotAssignmentService;

    @InjectMocks
    private ParkingSessionServiceImpl sessionService;

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = "INVALID")
    void processEntry_shouldRejectNullOrInvalidEntryModeWithBadRequest(String entryMode) {
        SessionEntryRequest request = entryRequest(entryMode);
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processEntry_shouldRejectInactiveGate() {
        SessionEntryRequest request = walkInAutoRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, false)));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void processEntry_shouldRejectExitGateForEntry() {
        SessionEntryRequest request = walkInAutoRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.EXIT, true)));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request));

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
        lenient().when(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .thenReturn(true);

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(request));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(sessionRepository, never()).save(any());
        verify(gateLogRepository, never()).save(any());
    }

    @Test
    void walkInAuto_shouldAssignBestSlotByGateBuildingId() {
        SessionEntryRequest request = walkInAutoRequest();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        stubSuccessfulWalkInAuto();

        sessionService.processEntry(request);

        verify(slotAssignmentService).assignBestSlot(BUILDING_ID, VehicleType.SlotSize.MEDIUM);
    }

    @Test
    void bookingEntryGateLog_shouldUseSessionVehiclePlateWhenRequestPlateIsNull() {
        SessionEntryRequest request = bookingRequest();
        request.setLicensePlate(null);
        Claims claims = claimsForBooking();
        given(gateRepository.findById(GATE_ID)).willReturn(Optional.of(gate(Gate.GateType.ENTRY, true)));
        given(qrTokenUtil.parseQrToken(QR_TOKEN)).willReturn(claims);
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(confirmedBooking()));
        lenient().when(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .thenReturn(false);
        given(sessionRepository.save(any(ParkingSession.class))).willAnswer(invocation -> invocation.getArgument(0));

        sessionService.processEntry(request);

        ArgumentCaptor<GateLog> gateLogCaptor = ArgumentCaptor.forClass(GateLog.class);
        verify(gateLogRepository).save(gateLogCaptor.capture());
        assertEquals(LICENSE_PLATE, gateLogCaptor.getValue().getLicensePlate());
    }

    private void stubSuccessfulWalkInAuto() {
        Vehicle vehicle = vehicle();
        ParkingSlot slot = slot(ParkingSlot.Status.AVAILABLE);
        given(vehicleRepository.findByLicensePlate(LICENSE_PLATE)).willReturn(Optional.of(vehicle));
        given(sessionRepository.existsByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(false);
        given(slotAssignmentService.assignBestSlot(any(), eq(VehicleType.SlotSize.MEDIUM)))
                .willReturn(slot);
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

    private SessionEntryRequest bookingRequest() {
        SessionEntryRequest request = entryRequest(ParkingSession.EntryMode.BOOKING.name());
        request.setQrToken(QR_TOKEN);
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

    private ParkingSlot slot(ParkingSlot.Status status) {
        return ParkingSlot.builder()
                .id(SLOT_ID)
                .slotCode("A-01")
                .slotSize(ParkingSlot.SlotSize.MEDIUM)
                .status(status)
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

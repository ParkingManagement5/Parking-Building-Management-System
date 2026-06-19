package com.swp391.parking.integration;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
import com.swp391.parking.dto.response.SessionResponse;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.service.ParkingSessionService;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

class ParkingSessionOperatingHoursIntegrationTest extends AbstractIntegrationTestSupport {

    private static final ZoneId TEST_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TEST_DATE = LocalDate.of(2026, 6, 19);

    @Autowired
    private ParkingSessionService sessionService;

    @Autowired
    private ParkingSessionRepository sessionRepository;

    @MockBean
    private Clock clock;

    @Test
    void normalHours_shouldAllowEntryBeforeClosingBoundary() {
        setCurrentTime(LocalTime.of(21, 59));
        TestFacility facility = createFacility("Normal Allow", LocalTime.of(6, 0), LocalTime.of(22, 0));

        SessionResponse response = sessionService.processEntry(
                entryRequest(facility.gate(), facility.vehicle()), facility.staff().getUsername());

        assertEquals("ACTIVE", response.getStatus());
    }

    @Test
    void normalHours_shouldRejectEntryAtClosingBoundary() {
        setCurrentTime(LocalTime.of(22, 0));
        TestFacility facility = createFacility("Normal Reject", LocalTime.of(6, 0), LocalTime.of(22, 0));

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(entryRequest(facility.gate(), facility.vehicle()),
                        facility.staff().getUsername()));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
    }

    @Test
    void overnightHours_shouldAllowEntryAfterMidnight() {
        setCurrentTime(LocalTime.of(2, 0));
        TestFacility facility = createFacility("Overnight Allow", LocalTime.of(22, 0), LocalTime.of(6, 0));

        SessionResponse response = sessionService.processEntry(
                entryRequest(facility.gate(), facility.vehicle()), facility.staff().getUsername());

        assertEquals("ACTIVE", response.getStatus());
    }

    @Test
    void twentyFourHours_shouldAllowEntryAtThreeAM() {
        setCurrentTime(LocalTime.of(3, 0));
        TestFacility facility = createFacility("24h Allow", LocalTime.of(6, 0), LocalTime.of(6, 0),
                true, true);

        SessionResponse response = sessionService.processEntry(
                entryRequest(facility.gate(), facility.vehicle()), facility.staff().getUsername());

        assertEquals("ACTIVE", response.getStatus());
    }

    @Test
    void twentyFourHours_shouldRejectInactiveBuilding() {
        setCurrentTime(LocalTime.of(3, 0));
        TestFacility facility = createFacility("24h Inactive", LocalTime.of(6, 0), LocalTime.of(6, 0),
                true, false);

        AppException exception = assertThrows(AppException.class,
                () -> sessionService.processEntry(entryRequest(facility.gate(), facility.vehicle()),
                        facility.staff().getUsername()));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(0, sessionRepository.count());
    }

    @Test
    void exit_shouldRemainAllowedOutsideOperatingHours() {
        setCurrentTime(LocalTime.of(23, 0));
        TestFacility facility = createFacility("Exit Outside", LocalTime.of(6, 0), LocalTime.of(22, 0));
        ParkingSlot slot = facility.slot();
        slot.setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(slot);
        ParkingSession session = sessionRepository.save(ParkingSession.builder()
                .slot(slot)
                .userId(facility.vehicle().getUserId())
                .vehicle(facility.vehicle())
                .entryGate(facility.gate())
                .entryMode(ParkingSession.EntryMode.WALK_IN_AUTO)
                .status(ParkingSession.SessionStatus.ACTIVE)
                .build());
        SessionExitRequest request = new SessionExitRequest();
        request.setGateId(facility.gate().getId());
        request.setPaymentMethod("CASH");

        SessionResponse response = sessionService.processExit(session.getId(), request, facility.staff().getUsername());

        assertEquals("WAITING_PAYMENT", response.getStatus());
    }

    private TestFacility createFacility(String suffix, LocalTime openTime, LocalTime closeTime) {
        return createFacility(suffix, openTime, closeTime, false, true);
    }

    private TestFacility createFacility(String suffix, LocalTime openTime, LocalTime closeTime,
                                        boolean is24Hours, boolean buildingActive) {
        ParkingBuilding building = createBuilding("Hours Building " + suffix);
        building.setOpenTime(openTime);
        building.setCloseTime(closeTime);
        building.setIs24Hours(is24Hours);
        building.setIsActive(buildingActive);
        buildingRepository.save(building);
        Floor floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Hours Car " + suffix, VehicleType.SlotSize.MEDIUM);
        Zone zone = createZone(floor, vehicleType, "Hours Zone " + suffix);
        ParkingSlot slot = createSlot(zone, "H-" + suffix, ParkingSlot.Status.AVAILABLE);
        Gate gate = createGate(building, "GH-" + suffix, Gate.GateType.BOTH);
        User staff = createUser("hours-staff-" + suffix, com.swp391.parking.entity.Role.RoleName.STAFF);
        User owner = createUser("hours-owner-" + suffix, com.swp391.parking.entity.Role.RoleName.DRIVER);
        Vehicle vehicle = createVehicle(owner, vehicleType, "51H-" + Math.abs(suffix.hashCode()));
        return new TestFacility(gate, slot, vehicle, staff);
    }

    private SessionEntryRequest entryRequest(Gate gate, Vehicle vehicle) {
        SessionEntryRequest request = new SessionEntryRequest();
        request.setGateId(gate.getId());
        request.setEntryMode(ParkingSession.EntryMode.WALK_IN_AUTO.name());
        request.setLicensePlate(vehicle.getLicensePlate());
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

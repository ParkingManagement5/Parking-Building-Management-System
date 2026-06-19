package com.swp391.parking.integration;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.GateLog;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.repository.GateLogRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.when;

class ParkingSessionApiIntegrationTest extends AbstractIntegrationTestSupport {

    private static final ZoneId TEST_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TEST_DATE = LocalDate.of(2026, 6, 19);

    @Autowired
    private ParkingSessionRepository sessionRepository;

    @Autowired
    private GateLogRepository gateLogRepository;

    @MockBean
    private Clock clock;

    @Test
    void entryEndpoint_shouldRejectUnauthenticatedWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Entry Unauth");

        mockMvc.perform(post("/api/sessions/entry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(autoEntryRequest(facility.entryGate(), facility.vehicle()))))
                .andExpect(status().isUnauthorized());

        assertEquals(0, sessionRepository.count());
        assertEquals(0, gateLogRepository.count());
        assertEquals(ParkingSlot.Status.AVAILABLE,
                parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
    }

    @Test
    @WithMockUser(username = "api-entry-driver", roles = "DRIVER")
    void entryEndpoint_shouldRejectDriverWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("api-entry-driver", Role.RoleName.DRIVER);
        TestFacility facility = createFacility("Entry Driver");

        mockMvc.perform(post("/api/sessions/entry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(autoEntryRequest(facility.entryGate(), facility.vehicle()))))
                .andExpect(status().isForbidden());

        assertEquals(0, sessionRepository.count());
        assertEquals(0, gateLogRepository.count());
        assertEquals(ParkingSlot.Status.AVAILABLE,
                parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
    }

    @Test
    @WithMockUser(username = "api-entry-manager", roles = "MANAGER")
    void entryEndpoint_shouldAllowManagerAndUseAuthenticatedActor() throws Exception {
        setCurrentTime(LocalTime.NOON);
        User manager = createUser("api-entry-manager", Role.RoleName.MANAGER);
        TestFacility facility = createFacility("Entry Manager");
        SessionEntryRequest request = autoEntryRequest(facility.entryGate(), facility.vehicle());

        mockMvc.perform(post("/api/sessions/entry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        ParkingSession session = sessionRepository.findAll().get(0);
        assertEquals(ParkingSession.SessionStatus.ACTIVE, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED,
                parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
        assertEntryGateLog(manager, facility.vehicle());
    }

    @Test
    @WithMockUser(username = "api-entry-admin", roles = "ADMIN")
    void entryEndpoint_shouldAllowAdminAndIgnoreClientStaffUserId() throws Exception {
        setCurrentTime(LocalTime.NOON);
        User admin = createUser("api-entry-admin", Role.RoleName.ADMIN);
        TestFacility facility = createFacility("Entry Admin");

        mockMvc.perform(post("/api/sessions/entry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "gateId": %d,
                                  "entryMode": "WALK_IN_AUTO",
                                  "licensePlate": "%s",
                                  "staffUserId": 999999
                                }
                                """.formatted(facility.entryGate().getId(), facility.vehicle().getLicensePlate())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        assertEntryGateLog(admin, facility.vehicle());
    }

    @Test
    @WithMockUser(username = "api-entry-invalid", roles = "STAFF")
    void entryEndpoint_shouldReturnBadRequestForInvalidEntryModeWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("api-entry-invalid", Role.RoleName.STAFF);
        TestFacility facility = createFacility("Entry Invalid Mode");
        SessionEntryRequest request = autoEntryRequest(facility.entryGate(), facility.vehicle());
        request.setEntryMode("NOT_A_MODE");

        mockMvc.perform(post("/api/sessions/entry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isBadRequest());

        assertEquals(0, sessionRepository.count());
        assertEquals(0, gateLogRepository.count());
        assertEquals(ParkingSlot.Status.AVAILABLE,
                parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
    }

    @Test
    @WithMockUser(username = "api-entry-gate", roles = "STAFF")
    void entryEndpoint_shouldReturnNotFoundForMissingGateWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("api-entry-gate", Role.RoleName.STAFF);
        TestFacility facility = createFacility("Entry Missing Gate");
        SessionEntryRequest request = autoEntryRequest(facility.entryGate(), facility.vehicle());
        request.setGateId(999999L);

        mockMvc.perform(post("/api/sessions/entry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(request)))
                .andExpect(status().isNotFound());

        assertEquals(0, sessionRepository.count());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    void exitEndpoint_shouldRejectUnauthenticatedWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        TestFacility facility = createFacility("Exit Unauth");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(post("/api/sessions/{id}/exit", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(exitRequest(facility.exitGate()))))
                .andExpect(status().isUnauthorized());

        assertActiveSessionAndOccupiedSlot(session.getId(), facility.slot().getId());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    @WithMockUser(username = "api-exit-driver", roles = "DRIVER")
    void exitEndpoint_shouldRejectDriverWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("api-exit-driver", Role.RoleName.DRIVER);
        TestFacility facility = createFacility("Exit Driver");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(post("/api/sessions/{id}/exit", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(exitRequest(facility.exitGate()))))
                .andExpect(status().isForbidden());

        assertActiveSessionAndOccupiedSlot(session.getId(), facility.slot().getId());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    @WithMockUser(username = "api-exit-manager", roles = "MANAGER")
    void exitEndpoint_shouldAllowManagerAndUseAuthenticatedActor() throws Exception {
        setCurrentTime(LocalTime.NOON);
        User manager = createUser("api-exit-manager", Role.RoleName.MANAGER);
        TestFacility facility = createFacility("Exit Manager");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(post("/api/sessions/{id}/exit", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(exitRequest(facility.exitGate()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("WAITING_PAYMENT"));

        ParkingSession exited = sessionRepository.findById(session.getId()).orElseThrow();
        assertEquals(ParkingSession.SessionStatus.WAITING_PAYMENT, exited.getStatus());
        assertNotNull(exited.getExitTime());
        assertEquals(ParkingSlot.Status.OCCUPIED,
                parkingSlotRepository.findById(facility.slot().getId()).orElseThrow().getStatus());
        assertExitGateLog(manager, facility.vehicle());
    }

    @Test
    @WithMockUser(username = "api-exit-admin", roles = "ADMIN")
    void exitEndpoint_shouldAllowAdmin() throws Exception {
        setCurrentTime(LocalTime.NOON);
        User admin = createUser("api-exit-admin", Role.RoleName.ADMIN);
        TestFacility facility = createFacility("Exit Admin");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(post("/api/sessions/{id}/exit", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(exitRequest(facility.exitGate()))))
                .andExpect(status().isOk());

        assertExitGateLog(admin, facility.vehicle());
    }

    @Test
    @WithMockUser(username = "api-exit-missing", roles = "STAFF")
    void exitEndpoint_shouldReturnNotFoundForMissingSessionWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("api-exit-missing", Role.RoleName.STAFF);
        TestFacility facility = createFacility("Exit Missing Session");

        mockMvc.perform(post("/api/sessions/{id}/exit", 999999L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(exitRequest(facility.exitGate()))))
                .andExpect(status().isNotFound());

        assertEquals(0, gateLogRepository.count());
        assertEquals(0, sessionRepository.count());
    }

    @Test
    @WithMockUser(username = "api-exit-status", roles = "STAFF")
    void exitEndpoint_shouldReturnBadRequestForNonActiveSessionWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("api-exit-status", Role.RoleName.STAFF);
        TestFacility facility = createFacility("Exit Non Active");
        ParkingSession session = activeSession(facility);
        session.setStatus(ParkingSession.SessionStatus.WAITING_PAYMENT);
        sessionRepository.save(session);

        mockMvc.perform(post("/api/sessions/{id}/exit", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(exitRequest(facility.exitGate()))))
                .andExpect(status().isBadRequest());

        assertEquals(ParkingSession.SessionStatus.WAITING_PAYMENT,
                sessionRepository.findById(session.getId()).orElseThrow().getStatus());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    @WithMockUser(username = "api-exit-gate", roles = "STAFF")
    void exitEndpoint_shouldReturnBadRequestForEntryOnlyGateWithoutMutation() throws Exception {
        setCurrentTime(LocalTime.NOON);
        createUser("api-exit-gate", Role.RoleName.STAFF);
        TestFacility facility = createFacility("Exit Entry Gate");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(post("/api/sessions/{id}/exit", session.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(exitRequest(facility.entryGate()))))
                .andExpect(status().isBadRequest());

        assertActiveSessionAndOccupiedSlot(session.getId(), facility.slot().getId());
        assertEquals(0, gateLogRepository.count());
    }

    @Test
    void getSessionEndpoint_shouldRejectUnauthenticated() throws Exception {
        TestFacility facility = createFacility("Get Unauth");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(get("/api/sessions/{id}", session.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "api-get-owner", roles = "DRIVER")
    void getSessionEndpoint_shouldAllowDriverOwner() throws Exception {
        User owner = createUser("api-get-owner", Role.RoleName.DRIVER);
        TestFacility facility = createFacility("Get Owner", owner);
        ParkingSession session = activeSession(facility);

        mockMvc.perform(get("/api/sessions/{id}", session.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(session.getId()));
    }

    @Test
    @WithMockUser(username = "api-get-other", roles = "DRIVER")
    void getSessionEndpoint_shouldReturnNotFoundForDriverNonOwner() throws Exception {
        createUser("api-get-other", Role.RoleName.DRIVER);
        TestFacility facility = createFacility("Get Non Owner");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(get("/api/sessions/{id}", session.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "api-get-missing", roles = "DRIVER")
    void getSessionEndpoint_shouldReturnNotFoundForDriverMissingSession() throws Exception {
        createUser("api-get-missing", Role.RoleName.DRIVER);

        mockMvc.perform(get("/api/sessions/{id}", 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "api-get-staff", roles = "STAFF")
    void getSessionEndpoint_shouldAllowStaffAnySession() throws Exception {
        createUser("api-get-staff", Role.RoleName.STAFF);
        TestFacility facility = createFacility("Get Staff");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(get("/api/sessions/{id}", session.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(session.getId()));
    }

    @Test
    @WithMockUser(username = "api-get-manager", roles = "MANAGER")
    void getSessionEndpoint_shouldAllowManagerAnySession() throws Exception {
        createUser("api-get-manager", Role.RoleName.MANAGER);
        TestFacility facility = createFacility("Get Manager");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(get("/api/sessions/{id}", session.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(session.getId()));
    }

    @Test
    @WithMockUser(username = "api-get-admin", roles = "ADMIN")
    void getSessionEndpoint_shouldAllowAdminAnySession() throws Exception {
        createUser("api-get-admin", Role.RoleName.ADMIN);
        TestFacility facility = createFacility("Get Admin");
        ParkingSession session = activeSession(facility);

        mockMvc.perform(get("/api/sessions/{id}", session.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(session.getId()));
    }

    @Test
    void mySessionsEndpoint_shouldRejectUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/sessions/my"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "api-my-driver", roles = "DRIVER")
    void mySessionsEndpoint_shouldReturnOnlyDriverSessions() throws Exception {
        User driver = createUser("api-my-driver", Role.RoleName.DRIVER);
        TestFacility mine = createFacility("My Mine", driver);
        ParkingSession mySession = activeSession(mine);
        TestFacility other = createFacility("My Other");
        ParkingSession otherSession = activeSession(other);

        mockMvc.perform(get("/api/sessions/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].sessionId").value(mySession.getId()));

        assertNotNull(sessionRepository.findById(otherSession.getId()).orElseThrow());
    }

    @Test
    @WithMockUser(username = "api-my-staff", roles = "STAFF")
    void mySessionsEndpoint_shouldRejectStaff() throws Exception {
        createUser("api-my-staff", Role.RoleName.STAFF);

        mockMvc.perform(get("/api/sessions/my"))
                .andExpect(status().isForbidden());
    }

    private TestFacility createFacility(String suffix) {
        User owner = createUser("api-owner-" + Math.abs(suffix.hashCode()), Role.RoleName.DRIVER);
        return createFacility(suffix, owner);
    }

    private TestFacility createFacility(String suffix, User owner) {
        String key = String.valueOf(Math.abs(suffix.hashCode()));
        ParkingBuilding building = createBuilding("API Session Building " + suffix);
        building.setIs24Hours(true);
        buildingRepository.save(building);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("API Session Car " + suffix, VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "API Session Zone " + suffix);
        ParkingSlot slot = createSlot(zone, "AS-" + key, ParkingSlot.Status.AVAILABLE);
        Gate entryGate = createGate(building, "ASE-" + key, Gate.GateType.ENTRY);
        Gate exitGate = createGate(building, "ASX-" + key, Gate.GateType.EXIT);
        Vehicle vehicle = createVehicle(owner, vehicleType, "51S-" + key);
        return new TestFacility(entryGate, exitGate, slot, vehicle);
    }

    private SessionEntryRequest autoEntryRequest(Gate gate, Vehicle vehicle) {
        SessionEntryRequest request = new SessionEntryRequest();
        request.setGateId(gate.getId());
        request.setEntryMode(ParkingSession.EntryMode.WALK_IN_AUTO.name());
        request.setLicensePlate(vehicle.getLicensePlate());
        return request;
    }

    private SessionExitRequest exitRequest(Gate gate) {
        SessionExitRequest request = new SessionExitRequest();
        request.setGateId(gate.getId());
        request.setPaymentMethod("CASH");
        return request;
    }

    private ParkingSession activeSession(TestFacility facility) {
        ParkingSlot slot = facility.slot();
        slot.setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(slot);
        return sessionRepository.save(ParkingSession.builder()
                .slot(slot)
                .userId(facility.vehicle().getUserId())
                .vehicle(facility.vehicle())
                .entryGate(facility.entryGate())
                .entryTime(LocalDateTime.of(TEST_DATE, LocalTime.of(11, 0)))
                .entryMode(ParkingSession.EntryMode.WALK_IN_AUTO)
                .status(ParkingSession.SessionStatus.ACTIVE)
                .build());
    }

    private void assertActiveSessionAndOccupiedSlot(Long sessionId, Long slotId) {
        ParkingSession session = sessionRepository.findById(sessionId).orElseThrow();
        assertEquals(ParkingSession.SessionStatus.ACTIVE, session.getStatus());
        assertEquals(ParkingSlot.Status.OCCUPIED, parkingSlotRepository.findById(slotId).orElseThrow().getStatus());
    }

    private void assertEntryGateLog(User actor, Vehicle vehicle) {
        assertEquals(1, gateLogRepository.count());
        GateLog log = gateLogRepository.findAll().get(0);
        assertEquals(GateLog.EventType.ENTRY, log.getEventType());
        assertEquals(GateLog.ResultStatus.SUCCESS, log.getResultStatus());
        assertEquals(actor.getUserId().longValue(), log.getStaffUserId());
        assertEquals(vehicle.getLicensePlate(), log.getLicensePlate());
    }

    private void assertExitGateLog(User actor, Vehicle vehicle) {
        assertEquals(1, gateLogRepository.count());
        GateLog log = gateLogRepository.findAll().get(0);
        assertEquals(GateLog.EventType.EXIT, log.getEventType());
        assertEquals(GateLog.ResultStatus.MANUAL_CHECK, log.getResultStatus());
        assertEquals(actor.getUserId().longValue(), log.getStaffUserId());
        assertEquals(vehicle.getLicensePlate(), log.getLicensePlate());
    }

    private void setCurrentTime(LocalTime time) {
        Instant instant = LocalDateTime.of(TEST_DATE, time).atZone(TEST_ZONE).toInstant();
        when(clock.getZone()).thenReturn(TEST_ZONE);
        when(clock.instant()).thenReturn(instant);
    }

    private record TestFacility(Gate entryGate, Gate exitGate, ParkingSlot slot, Vehicle vehicle) {
    }
}

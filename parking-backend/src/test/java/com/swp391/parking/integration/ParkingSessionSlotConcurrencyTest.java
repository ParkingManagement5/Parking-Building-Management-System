package com.swp391.parking.integration;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.response.SessionResponse;
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
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.GateLogRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.repository.ZoneRepository;
import com.swp391.parking.service.ParkingSessionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class ParkingSessionSlotConcurrencyTest {

    @Autowired
    private ParkingSessionService sessionService;
    @Autowired
    private ParkingBuildingRepository buildingRepository;
    @Autowired
    private FloorRepository floorRepository;
    @Autowired
    private ZoneRepository zoneRepository;
    @Autowired
    private ParkingSlotRepository parkingSlotRepository;
    @Autowired
    private GateRepository gateRepository;
    @Autowired
    private VehicleTypeRepository vehicleTypeRepository;
    @Autowired
    private VehicleRepository vehicleRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ParkingSessionRepository sessionRepository;
    @Autowired
    private GateLogRepository gateLogRepository;

    @BeforeEach
    void cleanDatabase() {
        cleanup();
    }

    @AfterEach
    void cleanAfterTest() {
        cleanup();
    }

    private void cleanup() {
        gateLogRepository.deleteAll();
        sessionRepository.deleteAll();
        parkingSlotRepository.deleteAll();
        gateRepository.deleteAll();
        vehicleRepository.deleteAll();
        zoneRepository.deleteAll();
        floorRepository.deleteAll();
        buildingRepository.deleteAll();
        vehicleTypeRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void concurrentWalkInAuto_withOneSlot_shouldCreateOnlyOneSession() throws Exception {
        TestFacility facility = createFacility("One Slot", 1);
        Vehicle vehicleOne = createVehicle("owner-one", "51A-10001", facility.vehicleType());
        Vehicle vehicleTwo = createVehicle("owner-two", "51A-10002", facility.vehicleType());
        User staff = createUser("staff-one-slot");

        List<Attempt> attempts = runConcurrentEntries(facility.gate(), staff, vehicleOne, vehicleTwo);

        long successCount = attempts.stream().filter(Attempt::success).count();
        List<Attempt> failures = attempts.stream().filter(attempt -> !attempt.success()).toList();
        assertEquals(1, successCount);
        assertEquals(1, failures.size());
        AppException failure = assertInstanceOf(AppException.class, failures.get(0).exception());
        assertEquals(HttpStatus.CONFLICT, failure.getStatus());
        assertEquals(1, sessionRepository.findAll().stream()
                .filter(session -> session.getSlot().getId().equals(facility.slots().get(0).getId()))
                .count());
        assertEquals(ParkingSlot.Status.OCCUPIED,
                parkingSlotRepository.findById(facility.slots().get(0).getId()).orElseThrow().getStatus());
        assertEquals(1, gateLogRepository.findAll().stream()
                .filter(log -> log.getEventType() == GateLog.EventType.ENTRY)
                .count());
    }

    @Test
    void concurrentWalkInAuto_withTwoSlots_shouldUseDifferentSlots() throws Exception {
        TestFacility facility = createFacility("Two Slots", 2);
        Vehicle vehicleOne = createVehicle("owner-three", "51A-20001", facility.vehicleType());
        Vehicle vehicleTwo = createVehicle("owner-four", "51A-20002", facility.vehicleType());
        User staff = createUser("staff-two-slots");

        List<Attempt> attempts = runConcurrentEntries(facility.gate(), staff, vehicleOne, vehicleTwo);

        List<Attempt> successes = attempts.stream().filter(Attempt::success).toList();
        assertEquals(2, successes.size());
        assertNotEquals(successes.get(0).slotId(), successes.get(1).slotId());
        List<ParkingSession> sessions = sessionRepository.findAll();
        assertEquals(2, sessions.size());
        assertNotEquals(sessions.get(0).getSlot().getId(), sessions.get(1).getSlot().getId());
        assertEquals(2, gateLogRepository.findAll().stream()
                .filter(log -> log.getEventType() == GateLog.EventType.ENTRY)
                .count());
        assertTrue(facility.slots().stream()
                .allMatch(slot -> parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus()
                        == ParkingSlot.Status.OCCUPIED));
    }

    private List<Attempt> runConcurrentEntries(Gate gate, User staff, Vehicle vehicleOne, Vehicle vehicleTwo)
            throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Attempt> first = executor.submit(entryTask(gate, staff, vehicleOne, ready, start));
            Future<Attempt> second = executor.submit(entryTask(gate, staff, vehicleTwo, ready, start));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            return List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
    }

    private Callable<Attempt> entryTask(Gate gate, User staff, Vehicle vehicle, CountDownLatch ready,
                                        CountDownLatch start) {
        return () -> {
            ready.countDown();
            start.await();
            try {
                SessionEntryRequest request = new SessionEntryRequest();
                request.setGateId(gate.getId());
                request.setEntryMode(ParkingSession.EntryMode.WALK_IN_AUTO.name());
                request.setLicensePlate(vehicle.getLicensePlate());
                SessionResponse response = sessionService.processEntry(request, staff.getUsername());
                return new Attempt(true, response.getSlotId(), null);
            } catch (Exception ex) {
                return new Attempt(false, null, ex);
            }
        };
    }

    private TestFacility createFacility(String suffix, int slotCount) {
        ParkingBuilding building = buildingRepository.save(ParkingBuilding.builder()
                .name("Building " + suffix)
                .address("Address " + suffix)
                .openTime(LocalTime.of(6, 0))
                .closeTime(LocalTime.of(22, 0))
                .isActive(true)
                .build());
        Floor floor = floorRepository.save(Floor.builder()
                .building(building)
                .floorNumber(1)
                .name("Floor " + suffix)
                .isActive(true)
                .build());
        VehicleType vehicleType = vehicleTypeRepository.save(VehicleType.builder()
                .name("Car " + suffix)
                .slotSize(VehicleType.SlotSize.MEDIUM)
                .isActive(true)
                .build());
        Zone zone = zoneRepository.save(Zone.builder()
                .floor(floor)
                .vehicleType(vehicleType)
                .name("Zone " + suffix)
                .isActive(true)
                .build());
        List<ParkingSlot> slots = java.util.stream.IntStream.rangeClosed(1, slotCount)
                .mapToObj(index -> parkingSlotRepository.save(ParkingSlot.builder()
                        .zone(zone)
                        .slotCode("S-" + suffix + "-" + index)
                        .slotSize(ParkingSlot.SlotSize.MEDIUM)
                        .status(ParkingSlot.Status.AVAILABLE)
                        .isActive(true)
                        .build()))
                .toList();
        Gate gate = gateRepository.save(Gate.builder()
                .building(building)
                .gateCode("G-" + suffix)
                .gateType(Gate.GateType.ENTRY)
                .isActive(true)
                .build());
        return new TestFacility(vehicleType, gate, slots);
    }

    private Vehicle createVehicle(String username, String plate, VehicleType vehicleType) {
        User user = createUser(username);
        return vehicleRepository.save(Vehicle.builder()
                .userId(user.getUserId().longValue())
                .vehicleType(vehicleType)
                .licensePlate(plate)
                .brand("Toyota")
                .model("Vios")
                .color("Black")
                .isActive(true)
                .build());
    }

    private User createUser(String username) {
        return userRepository.save(User.builder()
                .username(username)
                .fullName(username)
                .email(username + "@example.com")
                .passwordHash("hash")
                .status(User.UserStatus.ACTIVE)
                .build());
    }

    private record TestFacility(VehicleType vehicleType, Gate gate, List<ParkingSlot> slots) {
    }

    private record Attempt(boolean success, Long slotId, Exception exception) {
    }
}

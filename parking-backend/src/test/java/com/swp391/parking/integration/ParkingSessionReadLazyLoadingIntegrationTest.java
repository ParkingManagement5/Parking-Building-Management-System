package com.swp391.parking.integration;

import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.RoleRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.repository.ZoneRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ParkingSessionReadLazyLoadingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParkingBuildingRepository buildingRepository;

    @Autowired
    private FloorRepository floorRepository;

    @Autowired
    private ZoneRepository zoneRepository;

    @Autowired
    private VehicleTypeRepository vehicleTypeRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private ParkingSlotRepository parkingSlotRepository;

    @Autowired
    private GateRepository gateRepository;

    @Autowired
    private ParkingSessionRepository sessionRepository;

    private final List<Long> sessionIds = new ArrayList<>();
    private final List<Long> slotIds = new ArrayList<>();
    private final List<Long> vehicleIds = new ArrayList<>();
    private final List<Long> gateIds = new ArrayList<>();
    private final List<Long> zoneIds = new ArrayList<>();
    private final List<Long> floorIds = new ArrayList<>();
    private final List<Long> buildingIds = new ArrayList<>();
    private final List<Long> vehicleTypeIds = new ArrayList<>();
    private final List<Integer> userIds = new ArrayList<>();

    @AfterEach
    void cleanup() {
        transactionTemplate.executeWithoutResult(status -> {
            sessionIds.forEach(sessionRepository::deleteById);
            gateIds.forEach(gateRepository::deleteById);
            slotIds.forEach(parkingSlotRepository::deleteById);
            vehicleIds.forEach(vehicleRepository::deleteById);
            zoneIds.forEach(zoneRepository::deleteById);
            floorIds.forEach(floorRepository::deleteById);
            vehicleTypeIds.forEach(vehicleTypeRepository::deleteById);
            buildingIds.forEach(buildingRepository::deleteById);
            userIds.forEach(userRepository::deleteById);
        });
        sessionIds.clear();
        slotIds.clear();
        vehicleIds.clear();
        gateIds.clear();
        zoneIds.clear();
        floorIds.clear();
        buildingIds.clear();
        vehicleTypeIds.clear();
        userIds.clear();
    }

    @Test
    @WithMockUser(username = "lazy-owner-driver", roles = "DRIVER")
    void getSession_shouldReturnOwnedSessionWithoutOuterTransaction() throws Exception {
        TestSession fixture = createCommittedSession("owner", "lazy-owner-driver");

        mockMvc.perform(get("/api/sessions/{id}", fixture.sessionId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(fixture.sessionId()))
                .andExpect(jsonPath("$.data.vehicleId").value(fixture.vehicleId()))
                .andExpect(jsonPath("$.data.licensePlate").value(fixture.licensePlate()))
                .andExpect(jsonPath("$.data.slotId").value(fixture.slotId()))
                .andExpect(jsonPath("$.data.slotCode").value(fixture.slotCode()))
                .andExpect(jsonPath("$.data.entryGateId").value(fixture.entryGateId()))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @WithMockUser(username = "lazy-non-owner-driver", roles = "DRIVER")
    void getSession_shouldReturnNotFoundForNonOwnerWithoutOuterTransaction() throws Exception {
        createCommittedUser("lazy-non-owner-driver", Role.RoleName.DRIVER);
        TestSession fixture = createCommittedSession("non-owner", "lazy-session-owner");

        mockMvc.perform(get("/api/sessions/{id}", fixture.sessionId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "lazy-staff", roles = "STAFF")
    void getSession_shouldReturnSessionForStaffWithoutOuterTransaction() throws Exception {
        createCommittedUser("lazy-staff", Role.RoleName.STAFF);
        TestSession fixture = createCommittedSession("staff", "lazy-staff-owner");

        mockMvc.perform(get("/api/sessions/{id}", fixture.sessionId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(fixture.sessionId()))
                .andExpect(jsonPath("$.data.vehicleId").value(fixture.vehicleId()))
                .andExpect(jsonPath("$.data.licensePlate").value(fixture.licensePlate()))
                .andExpect(jsonPath("$.data.slotId").value(fixture.slotId()))
                .andExpect(jsonPath("$.data.slotCode").value(fixture.slotCode()))
                .andExpect(jsonPath("$.data.entryGateId").value(fixture.entryGateId()))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @WithMockUser(username = "lazy-my-driver", roles = "DRIVER")
    void mySessions_shouldMapLazyAssociationsWithoutOuterTransaction() throws Exception {
        TestSession fixture = createCommittedSession("my", "lazy-my-driver");
        createCommittedSession("my-other", "lazy-my-other-driver");

        mockMvc.perform(get("/api/sessions/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].sessionId").value(fixture.sessionId()))
                .andExpect(jsonPath("$.data[0].vehicleId").value(fixture.vehicleId()))
                .andExpect(jsonPath("$.data[0].licensePlate").value(fixture.licensePlate()))
                .andExpect(jsonPath("$.data[0].slotId").value(fixture.slotId()))
                .andExpect(jsonPath("$.data[0].slotCode").value(fixture.slotCode()))
                .andExpect(jsonPath("$.data[0].entryGateId").value(fixture.entryGateId()))
                .andExpect(jsonPath("$.data[0].status").value("ACTIVE"));
    }

    private User createCommittedUser(String username, Role.RoleName roleName) {
        return transactionTemplate.execute(status -> {
            User user = createUser(username, roleName);
            userIds.add(user.getUserId());
            return user;
        });
    }

    private TestSession createCommittedSession(String suffix, String ownerUsername) {
        return transactionTemplate.execute(status -> {
            User owner = createUser(ownerUsername, Role.RoleName.DRIVER);
            userIds.add(owner.getUserId());

            ParkingBuilding building = ParkingBuilding.builder()
                    .name("Lazy Building " + suffix)
                    .address("Lazy Address " + suffix)
                    .phone("0900000000")
                    .email("lazy-" + suffix + "@example.com")
                    .description("Lazy loading test")
                    .openTime(LocalTime.of(6, 0))
                    .closeTime(LocalTime.of(22, 0))
                    .is24Hours(true)
                    .isActive(true)
                    .build();
            building = buildingRepository.save(building);
            buildingIds.add(building.getId());

            Floor floor = Floor.builder()
                    .building(building)
                    .floorNumber(Math.abs(suffix.hashCode()) % 10000 + 1)
                    .name("Lazy Floor " + suffix)
                    .capacity(10)
                    .isActive(true)
                    .build();
            floor = floorRepository.save(floor);
            floorIds.add(floor.getId());

            VehicleType vehicleType = VehicleType.builder()
                    .name("Lazy Car " + suffix)
                    .description("Lazy vehicle type")
                    .slotSize(VehicleType.SlotSize.MEDIUM)
                    .hourlyRate(new BigDecimal("10000"))
                    .dailyRate(new BigDecimal("70000"))
                    .isActive(true)
                    .build();
            vehicleType = vehicleTypeRepository.save(vehicleType);
            vehicleTypeIds.add(vehicleType.getId());

            Zone zone = Zone.builder()
                    .floor(floor)
                    .vehicleType(vehicleType)
                    .name("Lazy Zone " + suffix)
                    .description("Lazy zone")
                    .isActive(true)
                    .build();
            zone = zoneRepository.save(zone);
            zoneIds.add(zone.getId());

            ParkingSlot slot = ParkingSlot.builder()
                    .zone(zone)
                    .slotCode("LZ-" + Math.abs(suffix.hashCode()))
                    .slotSize(ParkingSlot.SlotSize.MEDIUM)
                    .status(ParkingSlot.Status.OCCUPIED)
                    .isActive(true)
                    .build();
            slot = parkingSlotRepository.save(slot);
            slotIds.add(slot.getId());

            Gate entryGate = Gate.builder()
                    .building(building)
                    .gateCode("LZE-" + Math.abs(suffix.hashCode()))
                    .gateType(Gate.GateType.ENTRY)
                    .isActive(true)
                    .build();
            entryGate = gateRepository.save(entryGate);
            gateIds.add(entryGate.getId());

            Vehicle vehicle = Vehicle.builder()
                    .userId(owner.getUserId().longValue())
                    .vehicleType(vehicleType)
                    .licensePlate("51Z-" + Math.abs(suffix.hashCode()))
                    .brand("Toyota")
                    .model("Vios")
                    .color("Black")
                    .isActive(true)
                    .build();
            vehicle = vehicleRepository.save(vehicle);
            vehicleIds.add(vehicle.getId());

            ParkingSession session = ParkingSession.builder()
                    .slot(slot)
                    .userId(vehicle.getUserId())
                    .vehicle(vehicle)
                    .entryGate(entryGate)
                    .entryTime(LocalDateTime.of(2026, 6, 19, 10, 0))
                    .entryMode(ParkingSession.EntryMode.WALK_IN_AUTO)
                    .status(ParkingSession.SessionStatus.ACTIVE)
                    .build();
            session = sessionRepository.save(session);
            sessionIds.add(session.getId());

            return new TestSession(session.getId(), vehicle.getId(), vehicle.getLicensePlate(),
                    slot.getId(), slot.getSlotCode(), entryGate.getId());
        });
    }

    private User createUser(String username, Role.RoleName roleName) {
        Role role = roleRepository.findByRoleName(roleName)
                .orElseGet(() -> roleRepository.save(Role.builder().roleName(roleName).build()));
        return userRepository.save(User.builder()
                .username(username)
                .fullName(username + " Fullname")
                .email(username + "@example.com")
                .phone("0900000000")
                .passwordHash(passwordEncoder.encode("password"))
                .status(User.UserStatus.ACTIVE)
                .roles(Set.of(role))
                .build());
    }

    private record TestSession(Long sessionId, Long vehicleId, String licensePlate,
                               Long slotId, String slotCode, Long entryGateId) {
    }
}

package com.swp391.parking.support;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.Notification;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.Shift;
import com.swp391.parking.entity.StaffShift;
import com.swp391.parking.entity.SystemConfig;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.NotificationRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.PricingPolicyRepository;
import com.swp391.parking.repository.RoleRepository;
import com.swp391.parking.repository.ShiftRepository;
import com.swp391.parking.repository.StaffShiftRepository;
import com.swp391.parking.repository.SystemConfigRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.repository.ZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class AbstractIntegrationTestSupport {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    @Autowired
    protected ParkingBuildingRepository buildingRepository;

    @Autowired
    protected BookingRepository bookingRepository;

    @Autowired
    protected FloorRepository floorRepository;

    @Autowired
    protected GateRepository gateRepository;

    @Autowired
    protected ZoneRepository zoneRepository;

    @Autowired
    protected ParkingSlotRepository parkingSlotRepository;

    @Autowired
    protected VehicleTypeRepository vehicleTypeRepository;

    @Autowired
    protected VehicleRepository vehicleRepository;

    @Autowired
    protected NotificationRepository notificationRepository;

    @Autowired
    protected PricingPolicyRepository pricingPolicyRepository;

    @Autowired
    protected ShiftRepository shiftRepository;

    @Autowired
    protected StaffShiftRepository staffShiftRepository;

    @Autowired
    protected SystemConfigRepository systemConfigRepository;

    @Autowired
    protected UserRepository userRepository;

    @Autowired
    protected RoleRepository roleRepository;

    protected String json(Object value) throws JsonProcessingException {
        return objectMapper.writeValueAsString(value);
    }

    protected Role createRole(Role.RoleName roleName) {
        return roleRepository.findByRoleName(roleName)
            .orElseGet(() -> roleRepository.save(Role.builder().roleName(roleName).build()));
    }

    protected User createUser(String username, Role.RoleName roleName) {
        Role role = createRole(roleName);
        User user = User.builder()
            .username(username)
            .fullName(username + " Fullname")
            .email(username + "@example.com")
            .phone("0900000000")
            .passwordHash(passwordEncoder.encode("password"))
            .status(User.UserStatus.ACTIVE)
            .roles(Set.of(role))
            .build();
        return userRepository.save(user);
    }

    protected ParkingBuilding createBuilding(String name) {
        ParkingBuilding building = ParkingBuilding.builder()
            .name(name)
            .address(name + " Address")
            .phone("0123456789")
            .email(name.toLowerCase().replace(" ", "") + "@example.com")
            .description("Test building")
            .openTime(LocalTime.of(6, 0))
            .closeTime(LocalTime.of(22, 0))
            .status(ParkingBuilding.Status.ACTIVE)
            .isActive(true)
            .build();
        return buildingRepository.save(building);
    }

    protected Floor createFloor(ParkingBuilding building, int floorNumber) {
        Floor floor = Floor.builder()
            .building(building)
            .floorNumber(floorNumber)
            .name("Floor " + floorNumber)
            .capacity(20)
            .status(Floor.Status.ACTIVE)
            .isActive(true)
            .build();
        return floorRepository.save(floor);
    }

    protected VehicleType createVehicleType(String name, VehicleType.SlotSize slotSize) {
        VehicleType vehicleType = VehicleType.builder()
            .name(name)
            .description(name + " description")
            .slotSize(slotSize)
            .hourlyRate(new BigDecimal("10000"))
            .dailyRate(new BigDecimal("70000"))
            .isActive(true)
            .build();
        return vehicleTypeRepository.save(vehicleType);
    }

    protected Zone createZone(Floor floor, VehicleType vehicleType, String name) {
        Zone zone = Zone.builder()
            .floor(floor)
            .vehicleType(vehicleType)
            .name(name)
            .description(name + " description")
            .status(Zone.Status.ACTIVE)
            .isActive(true)
            .build();
        return zoneRepository.save(zone);
    }

    protected ParkingSlot createSlot(Zone zone, String slotCode, ParkingSlot.Status status) {
        ParkingSlot slot = ParkingSlot.builder()
            .zone(zone)
            .slotCode(slotCode)
            .slotSize(ParkingSlot.SlotSize.MEDIUM)
            .status(status)
            .isActive(true)
            .build();
        return parkingSlotRepository.save(slot);
    }

    protected Gate createGate(ParkingBuilding building, String gateCode, Gate.GateType gateType) {
        Gate gate = Gate.builder()
            .building(building)
            .gateCode(gateCode)
            .gateType(gateType)
            .isActive(true)
            .build();
        return gateRepository.save(gate);
    }

    protected Vehicle createVehicle(User user, VehicleType vehicleType, String licensePlate) {
        Vehicle vehicle = Vehicle.builder()
            .userId(user.getUserId().longValue())
            .vehicleType(vehicleType)
            .licensePlate(licensePlate)
            .brand("Toyota")
            .model("Vios")
            .color("Black")
            .isActive(true)
            .build();
        return vehicleRepository.save(vehicle);
    }

    protected Notification createNotification(User user, String title, boolean isRead) {
        Notification notification = Notification.builder()
            .user(user)
            .title(title)
            .body("Body")
            .type("INFO")
            .entityType("BOOKING")
            .entityId(1)
            .isRead(isRead)
            .createdAt(LocalDateTime.now())
            .build();
        return notificationRepository.save(notification);
    }

    protected PricingPolicy createPricingPolicy(VehicleType vehicleType, boolean isActive) {
        PricingPolicy policy = PricingPolicy.builder()
            .vehicleType(vehicleType)
            .dayType("WEEKDAY")
            .timeType("DAY")
            .startHour(6)
            .endHour(18)
            .pricePerHour(new BigDecimal("15000"))
            .isActive(isActive)
            .build();
        return pricingPolicyRepository.save(policy);
    }

    protected Shift createShift(String name) {
        Shift shift = Shift.builder()
            .shiftName(name)
            .startTime(LocalTime.of(8, 0))
            .endTime(LocalTime.of(16, 0))
            .status("ACTIVE")
            .build();
        return shiftRepository.save(shift);
    }

    protected StaffShift createStaffShift(User user, Shift shift, LocalDate workingDate) {
        StaffShift staffShift = StaffShift.builder()
            .user(user)
            .shift(shift)
            .workingDate(workingDate)
            .build();
        return staffShiftRepository.save(staffShift);
    }

    protected SystemConfig createSystemConfig(String key, User updatedBy) {
        SystemConfig config = SystemConfig.builder()
            .configKey(key)
            .configValue("value")
            .description("description")
            .updatedBy(updatedBy)
            .updatedAt(LocalDateTime.now())
            .build();
        return systemConfigRepository.save(config);
    }
}

package com.swp391.parking.integration;

import com.swp391.parking.dto.request.AssignStaffShiftRequest;
import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.dto.request.GateRequest;
import com.swp391.parking.dto.request.SendNotificationRequest;
import com.swp391.parking.dto.request.ShiftRequest;
import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.dto.request.SystemConfigRequest;
import com.swp391.parking.dto.request.VehicleRequest;
import com.swp391.parking.dto.request.VehicleTypeRequest;
import com.swp391.parking.dto.request.ZoneRequest;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.Shift;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WithMockUser(username = "admin1", roles = "ADMIN")
class ControllerIntegrationTest extends AbstractIntegrationTestSupport {

    // @WithMockUser chi gia lap security context, khong tao user that trong DB.
    // Mot so endpoint (vd FloorController.getByBuilding) tra cuu user that theo
    // ten dang nhap de resolve staff scope - can co ban ghi that de tranh 401.
    @BeforeEach
    void ensureMockAdminUserExists() {
        if (userRepository.findByUsername("admin1").isEmpty()) {
            createUser("admin1", Role.RoleName.ADMIN);
        }
    }

    @Test
    void buildingControllerShouldCreateBuilding() throws Exception {
        BuildingRequest request = BuildingRequest.builder()
            .name("Controller Tower")
            .address("1 API Street")
            .openTime(LocalTime.of(6, 0))
            .closeTime(LocalTime.of(21, 0))
            .build();

        mockMvc.perform(post("/api/v1/parking-buildings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.name").value("Controller Tower"));
    }

    @Test
    void floorControllerShouldCreateAndGetByBuilding() throws Exception {
        ParkingBuilding building = createBuilding("Floor Tower");
        FloorRequest request = FloorRequest.builder()
            .buildingId(building.getId())
            .floorNumber(1)
            .name("Ground Floor")
            .capacity(80)
            .build();

        mockMvc.perform(post("/api/v1/floors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Ground Floor"));

        mockMvc.perform(get("/api/v1/floors/building/{buildingId}", building.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].floorNumber").value(1));
    }

    @Test
    void gateControllerShouldCreateAndFilterByType() throws Exception {
        ParkingBuilding building = createBuilding("Gate Tower");
        GateRequest request = GateRequest.builder()
            .buildingId(building.getId())
            .gateCode("GT-01")
            .gateType(Gate.GateType.ENTRY)
            .build();

        mockMvc.perform(post("/api/v1/gates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.gateCode").value("GT-01"));

        mockMvc.perform(get("/api/v1/gates/by-type")
                .param("buildingId", building.getId().toString())
                .param("gateType", Gate.GateType.ENTRY.name()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].gateCode").value("GT-01"));
    }

    @Test
    void vehicleTypeControllerShouldCreateAndList() throws Exception {
        VehicleTypeRequest request = VehicleTypeRequest.builder()
            .name("Controller Car")
            .description("Car type")
            .slotSize(VehicleType.SlotSize.MEDIUM)
            .hourlyRate(new BigDecimal("11000"))
            .dailyRate(new BigDecimal("75000"))
            .build();

        mockMvc.perform(post("/api/v1/vehicle-types")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Controller Car"));

        mockMvc.perform(get("/api/v1/vehicle-types"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].name").value("Controller Car"));
    }

    @Test
    void zoneControllerShouldCreateAndGetByFloor() throws Exception {
        ParkingBuilding building = createBuilding("Zone Tower");
        Floor floor = createFloor(building, 2);
        VehicleType vehicleType = createVehicleType("Zone Car", VehicleType.SlotSize.MEDIUM);
        ZoneRequest request = ZoneRequest.builder()
            .floorId(floor.getId())
            .vehicleTypeId(vehicleType.getId())
            .name("Zone A")
            .description("Zone controller")
            .build();

        mockMvc.perform(post("/api/v1/zones")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.name").value("Zone A"));

        mockMvc.perform(get("/api/v1/zones/floor/{floorId}", floor.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].name").value("Zone A"));
    }

    @Test
    void parkingSlotControllerShouldCreateAndSearchAvailable() throws Exception {
        ParkingBuilding building = createBuilding("Slot Tower");
        Floor floor = createFloor(building, 3);
        VehicleType vehicleType = createVehicleType("Slot Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Slot Zone");
        SlotRequest request = SlotRequest.builder()
            .zoneId(zone.getId())
            .slotCode("SL-01")
            .slotSize(ParkingSlot.SlotSize.MEDIUM)
            .build();

        mockMvc.perform(post("/api/v1/slots")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.slotCode").value("SL-01"));

        mockMvc.perform(get("/api/v1/slots/search")
                .param("buildingId", building.getId().toString())
                .param("vehicleTypeId", vehicleType.getId().toString())
                .param("floorId", floor.getId().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].slotCode").value("SL-01"));
    }

    @Test
    @WithMockUser(username = "driver-http", roles = "DRIVER")
    void vehicleControllerShouldCreateAndListCurrentUsersVehicles() throws Exception {
        createUser("driver-http", Role.RoleName.DRIVER);
        VehicleType vehicleType = createVehicleType("Driver Car", VehicleType.SlotSize.MEDIUM);
        VehicleRequest request = VehicleRequest.builder()
            .vehicleTypeId(vehicleType.getId())
            .licensePlate("59A-12345")
            .brand("Ford")
            .model("Focus")
            .color("Blue")
            .build();

        mockMvc.perform(post("/api/v1/vehicles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.licensePlate").value("59A-123.45"));

        mockMvc.perform(get("/api/v1/vehicles/my"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].licensePlate").value("59A-123.45"));
    }

    @Test
    @WithMockUser(username = "driver-booking", roles = "DRIVER")
    void bookingControllerShouldReturnCurrentUsersBookings() throws Exception {
        User driver = createUser("driver-booking", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Booking Tower");
        Floor floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Booking Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Booking Zone");
        ParkingSlot slot = createSlot(zone, "BK-01", ParkingSlot.Status.AVAILABLE);
        var vehicle = createVehicle(driver, vehicleType, "77A-12345");

        bookingRepository.save(Booking.builder()
            .userId(driver.getUserId().longValue())
            .vehicle(vehicle)
            .slot(slot)
            .bookingStartTime(LocalDateTime.now().plusHours(1))
            .bookingEndTime(LocalDateTime.now().plusHours(3))
            .reservedAt(LocalDateTime.now())
            .expiredAt(LocalDateTime.now().plusMinutes(15))
            .depositAmount(BigDecimal.ZERO)
            .status(Booking.BookingStatus.PENDING_PAYMENT)
            .build());

        mockMvc.perform(get("/api/bookings/my"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[0].licensePlate").value("77A-12345"))
            .andExpect(jsonPath("$.data[0].slotCode").value("BK-01"))
            .andExpect(jsonPath("$.data[0].status").value("PENDING_PAYMENT"));
    }

    @Test
    void notificationControllerShouldSendFetchAndMarkRead() throws Exception {
        User user = createUser("notify-http", Role.RoleName.DRIVER);
        SendNotificationRequest request = SendNotificationRequest.builder()
            .userId(user.getUserId().longValue())
            .title("Ping")
            .body("Hello")
            .type("INFO")
            .build();

        mockMvc.perform(post("/api/v1/notifications")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.title").value("Ping"))
            .andExpect(jsonPath("$.data.isRead").value(false));

        Long notificationId = notificationRepository.findAll().get(0).getNotificationId();

        mockMvc.perform(get("/api/v1/notifications/user/{userId}", user.getUserId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].title").value("Ping"));

        mockMvc.perform(patch("/api/v1/notifications/{id}/read", notificationId))
            .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "manager-pricing", roles = "MANAGER")
    void pricingPolicyControllerShouldCreateAndActivatePolicy() throws Exception {
        // Manager toan quyen tu cau hinh gia rieng cho toa nha minh quan ly.
        User manager = createUser("manager-pricing", Role.RoleName.MANAGER);
        ParkingBuilding building = createBuilding("Pricing Controller Tower");
        assignBuilding(manager, building);
        VehicleType vehicleType = createVehicleType("Pricing Car", VehicleType.SlotSize.MEDIUM);
        CreatePricingPolicyRequest request = new CreatePricingPolicyRequest();
        request.setVehicleTypeId(vehicleType.getId());
        request.setDayType("WEEKDAY");
        request.setTimeType("DAY");
        request.setStartHour(7);
        request.setEndHour(19);
        request.setPricePerHour(new BigDecimal("25000"));
        request.setIsActive(false);

        mockMvc.perform(post("/api/v1/pricing")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.vehicleTypeId").value(vehicleType.getId()))
            .andExpect(jsonPath("$.data.isActive").value(false));

        Long policyId = pricingPolicyRepository.findAll().get(0).getPolicyId();

        mockMvc.perform(patch("/api/v1/pricing/{id}/activate", policyId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.isActive").value(true));
    }

    @Test
    void shiftControllerShouldCreateAndDeleteShift() throws Exception {
        ShiftRequest request = ShiftRequest.builder()
            .shiftName("Night Shift")
            .startTime(LocalTime.of(22, 0))
            .endTime(LocalTime.of(6, 0))
            .build();

        mockMvc.perform(post("/api/v1/shifts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.shiftName").value("Night Shift"));

        Long shiftId = shiftRepository.findAll().get(0).getShiftId();

        mockMvc.perform(delete("/api/v1/shifts/{id}", shiftId))
            .andExpect(status().isNoContent());
    }

    @Test
    void staffShiftControllerShouldAssignAndFilterByDate() throws Exception {
        User staff = createUser("staff-http", Role.RoleName.STAFF);
        Shift shift = createShift("Morning Controller");
        AssignStaffShiftRequest request = AssignStaffShiftRequest.builder()
            .userId(staff.getUserId().longValue())
            .shiftId(shift.getShiftId())
            .workingDate(LocalDate.of(2026, 6, 20))
            .build();

        mockMvc.perform(post("/api/v1/staff-shifts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value(staff.getUserId()));

        mockMvc.perform(get("/api/v1/staff-shifts/date/{workingDate}", "2026-06-20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].shiftName").value("Morning Controller"));
    }

    @Test
    void systemConfigControllerShouldCreateAndFetchByKey() throws Exception {
        User admin = createUser("config-http", Role.RoleName.ADMIN);
        SystemConfigRequest request = SystemConfigRequest.builder()
            .configKey("MAX_DAILY_BOOKINGS")
            .configValue("5")
            .description("Daily booking cap")
            .build();

        mockMvc.perform(post("/api/v1/system-configs")
                .param("updatedBy", admin.getUserId().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.configKey").value("MAX_DAILY_BOOKINGS"));

        mockMvc.perform(get("/api/v1/system-configs/key/{configKey}", "MAX_DAILY_BOOKINGS"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.configValue").value("5"));
    }
}

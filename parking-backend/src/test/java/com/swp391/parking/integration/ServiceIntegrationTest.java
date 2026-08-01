package com.swp391.parking.integration;

import com.swp391.parking.dto.request.AssignStaffShiftRequest;
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
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.Shift;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.service.BuildingService;
import com.swp391.parking.service.FloorService;
import com.swp391.parking.service.GateService;
import com.swp391.parking.service.NotificationService;
import com.swp391.parking.service.ParkingSlotService;
import com.swp391.parking.service.PricingPolicyService;
import com.swp391.parking.service.ShiftService;
import com.swp391.parking.service.StaffShiftService;
import com.swp391.parking.service.SystemConfigService;
import com.swp391.parking.service.VehicleService;
import com.swp391.parking.service.VehicleTypeService;
import com.swp391.parking.service.ZoneService;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServiceIntegrationTest extends AbstractIntegrationTestSupport {

    @Autowired
    private BuildingService buildingService;

    @Autowired
    private FloorService floorService;

    @Autowired
    private GateService gateService;

    @Autowired
    private VehicleTypeService vehicleTypeService;

    @Autowired
    private ZoneService zoneService;

    @Autowired
    private ParkingSlotService parkingSlotService;

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PricingPolicyService pricingPolicyService;

    @Autowired
    private ShiftService shiftService;

    @Autowired
    private StaffShiftService staffShiftService;

    @Autowired
    private SystemConfigService systemConfigService;

    @Test
    void buildingServiceShouldDeleteNestedDataAndGates() {
        // Dung helper createBuilding (insert thang qua repo, khong qua
        // BuildingServiceImpl.create) de tranh dung do voi tang 1/2 ma
        // scaffoldStandardLayout tu dong sinh khi goi buildingService.create
        // that (xem BuildingServiceImpl) — test nay chi kiem tra deactivate()
        // xoa dung cascade, khong lien quan toi hanh vi tu sinh cau truc.
        ParkingBuilding building = createBuilding("Tower A");

        Floor floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Car-A", VehicleType.SlotSize.MEDIUM);
        Zone zone = createZone(floor, vehicleType, "A1");
        createSlot(zone, "S-A1", ParkingSlot.Status.AVAILABLE);
        createGate(building, "GA-1", Gate.GateType.ENTRY);

        buildingService.deactivate(building.getId(), null);

        // Deactivate gio la vo hieu hoa mem (khong con xoa cung) — du lieu van
        // con nguyen, chi isActive chuyen ve false, tranh vo booking/session
        // lich su tham chieu toi cac ban ghi nay.
        assertFalse(buildingRepository.findById(building.getId()).orElseThrow().getIsActive());
        assertFalse(gateRepository.findByBuildingId(building.getId()).get(0).getIsActive());
        assertFalse(floorRepository.findByBuildingId(building.getId()).get(0).getIsActive());
        assertFalse(zoneRepository.findByFloorId(floor.getId()).get(0).getIsActive());
        assertFalse(parkingSlotRepository.findByZoneId(zone.getId()).get(0).getIsActive());
    }

    @Test
    void floorServiceShouldCreateUpdateAndDeleteZoneTree() {
        ParkingBuilding building = createBuilding("Tower B");

        Floor created = floorService.create(FloorRequest.builder()
            .buildingId(building.getId())
            .floorNumber(2)
            .name("Floor 2")
            .capacity(50)
            .build(), null);

        Floor updated = floorService.update(created.getId(), FloorRequest.builder()
            .buildingId(building.getId())
            .floorNumber(2)
            .name("Floor 2 Updated")
            .capacity(70)
            .status(Floor.Status.MAINTENANCE)
            .build(), null);

        VehicleType vehicleType = createVehicleType("Car-B", VehicleType.SlotSize.MEDIUM);
        Zone zone = createZone(updated, vehicleType, "B1");
        createSlot(zone, "S-B1", ParkingSlot.Status.AVAILABLE);

        floorService.deactivate(updated.getId(), null);

        assertEquals("Floor 2 Updated", updated.getName());
        assertEquals(Floor.Status.MAINTENANCE, updated.getStatus());
        // Vo hieu hoa mem — giu nguyen du lieu, chi isActive=false.
        assertFalse(floorRepository.findById(updated.getId()).orElseThrow().getIsActive());
        assertFalse(zoneRepository.findByFloorId(updated.getId()).get(0).getIsActive());
        assertFalse(parkingSlotRepository.findByZoneId(zone.getId()).get(0).getIsActive());
    }

    @Test
    void gateServiceShouldCreateUpdateAndFilter() {
        ParkingBuilding building = createBuilding("Tower C");

        Gate created = gateService.create(GateRequest.builder()
            .buildingId(building.getId())
            .gateCode("GATE-C1")
            .gateType(Gate.GateType.ENTRY)
            .build());

        Gate updated = gateService.update(created.getId(), GateRequest.builder()
            .buildingId(building.getId())
            .gateCode("GATE-C2")
            .gateType(Gate.GateType.BOTH)
            .build());

        assertEquals(1, gateService.getByBuilding(building.getId()).size());
        assertEquals(1, gateService.getActiveByBuilding(building.getId()).size());
        assertEquals(1, gateService.getByBuildingAndType(building.getId(), Gate.GateType.BOTH).size());
        assertEquals("GATE-C2", updated.getGateCode());
    }

    @Test
    void vehicleTypeServiceShouldCreateUpdateAndDeleteLinkedData() {
        VehicleType vehicleType = vehicleTypeService.create(VehicleTypeRequest.builder()
            .name("SUV")
            .description("Sport utility")
            .slotSize(VehicleType.SlotSize.LARGE)
            .hourlyRate(new BigDecimal("20000"))
            .dailyRate(new BigDecimal("120000"))
            .build());

        User driver = createUser("driver-linked", Role.RoleName.DRIVER);
        createVehicle(driver, vehicleType, "51A-88888");
        ParkingBuilding building = createBuilding("Tower D");
        Floor floor = createFloor(building, 3);
        Zone zone = createZone(floor, vehicleType, "D1");
        createSlot(zone, "S-D1", ParkingSlot.Status.AVAILABLE);

        vehicleTypeService.deactivate(vehicleType.getId());

        VehicleType deactivated = vehicleTypeRepository.findById(vehicleType.getId()).orElse(null);
        assertNotNull(deactivated);
        assertFalse(deactivated.getIsActive());
    }

    @Test
    void zoneServiceShouldCreateUpdateAndDeleteSlots() {
        ParkingBuilding building = createBuilding("Tower E");
        Floor floor = createFloor(building, 4);
        VehicleType vehicleType = createVehicleType("Motorbike-E", VehicleType.SlotSize.SMALL);

        Zone created = zoneService.create(ZoneRequest.builder()
            .floorId(floor.getId())
            .vehicleTypeId(vehicleType.getId())
            .name("E1")
            .description("Original")
            .build(), null);

        Zone updated = zoneService.update(created.getId(), ZoneRequest.builder()
            .floorId(floor.getId())
            .vehicleTypeId(vehicleType.getId())
            .name("E1 Updated")
            .description("Updated")
            .status(Zone.Status.MAINTENANCE)
            .build(), null);

        ParkingSlot slot = createSlot(updated, "S-E1", ParkingSlot.Status.AVAILABLE);
        zoneService.deactivate(updated.getId(), null);

        assertEquals("E1 Updated", updated.getName());
        assertEquals(Zone.Status.MAINTENANCE, updated.getStatus());
        // Vo hieu hoa mem — giu nguyen du lieu, chi isActive=false.
        assertFalse(zoneRepository.findById(updated.getId()).orElseThrow().getIsActive());
        assertFalse(parkingSlotRepository.findById(slot.getId()).orElseThrow().getIsActive());
    }

    @Test
    void parkingSlotServiceShouldSearchValidateAndDelete() {
        ParkingBuilding building = createBuilding("Tower F");
        Floor floor = createFloor(building, 5);
        VehicleType vehicleType = createVehicleType("Car-F", VehicleType.SlotSize.MEDIUM);
        Zone zone = createZone(floor, vehicleType, "F1");

        ParkingSlot created = parkingSlotService.create(SlotRequest.builder()
            .zoneId(zone.getId())
            .slotCode("S-F1")
            .slotSize(ParkingSlot.SlotSize.MEDIUM)
            .build(), null);

        assertEquals(1, parkingSlotService.getByZone(zone.getId()).size());
        assertEquals(1, parkingSlotService.getAvailableByVehicleType(vehicleType.getId()).size());
        assertEquals(1, parkingSlotService.searchAvailableSlots(building.getId(), vehicleType.getId(), floor.getId()).size());
        assertDoesNotThrow(() -> parkingSlotService.validateSelectable(created.getId()));

        parkingSlotService.updateStatus(created.getId(), ParkingSlot.Status.MAINTENANCE);

        assertThrows(AppException.class, () -> parkingSlotService.validateSelectable(created.getId()));

        parkingSlotService.delete(created.getId(), null);
        // Vo hieu hoa mem — giu nguyen du lieu, chi isActive=false.
        assertFalse(parkingSlotRepository.findById(created.getId()).orElseThrow().getIsActive());
    }

    @Test
    void vehicleServiceShouldCreateUpdateLookupAndDelete() {
        User driver = createUser("driver-service", Role.RoleName.DRIVER);
        VehicleType vehicleType = createVehicleType("Car-G", VehicleType.SlotSize.MEDIUM);

        Vehicle created = vehicleService.create(driver.getUserId(), VehicleRequest.builder()
            .vehicleTypeId(vehicleType.getId())
            .licensePlate("51G-12345")
            .brand("Honda")
            .model("City")
            .color("White")
            .build());

        Vehicle updated = vehicleService.update(created.getId(), VehicleRequest.builder()
            .vehicleTypeId(vehicleType.getId())
            .licensePlate("51G-12345")
            .brand("Mazda")
            .model("3")
            .color("Red")
            .build());

        assertEquals(1, vehicleService.getByUser(driver.getUserId()).size());
        assertEquals("51G-123.45", vehicleService.getByLicensePlate("51G-12345").getLicensePlate());
        assertEquals("Mazda", updated.getBrand());

        vehicleService.deactivate(created.getId());
        assertTrue(vehicleRepository.findById(created.getId()).orElseThrow().getIsActive().equals(false));
    }

    @Test
    void notificationServiceShouldSendFetchAndMarkRead() {
        User user = createUser("notify-user", Role.RoleName.DRIVER);

        var created = notificationService.sendNotification(SendNotificationRequest.builder()
            .userId(user.getUserId().longValue())
            .title("Welcome")
            .body("Body")
            .type("INFO")
            .entityType("BOOKING")
            .entityId(10)
            .build());

        assertFalse(created.getIsRead());
        assertEquals(1, notificationService.getNotifications(user.getUserId().longValue()).size());

        notificationService.markAsRead(created.getNotificationId(), null, true);
        assertTrue(notificationRepository.findById(created.getNotificationId()).orElseThrow().getIsRead());

        var second = notificationService.sendNotification(SendNotificationRequest.builder()
            .userId(user.getUserId().longValue())
            .title("Reminder")
            .body("Body 2")
            .build());
        notificationService.markAllAsRead(user.getUserId().longValue());

        assertTrue(notificationRepository.findById(second.getNotificationId()).orElseThrow().getIsRead());
    }

    @Test
    void pricingPolicyServiceShouldCompleteCrudFlow() {
        VehicleType vehicleType = createVehicleType("Car-H", VehicleType.SlotSize.MEDIUM);
        CreatePricingPolicyRequest request = new CreatePricingPolicyRequest();
        request.setVehicleTypeId(vehicleType.getId());
        request.setDayType("WEEKEND");
        request.setTimeType("NIGHT");
        request.setStartHour(18);
        request.setEndHour(23);
        request.setPricePerHour(new BigDecimal("30000"));
        request.setIsActive(false);

        var created = pricingPolicyService.createPolicy(request, null);
        assertFalse(created.getIsActive());
        assertEquals(1, pricingPolicyService.getAllPolicies(null).size());

        request.setPricePerHour(new BigDecimal("35000"));
        var updated = pricingPolicyService.updatePolicy(created.getPolicyId(), request, null);
        var activated = pricingPolicyService.activatePolicy(created.getPolicyId(), null);

        assertEquals(new BigDecimal("35000"), updated.getPricePerHour());
        assertTrue(activated.getIsActive());

        pricingPolicyService.deletePolicy(created.getPolicyId(), null);
        var afterDelete = pricingPolicyRepository.findById(created.getPolicyId());
        assertTrue(afterDelete.isPresent(), "Delete should soft-deactivate, not hard-delete, to preserve historical pricing");
        assertFalse(afterDelete.get().getIsActive());
    }

    @Test
    void shiftServiceShouldCompleteCrudFlow() {
        ShiftRequest request = ShiftRequest.builder()
            .shiftName("Morning")
            .startTime(LocalTime.of(6, 0))
            .endTime(LocalTime.of(14, 0))
            .build();

        var created = shiftService.createShift(request);
        assertEquals("ACTIVE", created.getStatus());
        assertEquals(1, shiftService.getAllShifts().size());

        request.setStatus("INACTIVE");
        var updated = shiftService.updateShift(created.getShiftId(), request);
        assertEquals("INACTIVE", updated.getStatus());

        shiftService.deleteShift(created.getShiftId());
        // Vo hieu hoa mem (status=INACTIVE) — giu nguyen du lieu vi staff_shift
        // co the da tham chieu shift_id nay.
        assertEquals("INACTIVE", shiftRepository.findById(created.getShiftId()).orElseThrow().getStatus());
    }

    @Test
    void staffShiftServiceShouldAssignQueryUpdateAndDelete() {
        User staff = createUser("staff-service", Role.RoleName.STAFF);
        Shift shiftOne = createShift("Shift 1");
        Shift shiftTwo = createShift("Shift 2");

        var created = staffShiftService.assignShift(AssignStaffShiftRequest.builder()
            .userId(staff.getUserId().longValue())
            .shiftId(shiftOne.getShiftId())
            .workingDate(LocalDate.of(2026, 6, 14))
            .build());

        assertEquals(1, staffShiftService.getByUser(staff.getUserId().longValue()).size());
        assertEquals(1, staffShiftService.getByWorkingDate(LocalDate.of(2026, 6, 14)).size());

        var updated = staffShiftService.updateStaffShift(created.getStaffShiftId(), AssignStaffShiftRequest.builder()
            .userId(staff.getUserId().longValue())
            .shiftId(shiftTwo.getShiftId())
            .workingDate(LocalDate.of(2026, 6, 15))
            .build());

        assertEquals(shiftTwo.getShiftId(), updated.getShiftId());

        staffShiftService.deleteStaffShift(created.getStaffShiftId());
        // Vo hieu hoa mem (isActive=false) — giu lai lich su check-in/check-out
        // neu ca da dien ra, chi an khoi danh sach dang hoat dong (xem
        // getByUser/getByWorkingDate da loc isActive o tren).
        assertFalse(staffShiftRepository.findById(created.getStaffShiftId()).orElseThrow().getIsActive());
        assertEquals(0, staffShiftService.getByUser(staff.getUserId().longValue()).size());
    }

    @Test
    void systemConfigServiceShouldCompleteCrudFlow() {
        User admin = createUser("admin-service", Role.RoleName.ADMIN);
        SystemConfigRequest request = SystemConfigRequest.builder()
            .configKey("MAX_BOOKING_HOURS")
            .configValue("8")
            .description("Booking limit")
            .build();

        var created = systemConfigService.create(request, admin.getUserId());
        assertEquals("MAX_BOOKING_HOURS", created.getConfigKey());
        assertEquals(created.getConfigId(), systemConfigService.getByKey("MAX_BOOKING_HOURS").getConfigId());

        request.setConfigValue("10");
        var updated = systemConfigService.update(created.getConfigId(), request, admin.getUserId());
        assertEquals("10", updated.getConfigValue());
        assertEquals(1, systemConfigService.getAll().size());

        systemConfigService.delete(created.getConfigId());
        assertTrue(systemConfigRepository.findById(created.getConfigId()).isEmpty());
    }
}

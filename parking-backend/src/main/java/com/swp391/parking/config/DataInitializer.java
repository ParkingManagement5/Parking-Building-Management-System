package com.swp391.parking.config;

import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.entity.SystemConfig;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.SystemConfigRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

// Chi seed du lieu demo cho DB that (dev/prod). Khong chay o profile "test" vi
// DB test (H2) khoi tao rong hoan toan moi lan chay - cac test class tu dung
// AbstractIntegrationTestSupport de tao fixture rieng cho tung test.
@Configuration
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final String[] STAFF_TEST_PLATES = {
            "30K-550.55",
            "38A-666.66",
            "59G2-67890"
    };

    private static final List<String> ZONE_SUFFIXES = List.of("A", "B", "C", "D", "E", "F");
    private static final int FLOOR_COUNT = 2;
    private static final int SLOT_COUNT_PER_ZONE = 6;

    // Ten/dia chi/mo ta viet dung dau tieng Viet bang unicode escape (thay vi
    // go dau truc tiep) vi platform dang compile bang Cp1252 chu khong phai UTF-8
    // (pom.xml chua khai bao sourceEncoding) - escape la ASCII thuan nen doc
    // dung bat ke encoding nao, tranh bi mojibake nhu vai cho khac trong repo.
    // Chi con 4 building chinh thuc dung cho demo (da bo 9 building phu -
    // Pi Pink/Tao Dan/Landmark 81/Phu My Hung/Cong Hoa/Go Vap/Aeon Tan Phu/
    // Binh Tan Hub/Sala Thu Thiem - de tranh bi tu dong tai tao moi lan app
    // khoi dong, dung dung 4 toa nha that su duoc dung: FPT HCM, Ben Bach
    // Dang, Le Van Tam, Tan Son Nhat).
    private static final List<BuildingSeed> HCMC_BUILDINGS = List.of(
            new BuildingSeed("B\u00e3i xe FPT HCM", "L\u00f4 E2a-7, \u0110\u01b0\u1eddng D1, Long Th\u1ea1nh M\u1ef9, Th\u1ee7 \u0110\u1ee9c, TP.HCM", "0900000010", "parking@fpt.edu.vn", "B\u00e3i \u0111\u1ed7 xe demo 2 t\u1ea7ng \u00f4 t\u00f4 t\u1ea1i khu FPT HCM", 10.8413, 106.8098, "FPTHCM"),
            new BuildingSeed("B\u00e3i xe B\u1ebfn B\u1ea1ch \u0110\u1eb1ng", "T\u00f4n \u0110\u1ee9c Th\u1eafng, B\u1ebfn Ngh\u00e9, Qu\u1eadn 1, TP.HCM", "0900000012", "bachdang@parking.vn", "B\u00e3i \u0111\u1ed7 xe \u00f4 t\u00f4 g\u1ea7n ph\u1ed1 \u0111i b\u1ed9 Nguy\u1ec5n Hu\u1ec7", 10.7729, 106.7053, "BACHDANG"),
            new BuildingSeed("B\u00e3i xe L\u00ea V\u0103n T\u00e1m", "Hai B\u00e0 Tr\u01b0ng, \u0110a Kao, Qu\u1eadn 1, TP.HCM", "0900000014", "levantam@parking.vn", "B\u00e3i \u0111\u1ed7 xe \u00f4 t\u00f4 g\u1ea7n c\u00f4ng vi\u00ean L\u00ea V\u0103n T\u00e1m", 10.7873, 106.7001, "LEVANTAM"),
            new BuildingSeed("B\u00e3i xe T\u00e2n S\u01a1n Nh\u1ea5t", "Tr\u01b0\u1eddng S\u01a1n, Ph\u01b0\u1eddng 2, T\u00e2n B\u00ecnh, TP.HCM", "0900000016", "tsn@parking.vn", "B\u00e3i \u0111\u1ed7 xe \u00f4 t\u00f4 g\u1ea7n s\u00e2n bay T\u00e2n S\u01a1n Nh\u1ea5t", 10.8128, 106.6668, "TSN")
    );

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final ParkingBuildingRepository parkingBuildingRepository;
    private final FloorRepository floorRepository;
    private final ZoneRepository zoneRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final GateRepository gateRepository;
    private final SystemConfigRepository systemConfigRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seedSystemConfigs();
        seedParkingBuildingsAndLayouts();
        seedStaffTestVehicles();
    }

    private void seedSystemConfigs() {
        ensureConfig("GRACE_PERIOD_MINUTES",    "10", "Thời gian miễn phí (phút)");
        ensureConfig("BILLING_BLOCK_MINUTES",   "30", "Đơn vị tính phí theo block (phút)");
        ensureConfig("BOOKING_EXPIRE_AFTER_START", "30", "Tự huỷ booking sau (phút)");
        ensureConfig("BOOKING_CANCEL_WINDOW_MINUTES", "10", "Hạn hoàn cọc khi huỷ (phút)");
    }

    private void ensureConfig(String key, String defaultValue, String description) {
        if (!systemConfigRepository.existsByConfigKey(key)) {
            systemConfigRepository.save(SystemConfig.builder()
                    .configKey(key)
                    .configValue(defaultValue)
                    .description(description)
                    .updatedAt(java.time.LocalDateTime.now())
                    .build());
            log.info("Seeded SystemConfig: {}={}", key, defaultValue);
        }
    }

    private void seedParkingBuildingsAndLayouts() {
        VehicleType carVehicleType = resolveCarVehicleType();
        int createdCount = 0;
        int updatedCount = 0;

        for (BuildingSeed seed : HCMC_BUILDINGS) {
            ParkingBuilding building = parkingBuildingRepository.findByNameIgnoreCase(seed.name())
                    .orElseGet(ParkingBuilding::new);
            boolean isNew = building.getId() == null;

            building.setName(seed.name());
            building.setAddress(seed.address());
            building.setPhone(seed.phone());
            building.setEmail(seed.email());
            building.setDescription(seed.description());
            building.setOpenTime(LocalTime.of(6, 0));
            building.setCloseTime(LocalTime.of(22, 0));
            building.setLatitude(seed.latitude());
            building.setLongitude(seed.longitude());
            if (isNew) {
                building.setIsActive(true);
            }
            building = parkingBuildingRepository.save(building);

            normalizeBuildingLayout(building, seed.code(), carVehicleType);

            if (isNew) {
                createdCount++;
            } else {
                updatedCount++;
            }
        }

        log.info("Seeded HCMC parking buildings and layouts: created={}, updated={}", createdCount, updatedCount);
    }

    private void seedStaffTestVehicles() {
        User driver = userRepository.findByUsername("driver1")
                .or(() -> userRepository.findByRolesRoleName(Role.RoleName.DRIVER).stream().findFirst())
                .or(() -> userRepository.findAll().stream().findFirst())
                .orElse(null);
        VehicleType carType = vehicleTypeRepository.findByIsActiveTrue().stream()
                .filter(type -> "MEDIUM".equals(type.getSlotSize().name()))
                .findFirst()
                .or(() -> vehicleTypeRepository.findByIsActiveTrue().stream().findFirst())
                .orElse(null);

        if (driver == null || carType == null) {
            log.warn("Skip staff test plate seed because driver={} carType={}", driver != null, carType != null);
            return;
        }

        for (String plate : STAFF_TEST_PLATES) {
            if (!vehicleRepository.existsByLicensePlate(plate)) {
                vehicleRepository.save(Vehicle.builder()
                        .userId(driver.getUserId().longValue())
                        .vehicleType(carType)
                        .licensePlate(plate)
                        .brand("Test")
                        .model("Staff Flow")
                        .color("White")
                        .isActive(true)
                        .build());
                log.info("Seeded staff test vehicle plate {} for user #{}", plate, driver.getUserId());
            }
        }
    }

    private VehicleType resolveCarVehicleType() {
        return vehicleTypeRepository.findByIsActiveTrue().stream()
                .filter(type -> "CAR".equalsIgnoreCase(type.getName()) || type.getSlotSize() == VehicleType.SlotSize.LARGE)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Missing active CAR vehicle type for demo layout seed"));
    }

    private void normalizeBuildingLayout(ParkingBuilding building, String buildingCode, VehicleType carVehicleType) {
        List<Floor> existingFloors = floorRepository.findByBuildingId(building.getId());
        Map<Integer, Floor> floorsByNumber = existingFloors.stream()
                .collect(Collectors.toMap(Floor::getFloorNumber, Function.identity(), (left, right) -> left));

        for (Floor floor : existingFloors) {
            if (floor.getFloorNumber() == null || floor.getFloorNumber() < 1 || floor.getFloorNumber() > FLOOR_COUNT) {
                floor.setIsActive(false);
                floorRepository.save(floor);
            }
        }

        for (int floorNumber = 1; floorNumber <= FLOOR_COUNT; floorNumber++) {
            Floor floor = floorsByNumber.get(floorNumber);
            if (floor == null) {
                floor = Floor.builder()
                        .building(building)
                        .floorNumber(floorNumber)
                        .name(buildFloorName(floorNumber))
                        .capacity(ZONE_SUFFIXES.size() * SLOT_COUNT_PER_ZONE)
                        .isActive(true)
                        .build();
            }

            floor.setBuilding(building);
            floor.setFloorNumber(floorNumber);
            floor.setName(buildFloorName(floorNumber));
            floor.setCapacity(ZONE_SUFFIXES.size() * SLOT_COUNT_PER_ZONE);
            floor.setIsActive(true);
            floor = floorRepository.save(floor);

            normalizeZonesAndSlots(floor, carVehicleType);
        }

        normalizeGates(building, buildingCode);
    }

    private void normalizeZonesAndSlots(Floor floor, VehicleType carVehicleType) {
        List<Zone> existingZones = zoneRepository.findByFloorId(floor.getId());
        Map<String, Zone> zonesByName = existingZones.stream()
                .collect(Collectors.toMap(zone -> normalizeKey(zone.getName()), Function.identity(), (left, right) -> left));

        for (Zone zone : existingZones) {
            if (!isExpectedZoneName(floor.getFloorNumber(), zone.getName())) {
                zone.setIsActive(false);
                zoneRepository.save(zone);
                deactivateZoneSlots(zone);
            }
        }

        for (String suffix : ZONE_SUFFIXES) {
            String zoneName = buildZoneName(floor.getFloorNumber(), suffix);
            Zone zone = zonesByName.get(normalizeKey(zoneName));
            if (zone == null) {
                zone = Zone.builder()
                        .floor(floor)
                        .vehicleType(carVehicleType)
                        .name(zoneName)
                        .description(buildZoneDescription(floor.getFloorNumber(), suffix))
                        .isActive(true)
                        .build();
            }

            zone.setFloor(floor);
            zone.setVehicleType(carVehicleType);
            zone.setName(zoneName);
            zone.setDescription(buildZoneDescription(floor.getFloorNumber(), suffix));
            zone.setIsActive(true);
            zone = zoneRepository.save(zone);

            normalizeSlots(zone);
        }
    }

    private void normalizeSlots(Zone zone) {
        List<ParkingSlot> existingSlots = parkingSlotRepository.findByZoneId(zone.getId());
        Map<String, ParkingSlot> slotsByCode = existingSlots.stream()
                .collect(Collectors.toMap(slot -> normalizeKey(slot.getSlotCode()), Function.identity(), (left, right) -> left));

        for (ParkingSlot slot : existingSlots) {
            if (!isExpectedSlotCode(zone.getName(), slot.getSlotCode())) {
                slot.setIsActive(false);
                parkingSlotRepository.save(slot);
            }
        }

        for (int slotIndex = 1; slotIndex <= SLOT_COUNT_PER_ZONE; slotIndex++) {
            String slotCode = buildSlotCode(zone.getName(), slotIndex);
            ParkingSlot slot = slotsByCode.get(normalizeKey(slotCode));
            boolean isNew = slot == null;
            if (isNew) {
                slot = ParkingSlot.builder()
                        .zone(zone)
                        .slotCode(slotCode)
                        .slotSize(ParkingSlot.SlotSize.LARGE)
                        .status(ParkingSlot.Status.AVAILABLE)
                        .isActive(true)
                        .build();
            }

            slot.setZone(zone);
            slot.setSlotCode(slotCode);
            slot.setSlotSize(ParkingSlot.SlotSize.LARGE);
            // Slot da ton tai: KHONG duoc ghi de status ve AVAILABLE — se xoa mat
            // trang thai OCCUPIED/RESERVED that cua xe dang do moi lan app restart.
            // Chi slot moi tao (isNew) moi mac dinh AVAILABLE.
            if (isNew) {
                slot.setStatus(ParkingSlot.Status.AVAILABLE);
            }
            slot.setIsActive(true);
            parkingSlotRepository.save(slot);
        }
    }

    private void deactivateZoneSlots(Zone zone) {
        for (ParkingSlot slot : parkingSlotRepository.findByZoneId(zone.getId())) {
            slot.setIsActive(false);
            parkingSlotRepository.save(slot);
        }
    }

    private void normalizeGates(ParkingBuilding building, String buildingCode) {
        List<Gate> existingGates = gateRepository.findByBuildingId(building.getId());
        ensureGate(existingGates, building, buildingCode + "-ENTRY", Gate.GateType.ENTRY);
        ensureGate(existingGates, building, buildingCode + "-EXIT", Gate.GateType.EXIT);
        ensureGate(existingGates, building, buildingCode + "-BOTH", Gate.GateType.BOTH);
    }

    private void ensureGate(List<Gate> existingGates, ParkingBuilding building, String gateCode, Gate.GateType gateType) {
        Gate gate = existingGates.stream()
                .filter(item -> normalizeKey(gateCode).equals(normalizeKey(item.getGateCode())))
                .findFirst()
                .orElseGet(() -> gateRepository.findByGateCode(gateCode)
                        .orElseGet(() -> Gate.builder()
                                .building(building)
                                .gateCode(gateCode)
                                .gateType(gateType)
                                .isActive(true)
                                .build()));

        gate.setBuilding(building);
        gate.setGateCode(gateCode);
        gate.setGateType(gateType);
        gate.setIsActive(true);
        gateRepository.save(gate);
    }

    private String buildFloorName(int floorNumber) {
        return "Tầng " + floorNumber + " - Ô tô";
    }

    private String buildZoneName(int floorNumber, String suffix) {
        return "T" + floorNumber + "-" + suffix;
    }

    private String buildZoneDescription(int floorNumber, String suffix) {
        return "Khu " + suffix + " - Ô tô tầng " + floorNumber;
    }

    private String buildSlotCode(String zoneName, int slotIndex) {
        return zoneName + "-" + String.format("%02d", slotIndex);
    }

    private boolean isExpectedZoneName(int floorNumber, String zoneName) {
        if (zoneName == null) {
            return false;
        }
        String normalized = normalizeKey(zoneName);
        return ZONE_SUFFIXES.stream()
                .map(suffix -> normalizeKey(buildZoneName(floorNumber, suffix)))
                .anyMatch(normalized::equals);
    }

    private boolean isExpectedSlotCode(String zoneName, String slotCode) {
        if (zoneName == null || slotCode == null) {
            return false;
        }
        String normalized = normalizeKey(slotCode);
        for (int slotIndex = 1; slotIndex <= SLOT_COUNT_PER_ZONE; slotIndex++) {
            if (normalized.equals(normalizeKey(buildSlotCode(zoneName, slotIndex)))) {
                return true;
            }
        }
        return false;
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private record BuildingSeed(
            String name,
            String address,
            String phone,
            String email,
            String description,
            double latitude,
            double longitude,
            String code
    ) {
    }
}

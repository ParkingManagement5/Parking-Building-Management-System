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
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Configuration
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

    private static final List<BuildingSeed> HCMC_BUILDINGS = List.of(
            new BuildingSeed("Bai xe FPT HCM", "Lo E2a-7, Duong D1, Long Thanh My, Thu Duc, TP.HCM", "0900000010", "parking@fpt.edu.vn", "Bai do xe demo 2 tang oto tai khu FPT HCM", 10.8413, 106.8098, "FPTHCM"),
            new BuildingSeed("Bai xe Nhà Văn Hóa Sinh Viên", "53 Vo Van Tan, Phuong Vo Thi Sau, Quan 3, TP.HCM", "0900000011", "pipink@parking.vn", "Bai do xe Pi Pink duoc chuan hoa lai du lieu va giao dien", 10.7813, 106.6917, "PIPINK"),
            new BuildingSeed("Bai xe Ben Bach Dang", "Ton Duc Thang, Ben Nghe, Quan 1, TP.HCM", "0900000012", "bachdang@parking.vn", "Bai do xe oto gan pho di bo Nguyen Hue", 10.7729, 106.7053, "BACHDANG"),
            new BuildingSeed("Bai xe Tao Dan", "Truong Dinh, Phuong Ben Thanh, Quan 1, TP.HCM", "0900000013", "taodan@parking.vn", "Bai do xe oto phuc vu khu cong vien Tao Dan", 10.7774, 106.6922, "TAODAN"),
            new BuildingSeed("Bai xe Le Van Tam", "Hai Ba Trung, Da Kao, Quan 1, TP.HCM", "0900000014", "levantam@parking.vn", "Bai do xe oto gan cong vien Le Van Tam", 10.7873, 106.7001, "LEVANTAM"),
            new BuildingSeed("Bai xe Landmark 81", "208 Nguyen Huu Canh, Phuong 22, Binh Thanh, TP.HCM", "0900000015", "landmark81@parking.vn", "Bai do xe oto cho khu Landmark 81", 10.7958, 106.7213, "LANDMARK81"),
            new BuildingSeed("Bai xe Tan Son Nhat", "Truong Son, Phuong 2, Tan Binh, TP.HCM", "0900000016", "tsn@parking.vn", "Bai do xe oto gan san bay Tan Son Nhat", 10.8128, 106.6668, "TSN"),
            new BuildingSeed("Bai xe Phu My Hung", "Ton Dat Tien, Tan Phong, Quan 7, TP.HCM", "0900000017", "phumyhung@parking.vn", "Bai do xe 2 tang car cho khu do thi Phu My Hung", 10.7288, 106.7229, "PMH"),
            new BuildingSeed("Bai xe Cong Hoa", "Cong Hoa, Phuong 13, Tan Binh, TP.HCM", "0900000018", "conghoa@parking.vn", "Bai do xe oto doc truc duong Cong Hoa", 10.8017, 106.6425, "CONGHOA"),
            new BuildingSeed("Bai xe Go Vap Center", "Quang Trung, Phuong 10, Go Vap, TP.HCM", "0900000019", "govap@parking.vn", "Bai do xe 2 tang car cho khu Go Vap Center", 10.8396, 106.6699, "GOVAP"),
            new BuildingSeed("Bai xe Aeon Tan Phu", "30 Bo Bao Tan Thang, Son Ky, Tan Phu, TP.HCM", "0900000020", "tanphu@parking.vn", "Bai do xe car cho khu mua sam phia Tay Sai Gon", 10.8007, 106.6204, "AEONTANPHU"),
            new BuildingSeed("Bai xe Binh Tan Hub", "Kinh Duong Vuong, An Lac, Binh Tan, TP.HCM", "0900000021", "binhtan@parking.vn", "Bai do xe oto ket noi cua ngo mien Tay", 10.7443, 106.6142, "BINHTAN"),
            new BuildingSeed("Bai xe Sala Thu Thiem", "10 Mai Chi Tho, Thu Thiem, Thu Duc, TP.HCM", "0900000022", "sala@parking.vn", "Bai do xe 2 tang car cho khu Thu Thiem", 10.7762, 106.7296, "SALA")
    );

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final ParkingBuildingRepository parkingBuildingRepository;
    private final FloorRepository floorRepository;
    private final ZoneRepository zoneRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final GateRepository gateRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seedParkingBuildingsAndLayouts();
        seedStaffTestVehicles();
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
            building.setIsActive(true);
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
            if (slot == null) {
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
            slot.setStatus(ParkingSlot.Status.AVAILABLE);
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
        return "Tang " + floorNumber + " - O to";
    }

    private String buildZoneName(int floorNumber, String suffix) {
        return "T" + floorNumber + "-" + suffix;
    }

    private String buildZoneDescription(int floorNumber, String suffix) {
        return "Khu " + suffix + " - O to tang " + floorNumber;
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

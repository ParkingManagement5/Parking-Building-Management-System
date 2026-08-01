package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingBuilding.Status;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.repository.ZoneRepository;
import com.swp391.parking.service.BuildingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BuildingServiceImpl implements BuildingService {

    private static final int STANDARD_FLOOR_COUNT = 2;
    private static final List<String> STANDARD_ZONE_SUFFIXES = List.of("A", "B", "C", "D", "E", "F");
    private static final int STANDARD_SLOT_COUNT_PER_ZONE = 6;

    private final ParkingBuildingRepository buildingRepo;
    private final FloorRepository floorRepo;
    private final ZoneRepository zoneRepo;
    private final ParkingSlotRepository parkingSlotRepo;
    private final GateRepository gateRepo;
    private final VehicleTypeRepository vehicleTypeRepo;

    @Override
    public List<ParkingBuilding> getAll() {
        return buildingRepo.findByIsActiveTrue();
    }

    @Override
    public ParkingBuilding getById(Long id) {
        return buildingRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy toà nhà ID: " + id));
    }

    @Override
    @Transactional
    public ParkingBuilding create(BuildingRequest req) {
        if (buildingRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Toà nhà '" + req.getName() + "' đã tồn tại");
        }

        if (!req.getCloseTime().isAfter(req.getOpenTime())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                "Giờ đóng cửa phải sau giờ mở cửa");
        }

        ParkingBuilding building = ParkingBuilding.builder()
            .name(req.getName())
            .address(req.getAddress())
            .phone(req.getPhone())
            .email(req.getEmail())
            .description(req.getDescription())
            .openTime(req.getOpenTime())
            .closeTime(req.getCloseTime())
            .latitude(req.getLatitude())
            .longitude(req.getLongitude())
            .status(req.getStatus() != null ? req.getStatus() : Status.ACTIVE)
            .isActive(true)
            .build();

        building = buildingRepo.save(building);
        scaffoldStandardLayout(building);
        return building;
    }

    /**
     * Tu sinh cau truc chuan (2 tang x 6 zone x 6 slot + 3 cong) cho toa nha MOI
     * tao qua API — dung y het khuon ma DataInitializer.normalizeBuildingLayout
     * ap dung cho 4 toa nha that (hardcode san), de Admin tu tao toa nha moi qua
     * UI ma khong can dev sua code/deploy. Manager sau khi duoc gan vao toa nay
     * se tu set gia rieng (pricing_policy) — khong bi seed san gia o day.
     *
     * Neu chua co loai xe CAR/LARGE nao trong he thong (edge case luc moi trien
     * khai), bo qua tao zone/slot — van tao du tang + cong, tranh lam that bai
     * ca thao tac tao building chi vi thieu du lieu phu.
     */
    private void scaffoldStandardLayout(ParkingBuilding building) {
        VehicleType carType = vehicleTypeRepo.findByIsActiveTrue().stream()
            .filter(t -> "CAR".equalsIgnoreCase(t.getName()) || t.getSlotSize() == VehicleType.SlotSize.LARGE)
            .findFirst()
            .orElse(null);
        if (carType == null) {
            log.warn("Bo qua tao zone/slot mac dinh cho building #{} vi chua co loai xe CAR/LARGE", building.getId());
        }

        for (int floorNumber = 1; floorNumber <= STANDARD_FLOOR_COUNT; floorNumber++) {
            Floor floor = floorRepo.save(Floor.builder()
                .building(building)
                .floorNumber(floorNumber)
                .name("Tầng " + floorNumber + " - Ô tô")
                .capacity(STANDARD_ZONE_SUFFIXES.size() * STANDARD_SLOT_COUNT_PER_ZONE)
                .isActive(true)
                .build());

            if (carType == null) continue;

            for (String suffix : STANDARD_ZONE_SUFFIXES) {
                String zoneName = "T" + floorNumber + "-" + suffix;
                Zone zone = zoneRepo.save(Zone.builder()
                    .floor(floor)
                    .vehicleType(carType)
                    .name(zoneName)
                    .description("Khu " + suffix + " - Ô tô tầng " + floorNumber)
                    .isActive(true)
                    .build());

                for (int slotIndex = 1; slotIndex <= STANDARD_SLOT_COUNT_PER_ZONE; slotIndex++) {
                    parkingSlotRepo.save(ParkingSlot.builder()
                        .zone(zone)
                        .slotCode(zoneName + "-" + String.format("%02d", slotIndex))
                        .slotSize(ParkingSlot.SlotSize.LARGE)
                        .status(ParkingSlot.Status.AVAILABLE)
                        .isActive(true)
                        .build());
                }
            }
        }

        // Ma cong dua theo ID (luon duy nhat, khong can nguoi dung nhap ma toa
        // nha nhu DataInitializer) — Manager co the doi ten cong dep hon sau qua
        // "Sua cong" neu muon.
        String gatePrefix = "B" + building.getId();
        gateRepo.save(Gate.builder().building(building).gateCode(gatePrefix + "-ENTRY").gateType(Gate.GateType.ENTRY).isActive(true).build());
        gateRepo.save(Gate.builder().building(building).gateCode(gatePrefix + "-EXIT").gateType(Gate.GateType.EXIT).isActive(true).build());
        gateRepo.save(Gate.builder().building(building).gateCode(gatePrefix + "-BOTH").gateType(Gate.GateType.BOTH).isActive(true).build());
    }

    @Override
    @Transactional
    public ParkingBuilding update(Long id, BuildingRequest req, Long scopeBuildingId) {
        ParkingBuilding building = getById(id);
        enforceBuildingOwnership(building.getId(), scopeBuildingId, "sửa");

        if (!building.getName().equals(req.getName())
                && buildingRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Toà nhà '" + req.getName() + "' đã tồn tại");
        }

        if (!req.getCloseTime().isAfter(req.getOpenTime())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                "Giờ đóng cửa phải sau giờ mở cửa");
        }

        building.setName(req.getName());
        building.setAddress(req.getAddress());
        building.setPhone(req.getPhone());
        building.setEmail(req.getEmail());
        building.setDescription(req.getDescription());
        building.setOpenTime(req.getOpenTime());
        building.setCloseTime(req.getCloseTime());
        building.setLatitude(req.getLatitude());
        building.setLongitude(req.getLongitude());
        if (req.getStatus() != null) {
            building.setStatus(req.getStatus());
        }

        return buildingRepo.save(building);
    }

    // Truoc day ham nay ten la "deactivate" nhung lam XOA CUNG that (delete/
    // deleteAllInBatch) toan bo cong/slot/zone/tang/building — rat nguy hiem vi
    // building that luon co booking/session/payment lich su tham chieu toi cac
    // slot/zone nay, xoa cung se vo du lieu hoac loi rang buoc khoa ngoai. Gio
    // doi thanh vo hieu hoa mem (isActive=false) toan bo cay, giu nguyen du
    // lieu — cac API list (findByIsActiveTrue...) da tu loai chung ra roi.
    @Override
    @Transactional
    public void deactivate(Long id, Long scopeBuildingId) {
        ParkingBuilding building = getById(id);
        enforceBuildingOwnership(building.getId(), scopeBuildingId, "vô hiệu hoá");

        gateRepo.findByBuildingId(building.getId()).forEach(gate -> {
            gate.setIsActive(false);
            gateRepo.save(gate);
        });

        floorRepo.findByBuildingId(building.getId()).forEach(floor -> {
            zoneRepo.findByFloorId(floor.getId()).forEach(zone -> {
                parkingSlotRepo.findByZoneId(zone.getId()).forEach(slot -> {
                    slot.setIsActive(false);
                    parkingSlotRepo.save(slot);
                });
                zone.setIsActive(false);
                zoneRepo.save(zone);
            });
            floor.setIsActive(false);
            floorRepo.save(floor);
        });

        building.setIsActive(false);
        building.setStatus(Status.INACTIVE);
        buildingRepo.save(building);
    }

    /** MANAGER (scopeBuildingId != null) chỉ được sửa/xoá đúng toà nhà mình quản lý. ADMIN (null) không giới hạn. */
    private void enforceBuildingOwnership(Long entityBuildingId, Long scopeBuildingId, String action) {
        if (scopeBuildingId != null && !scopeBuildingId.equals(entityBuildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ được " + action + " toà nhà bạn quản lý");
        }
    }
}

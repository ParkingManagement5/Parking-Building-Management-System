package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingBuilding.Status;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.ZoneRepository;
import com.swp391.parking.service.BuildingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BuildingServiceImpl implements BuildingService {

    private final ParkingBuildingRepository buildingRepo;
    private final FloorRepository floorRepo;
    private final ZoneRepository zoneRepo;
    private final ParkingSlotRepository parkingSlotRepo;
    private final GateRepository gateRepo;

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

        return buildingRepo.save(building);
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

    @Override
    @Transactional
    public void deactivate(Long id, Long scopeBuildingId) {
        ParkingBuilding building = getById(id);
        enforceBuildingOwnership(building.getId(), scopeBuildingId, "xoá");

        gateRepo.deleteAllInBatch(gateRepo.findByBuildingId(building.getId()));

        var floors = floorRepo.findByBuildingId(building.getId());
        floors.forEach(floor -> {
            var zones = zoneRepo.findByFloorId(floor.getId());
            zones.forEach(zone -> parkingSlotRepo.deleteAllInBatch(parkingSlotRepo.findByZoneId(zone.getId())));
            zoneRepo.deleteAllInBatch(zones);
        });

        floorRepo.deleteAllInBatch(floors);
        buildingRepo.delete(building);
    }

    /** MANAGER (scopeBuildingId != null) chỉ được sửa/xoá đúng toà nhà mình quản lý. ADMIN (null) không giới hạn. */
    private void enforceBuildingOwnership(Long entityBuildingId, Long scopeBuildingId, String action) {
        if (scopeBuildingId != null && !scopeBuildingId.equals(entityBuildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ được " + action + " toà nhà bạn quản lý");
        }
    }
}

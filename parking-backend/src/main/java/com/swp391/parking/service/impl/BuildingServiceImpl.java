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
                "Khong tim thay toa nha ID: " + id));
    }

    @Override
    @Transactional
    public ParkingBuilding create(BuildingRequest req) {
        if (buildingRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Toa nha '" + req.getName() + "' da ton tai");
        }

        if (!req.getCloseTime().isAfter(req.getOpenTime())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                "Gio dong cua phai sau gio mo cua");
        }

        ParkingBuilding building = ParkingBuilding.builder()
            .name(req.getName())
            .address(req.getAddress())
            .phone(req.getPhone())
            .email(req.getEmail())
            .description(req.getDescription())
            .openTime(req.getOpenTime())
            .closeTime(req.getCloseTime())
            .status(req.getStatus() != null ? req.getStatus() : Status.ACTIVE)
            .isActive(true)
            .build();

        return buildingRepo.save(building);
    }

    @Override
    @Transactional
    public ParkingBuilding update(Long id, BuildingRequest req) {
        ParkingBuilding building = getById(id);

        if (!building.getName().equals(req.getName())
                && buildingRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Toa nha '" + req.getName() + "' da ton tai");
        }

        if (!req.getCloseTime().isAfter(req.getOpenTime())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                "Gio dong cua phai sau gio mo cua");
        }

        building.setName(req.getName());
        building.setAddress(req.getAddress());
        building.setPhone(req.getPhone());
        building.setEmail(req.getEmail());
        building.setDescription(req.getDescription());
        building.setOpenTime(req.getOpenTime());
        building.setCloseTime(req.getCloseTime());
        if (req.getStatus() != null) {
            building.setStatus(req.getStatus());
        }

        return buildingRepo.save(building);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        ParkingBuilding building = getById(id);

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
}

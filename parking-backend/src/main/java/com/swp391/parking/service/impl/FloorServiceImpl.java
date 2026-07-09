package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Floor.Status;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.ZoneRepository;
import com.swp391.parking.service.FloorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FloorServiceImpl implements FloorService {

    private final FloorRepository floorRepo;
    private final ParkingBuildingRepository buildingRepo;
    private final ZoneRepository zoneRepo;
    private final ParkingSlotRepository parkingSlotRepo;

    @Override
    public List<Floor> getByBuilding(Long buildingId) {
        return floorRepo.findByBuildingIdAndIsActiveTrue(buildingId);
    }

    @Override
    public Floor getById(Long id) {
        return floorRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay tang ID: " + id));
    }

    @Override
    @Transactional
    public Floor create(FloorRequest req) {
        if (floorRepo.existsByBuildingIdAndFloorNumber(req.getBuildingId(), req.getFloorNumber())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Tang so " + req.getFloorNumber() + " da ton tai trong toa nha nay");
        }

        ParkingBuilding building = buildingRepo.findById(req.getBuildingId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay toa nha ID: " + req.getBuildingId()));

        Floor floor = Floor.builder()
            .building(building)
            .floorNumber(req.getFloorNumber())
            .name(req.getName())
            .capacity(req.getCapacity() != null ? req.getCapacity() : 0)
            .status(req.getStatus() != null ? req.getStatus() : Status.ACTIVE)
            .isActive(true)
            .build();

        return floorRepo.save(floor);
    }

    @Override
    @Transactional
    public Floor update(Long id, FloorRequest req) {
        Floor floor = getById(id);
        floor.setName(req.getName());
        floor.setCapacity(req.getCapacity() != null ? req.getCapacity() : floor.getCapacity());
        if (req.getStatus() != null) {
            floor.setStatus(req.getStatus());
        }
        return floorRepo.save(floor);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        Floor floor = getById(id);
        var zones = zoneRepo.findByFloorId(floor.getId());
        zones.forEach(zone -> parkingSlotRepo.deleteAllInBatch(parkingSlotRepo.findByZoneId(zone.getId())));
        zoneRepo.deleteAllInBatch(zones);
        floorRepo.delete(floor);
    }
}

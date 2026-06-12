package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.ZoneRequest;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.entity.Zone.Status;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.repository.ZoneRepository;
import com.swp391.parking.service.ZoneService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ZoneServiceImpl implements ZoneService {

    private final ZoneRepository zoneRepo;
    private final FloorRepository floorRepo;
    private final VehicleTypeRepository vehicleTypeRepo;
    private final ParkingSlotRepository parkingSlotRepo;

    @Override
    public List<Zone> getByFloor(Long floorId) {
        return zoneRepo.findByFloorIdAndIsActiveTrue(floorId);
    }

    @Override
    public Zone getById(Long id) {
        return zoneRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay zone ID: " + id));
    }

    @Override
    @Transactional
    public Zone create(ZoneRequest req) {
        if (zoneRepo.existsByFloorIdAndName(req.getFloorId(), req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Zone '" + req.getName() + "' da ton tai o tang nay");
        }

        Floor floor = floorRepo.findById(req.getFloorId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay tang ID: " + req.getFloorId()));

        VehicleType vehicleType = vehicleTypeRepo.findById(req.getVehicleTypeId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay loai xe ID: " + req.getVehicleTypeId()));

        Zone zone = Zone.builder()
            .floor(floor)
            .vehicleType(vehicleType)
            .name(req.getName())
            .description(req.getDescription())
            .status(req.getStatus() != null ? req.getStatus() : Status.ACTIVE)
            .isActive(true)
            .build();

        return zoneRepo.save(zone);
    }

    @Override
    @Transactional
    public Zone update(Long id, ZoneRequest req) {
        Zone zone = getById(id);
        zone.setName(req.getName());
        zone.setDescription(req.getDescription());
        if (req.getStatus() != null) {
            zone.setStatus(req.getStatus());
        }
        return zoneRepo.save(zone);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        Zone zone = getById(id);
        parkingSlotRepo.deleteAllInBatch(parkingSlotRepo.findByZoneId(zone.getId()));
        zoneRepo.delete(zone);
    }
}

package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.VehicleTypeRequest;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.repository.ZoneRepository;
import com.swp391.parking.service.VehicleTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleTypeServiceImpl implements VehicleTypeService {

    private final VehicleTypeRepository vehicleTypeRepo;
    private final VehicleRepository vehicleRepo;
    private final ZoneRepository zoneRepo;
    private final ParkingSlotRepository parkingSlotRepo;

    @Override
    public List<VehicleType> getAll() {
        return vehicleTypeRepo.findByIsActiveTrue();
    }

    @Override
    public VehicleType getById(Long id) {
        return vehicleTypeRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay loai xe ID: " + id));
    }

    @Override
    @Transactional
    public VehicleType create(VehicleTypeRequest req) {
        if (vehicleTypeRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Loai xe '" + req.getName() + "' da ton tai");
        }

        VehicleType vt = VehicleType.builder()
            .name(req.getName())
            .description(req.getDescription())
            .slotSize(req.getSlotSize())
            .hourlyRate(req.getHourlyRate())
            .dailyRate(req.getDailyRate())
            .isActive(true)
            .build();

        return vehicleTypeRepo.save(vt);
    }

    @Override
    @Transactional
    public VehicleType update(Long id, VehicleTypeRequest req) {
        VehicleType vt = getById(id);

        if (!vt.getName().equals(req.getName()) && vehicleTypeRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Loai xe '" + req.getName() + "' da ton tai");
        }

        vt.setName(req.getName());
        vt.setDescription(req.getDescription());
        vt.setSlotSize(req.getSlotSize());
        vt.setHourlyRate(req.getHourlyRate());
        vt.setDailyRate(req.getDailyRate());

        return vehicleTypeRepo.save(vt);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        VehicleType vt = getById(id);

        vehicleRepo.deleteAllInBatch(vehicleRepo.findByVehicleTypeId(vt.getId()));

        var zones = zoneRepo.findByVehicleTypeId(vt.getId());
        zones.forEach(zone -> parkingSlotRepo.deleteAllInBatch(parkingSlotRepo.findByZoneId(zone.getId())));
        zoneRepo.deleteAllInBatch(zones);

        vehicleTypeRepo.delete(vt);
    }
}

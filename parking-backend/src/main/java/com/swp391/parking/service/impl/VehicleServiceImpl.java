package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.VehicleRequest;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepo;
    private final VehicleTypeRepository vehicleTypeRepo;

    @Override
    public List<Vehicle> getByUser(Integer userId) {
        return vehicleRepo.findByUserIdAndIsActiveTrue(userId);
    }

    @Override
    public Vehicle getById(Long id) {
        return vehicleRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay xe ID: " + id));
    }

    @Override
    public Vehicle getByLicensePlate(String licensePlate) {
        return lookupPlateCandidates(licensePlate).stream()
            .map(vehicleRepo::findByLicensePlate)
            .filter(java.util.Optional::isPresent)
            .map(java.util.Optional::get)
            .findFirst()
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay xe bien so: " + licensePlate));
    }

    @Override
    @Transactional
    public Vehicle create(Integer userId, VehicleRequest req) {
        String normalizedPlate = normalizePlate(req.getLicensePlate());
        if (lookupPlateCandidates(normalizedPlate).stream().anyMatch(vehicleRepo::existsByLicensePlate)) {
            throw new AppException(HttpStatus.CONFLICT,
                "Bien so '" + normalizedPlate + "' da duoc dang ky");
        }

        VehicleType vehicleType = vehicleTypeRepo.findById(req.getVehicleTypeId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay loai xe ID: " + req.getVehicleTypeId()));

        Vehicle vehicle = Vehicle.builder()
            .userId(userId.longValue())
            .vehicleType(vehicleType)
            .licensePlate(normalizedPlate)
            .brand(req.getBrand())
            .model(req.getModel())
            .color(req.getColor())
            .isActive(true)
            .build();

        return vehicleRepo.save(vehicle);
    }

    @Override
    @Transactional
    public Vehicle update(Long id, VehicleRequest req) {
        Vehicle vehicle = getById(id);
        String normalizedPlate = normalizePlate(req.getLicensePlate());
        VehicleType vehicleType = vehicleTypeRepo.findById(req.getVehicleTypeId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay loai xe ID: " + req.getVehicleTypeId()));

        lookupPlateCandidates(normalizedPlate).stream()
            .map(vehicleRepo::findByLicensePlate)
            .filter(java.util.Optional::isPresent)
            .map(java.util.Optional::get)
            .filter(existing -> !existing.getId().equals(id))
            .findFirst()
            .ifPresent(existing -> {
                throw new AppException(HttpStatus.CONFLICT,
                    "Bien so '" + normalizedPlate + "' da duoc dang ky");
            });

        vehicle.setVehicleType(vehicleType);
        vehicle.setLicensePlate(normalizedPlate);
        vehicle.setBrand(req.getBrand());
        vehicle.setModel(req.getModel());
        vehicle.setColor(req.getColor());
        return vehicleRepo.save(vehicle);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        Vehicle vehicle = getById(id);
        vehicle.setIsActive(false);
        vehicleRepo.save(vehicle);
    }

    private Set<String> lookupPlateCandidates(String licensePlate) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        if (licensePlate == null || licensePlate.isBlank()) {
            return candidates;
        }

        String normalized = licensePlate.toUpperCase(Locale.ROOT).replace(" ", "");
        candidates.add(normalized);
        candidates.add(normalized.replace(".", ""));

        int separatorIndex = normalized.lastIndexOf('-');
        if (separatorIndex >= 0 && separatorIndex < normalized.length() - 1) {
            String prefix = normalized.substring(0, separatorIndex + 1);
            String serial = normalized.substring(separatorIndex + 1).replace(".", "");
            if (serial.matches("\\d{5}")) {
                candidates.add(prefix + serial.substring(0, 3) + "." + serial.substring(3));
            }
        }

        return candidates;
    }

    private String normalizePlate(String licensePlate) {
        if (licensePlate == null) {
            return null;
        }

        String normalized = licensePlate.toUpperCase(Locale.ROOT).replace(" ", "");
        int separatorIndex = normalized.lastIndexOf('-');
        if (separatorIndex >= 0 && separatorIndex < normalized.length() - 1) {
            String prefix = normalized.substring(0, separatorIndex + 1);
            String serial = normalized.substring(separatorIndex + 1).replace(".", "");
            if (serial.matches("\\d{5}")) {
                return prefix + serial.substring(0, 3) + "." + serial.substring(3);
            }
        }

        return normalized;
    }
}

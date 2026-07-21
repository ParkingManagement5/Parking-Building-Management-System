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
import java.util.List;

@SuppressWarnings("null")
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
                "Không tìm thấy xe ID: " + id));
    }

    @Override
    public Vehicle getByLicensePlate(String licensePlate) {
        return vehicleRepo.findByLicensePlate(licensePlate)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy xe biển số: " + licensePlate));
    }

    @Override
    @Transactional
    public Vehicle create(Integer userId, VehicleRequest req) {
        // Biển số phải unique toàn hệ thống
        if (vehicleRepo.existsByLicensePlate(req.getLicensePlate())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Biển số '" + req.getLicensePlate() + "' đã được đăng ký");
        }

        VehicleType vehicleType = vehicleTypeRepo.findById(req.getVehicleTypeId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy loại xe ID: " + req.getVehicleTypeId()));

        Vehicle vehicle = Vehicle.builder()
            .userId(userId)
            .vehicleType(vehicleType)
            .licensePlate(req.getLicensePlate())
            .brand(req.getBrand())
            .model(req.getModel())
            .color(req.getColor())
            .isActive(true)
            .build();

        return vehicleRepo.save(vehicle);
    }

    @Override
    @Transactional
    public Vehicle update(Long id, Integer currentUserId, VehicleRequest req) {
        Vehicle vehicle = getById(id);
        // Chỉ chủ xe mới được sửa
        if (!vehicle.getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền sửa xe này");
        }
        // Không cho đổi biển số và loại xe — chỉ đổi thông tin phụ
        vehicle.setBrand(req.getBrand());
        vehicle.setModel(req.getModel());
        vehicle.setColor(req.getColor());
        return vehicleRepo.save(vehicle);
    }

    @Override
    @Transactional
    public void deactivate(Long id, Integer currentUserId) {
        Vehicle vehicle = getById(id);
        // Chỉ chủ xe mới được xóa (ADMIN bypass: truyền userId của xe)
        if (!vehicle.getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa xe này");
        }
        vehicle.setIsActive(false);
        vehicleRepo.save(vehicle);
    }
}

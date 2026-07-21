package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.VehicleTypeRequest;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.service.VehicleTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class VehicleTypeServiceImpl implements VehicleTypeService {

    private final VehicleTypeRepository vehicleTypeRepo;

    @Override
    public List<VehicleType> getAll() {
        return vehicleTypeRepo.findByIsActiveTrue();
    }

    @Override
    public VehicleType getById(Long id) {
        return vehicleTypeRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy loại xe ID: " + id));
    }

    @Override
    @Transactional
    public VehicleType create(VehicleTypeRequest req) {
        // FR-4: tên loại xe phải unique
        if (vehicleTypeRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Loại xe '" + req.getName() + "' đã tồn tại");
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

        // Cho phép giữ tên cũ, chỉ báo lỗi nếu đổi sang tên đã có của loại xe khác
        if (!vt.getName().equals(req.getName()) && vehicleTypeRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Loại xe '" + req.getName() + "' đã tồn tại");
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
        // FR-4: không xóa thật — giữ lại lịch sử sessions và payments đã dùng loại xe này
        vt.setIsActive(false);
        vehicleTypeRepo.save(vt);
    }
}

package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.GateRequest;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.Gate.GateType;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.service.GateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GateServiceImpl implements GateService {

    private final GateRepository gateRepo;
    private final ParkingBuildingRepository buildingRepo;

    @Override
    public List<Gate> getByBuilding(Long buildingId) {
        return gateRepo.findByBuildingId(buildingId);
    }

    @Override
    public List<Gate> getActiveByBuilding(Long buildingId) {
        return gateRepo.findByBuildingIdAndIsActiveTrue(buildingId);
    }

    @Override
    public List<Gate> getByBuildingAndType(Long buildingId, GateType gateType) {
        return gateRepo.findByBuildingIdAndGateTypeAndIsActiveTrue(buildingId, gateType);
    }

    @Override
    public Gate getById(Long id) {
        return gateRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy cổng ID: " + id));
    }

    @Override
    @Transactional
    public Gate create(GateRequest req) {
        if (gateRepo.existsByGateCode(req.getGateCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Mã cổng đã tồn tại: " + req.getGateCode());
        }

        ParkingBuilding building = buildingRepo.findById(req.getBuildingId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy tòa nhà ID: " + req.getBuildingId()));

        Gate gate = Gate.builder()
            .building(building)
            .gateCode(req.getGateCode())
            .gateType(req.getGateType())
            .isActive(true)
            .build();

        return gateRepo.save(gate);
    }

    @Override
    @Transactional
    public Gate update(Long id, GateRequest req) {
        Gate gate = getById(id);

        // Nếu đổi gateCode thì kiểm tra trùng
        if (!gate.getGateCode().equals(req.getGateCode())
                && gateRepo.existsByGateCode(req.getGateCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Mã cổng đã tồn tại: " + req.getGateCode());
        }

        ParkingBuilding building = buildingRepo.findById(req.getBuildingId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy tòa nhà ID: " + req.getBuildingId()));

        gate.setBuilding(building);
        gate.setGateCode(req.getGateCode());
        gate.setGateType(req.getGateType());

        return gateRepo.save(gate);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        Gate gate = getById(id);
        gate.setIsActive(false);
        gateRepo.save(gate);
    }
}

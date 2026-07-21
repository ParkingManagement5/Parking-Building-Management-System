package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.service.BuildingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class BuildingServiceImpl implements BuildingService {

    private final ParkingBuildingRepository buildingRepo;

    @Override
    public List<ParkingBuilding> getAll() {
        return buildingRepo.findByIsActiveTrue();
    }

    @Override
    public ParkingBuilding getById(Long id) {
        return buildingRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy tòa nhà ID: " + id));
    }

    @Override
    @Transactional
    public ParkingBuilding create(BuildingRequest req) {
        // Kiểm tra tên tòa nhà không trùng
        if (buildingRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Tòa nhà '" + req.getName() + "' đã tồn tại");
        }
        // BR-05: giờ đóng phải sau giờ mở
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
            .isActive(true)
            .build();

        return buildingRepo.save(building);
    }

    @Override
    @Transactional
    public ParkingBuilding update(Long id, BuildingRequest req) {
        ParkingBuilding building = getById(id);

        // Nếu đổi tên thì kiểm tra không trùng với tòa nhà khác
        if (!building.getName().equals(req.getName())
                && buildingRepo.existsByName(req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Tòa nhà '" + req.getName() + "' đã tồn tại");
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

        return buildingRepo.save(building);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        ParkingBuilding building = getById(id);
        building.setIsActive(false); // soft delete
        buildingRepo.save(building);
    }
}

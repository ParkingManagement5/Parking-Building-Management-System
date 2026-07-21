package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.service.FloorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class FloorServiceImpl implements FloorService {

    private final FloorRepository floorRepo;
    private final ParkingBuildingRepository buildingRepo;

    @Override
    public List<Floor> getByBuilding(Long buildingId) {
        return floorRepo.findByBuildingIdAndIsActiveTrue(buildingId);
    }

    @Override
    public Floor getById(Long id) {
        return floorRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy tầng ID: " + id));
    }

    @Override
    @Transactional
    public Floor create(FloorRequest req) {
        if (floorRepo.existsByBuildingIdAndFloorNumber(req.getBuildingId(), req.getFloorNumber())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Tầng số " + req.getFloorNumber() + " đã tồn tại trong tòa nhà này");
        }

        ParkingBuilding building = buildingRepo.findById(req.getBuildingId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy tòa nhà ID: " + req.getBuildingId()));

        Floor floor = Floor.builder()
            .building(building)
            .floorNumber(req.getFloorNumber())
            .name(req.getName())
            .capacity(req.getCapacity() != null ? req.getCapacity() : 0)
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
        return floorRepo.save(floor);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        Floor floor = getById(id);
        floor.setIsActive(false);
        floorRepo.save(floor);
    }
}

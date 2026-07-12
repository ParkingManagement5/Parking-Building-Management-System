package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.Floor.Status;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.UserRepository;
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
    private final UserRepository userRepository;

    @Override
    public List<Floor> getByBuilding(Long buildingId) {
        return floorRepo.findByBuildingIdAndIsActiveTrue(buildingId);
    }

    @Override
    public List<Floor> getByBuilding(Long buildingId, Long currentUserId, boolean buildingScoped) {
        enforceStaffBuildingScope(buildingId, currentUserId, buildingScoped);
        return getByBuilding(buildingId);
    }

    @Override
    public Floor getById(Long id, Long currentUserId, boolean buildingScoped) {
        Floor floor = floorRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy tầng ID: " + id));
        enforceStaffBuildingScope(floor.getBuilding() != null ? floor.getBuilding().getId() : null, currentUserId, buildingScoped);
        return floor;
    }

    @Override
    public List<Floor> getAll(Long scopeBuildingId) {
        List<Floor> all = floorRepo.findAll();
        if (scopeBuildingId == null) return all;
        return all.stream()
                .filter(f -> f.getBuilding() != null && scopeBuildingId.equals(f.getBuilding().getId()))
                .toList();
    }

    @Override
    @Transactional
    public Floor create(FloorRequest req, Long scopeBuildingId) {
        if (scopeBuildingId != null && !scopeBuildingId.equals(req.getBuildingId())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ được tạo tầng cho toà nhà bạn quản lý");
        }
        if (floorRepo.existsByBuildingIdAndFloorNumber(req.getBuildingId(), req.getFloorNumber())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Tầng số " + req.getFloorNumber() + " đã tồn tại trong toà nhà này");
        }

        ParkingBuilding building = buildingRepo.findById(req.getBuildingId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy toà nhà ID: " + req.getBuildingId()));

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
    public Floor update(Long id, FloorRequest req, Long scopeBuildingId) {
        Floor floor = floorRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tầng ID: " + id));
        enforceBuildingOwnership(floor.getBuilding() != null ? floor.getBuilding().getId() : null, scopeBuildingId, "sửa");
        floor.setName(req.getName());
        floor.setCapacity(req.getCapacity() != null ? req.getCapacity() : floor.getCapacity());
        if (req.getStatus() != null) {
            floor.setStatus(req.getStatus());
        }
        return floorRepo.save(floor);
    }

    @Override
    @Transactional
    public void deactivate(Long id, Long scopeBuildingId) {
        Floor floor = floorRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tầng ID: " + id));
        enforceBuildingOwnership(floor.getBuilding() != null ? floor.getBuilding().getId() : null, scopeBuildingId, "xoá");
        var zones = zoneRepo.findByFloorId(floor.getId());
        zones.forEach(zone -> parkingSlotRepo.deleteAllInBatch(parkingSlotRepo.findByZoneId(zone.getId())));
        zoneRepo.deleteAllInBatch(zones);
        floorRepo.delete(floor);
    }

    private void enforceStaffBuildingScope(Long buildingId, Long currentUserId, boolean buildingScoped) {
        if (!buildingScoped) {
            return;
        }
        User currentUser = userRepository.findById(Math.toIntExact(currentUserId))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy user hiện tại"));
        if (currentUser.getAssignedBuilding() == null || currentUser.getAssignedBuilding().getId() == null) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chưa được gán toà nhà");
        }
        if (!currentUser.getAssignedBuilding().getId().equals(buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem tầng ngoài toà nhà được phân công");
        }
    }

    private void enforceBuildingOwnership(Long entityBuildingId, Long scopeBuildingId, String action) {
        if (scopeBuildingId != null && !scopeBuildingId.equals(entityBuildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ được " + action + " tầng thuộc toà nhà bạn quản lý");
        }
    }
}

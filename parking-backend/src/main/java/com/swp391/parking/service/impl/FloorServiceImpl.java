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
    public List<Floor> getByBuilding(Long buildingId, Long currentUserId, boolean staffScoped) {
        enforceStaffBuildingScope(buildingId, currentUserId, staffScoped);
        return getByBuilding(buildingId);
    }

    @Override
    public Floor getById(Long id, Long currentUserId, boolean staffScoped) {
        Floor floor = floorRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy tầng ID: " + id));
        enforceStaffBuildingScope(floor.getBuilding() != null ? floor.getBuilding().getId() : null, currentUserId, staffScoped);
        return floor;
    }

    @Override
    @Transactional
    public Floor create(FloorRequest req) {
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
    public Floor update(Long id, FloorRequest req) {
        Floor floor = floorRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tầng ID: " + id));
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
        Floor floor = floorRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tầng ID: " + id));
        var zones = zoneRepo.findByFloorId(floor.getId());
        zones.forEach(zone -> parkingSlotRepo.deleteAllInBatch(parkingSlotRepo.findByZoneId(zone.getId())));
        zoneRepo.deleteAllInBatch(zones);
        floorRepo.delete(floor);
    }

    private void enforceStaffBuildingScope(Long buildingId, Long currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return;
        }
        User currentUser = userRepository.findById(Math.toIntExact(currentUserId))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy staff hiện tại"));
        if (currentUser.getAssignedBuilding() == null || currentUser.getAssignedBuilding().getId() == null) {
            throw new AppException(HttpStatus.FORBIDDEN, "Staff chưa được gán toà nhà");
        }
        if (!currentUser.getAssignedBuilding().getId().equals(buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem tầng ngoài toà nhà được phân công");
        }
    }
}

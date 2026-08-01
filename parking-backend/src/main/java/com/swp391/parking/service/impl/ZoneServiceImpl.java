package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.ZoneRequest;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.entity.Zone.Status;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.UserRepository;
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
    private final UserRepository userRepository;

    @Override
    public List<Zone> getByFloor(Long floorId) {
        return zoneRepo.findByFloorIdAndIsActiveTrue(floorId);
    }

    @Override
    public List<Zone> getByFloor(Long floorId, Long currentUserId, boolean buildingScoped) {
        Floor floor = floorRepo.findById(floorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tầng ID: " + floorId));
        Long buildingId = floor.getBuilding() != null ? floor.getBuilding().getId() : null;
        enforceStaffBuildingScope(buildingId, currentUserId, buildingScoped);
        return getByFloor(floorId);
    }

    @Override
    public Zone getById(Long id, Long currentUserId, boolean buildingScoped) {
        Zone zone = zoneRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy zone ID: " + id));
        Long buildingId = zone.getFloor() != null && zone.getFloor().getBuilding() != null
                ? zone.getFloor().getBuilding().getId() : null;
        enforceStaffBuildingScope(buildingId, currentUserId, buildingScoped);
        return zone;
    }

    @Override
    public List<Zone> getAll(Long scopeBuildingId) {
        List<Zone> all = zoneRepo.findAll();
        if (scopeBuildingId == null) return all;
        return all.stream()
                .filter(z -> z.getFloor() != null && z.getFloor().getBuilding() != null
                        && scopeBuildingId.equals(z.getFloor().getBuilding().getId()))
                .toList();
    }

    @Override
    @Transactional
    public Zone create(ZoneRequest req, Long scopeBuildingId) {
        Floor floor = floorRepo.findById(req.getFloorId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy tầng ID: " + req.getFloorId()));
        Long floorBuildingId = floor.getBuilding() != null ? floor.getBuilding().getId() : null;
        if (scopeBuildingId != null && !scopeBuildingId.equals(floorBuildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ được tạo zone cho toà nhà bạn quản lý");
        }

        if (zoneRepo.existsByFloorIdAndName(req.getFloorId(), req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Zone '" + req.getName() + "' đã tồn tại ở tầng này");
        }

        VehicleType vehicleType = vehicleTypeRepo.findById(req.getVehicleTypeId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy loại xe ID: " + req.getVehicleTypeId()));

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
    public Zone update(Long id, ZoneRequest req, Long scopeBuildingId) {
        Zone zone = zoneRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy zone ID: " + id));
        enforceBuildingOwnership(zone, scopeBuildingId, "sửa");
        zone.setName(req.getName());
        zone.setDescription(req.getDescription());
        if (req.getStatus() != null) {
            zone.setStatus(req.getStatus());
        }
        return zoneRepo.save(zone);
    }

    // Doi tu xoa cung sang vo hieu hoa mem — zone that co the co slot dang gan
    // voi booking/session lich su.
    @Override
    @Transactional
    public void deactivate(Long id, Long scopeBuildingId) {
        Zone zone = zoneRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy zone ID: " + id));
        enforceBuildingOwnership(zone, scopeBuildingId, "vô hiệu hoá");

        parkingSlotRepo.findByZoneId(zone.getId()).forEach(slot -> {
            slot.setIsActive(false);
            parkingSlotRepo.save(slot);
        });

        zone.setIsActive(false);
        zoneRepo.save(zone);
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
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem zone ngoài toà nhà được phân công");
        }
    }

    private void enforceBuildingOwnership(Zone zone, Long scopeBuildingId, String action) {
        if (scopeBuildingId == null) return;
        Long buildingId = zone.getFloor() != null && zone.getFloor().getBuilding() != null
                ? zone.getFloor().getBuilding().getId() : null;
        if (!scopeBuildingId.equals(buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ được " + action + " zone thuộc toà nhà bạn quản lý");
        }
    }
}

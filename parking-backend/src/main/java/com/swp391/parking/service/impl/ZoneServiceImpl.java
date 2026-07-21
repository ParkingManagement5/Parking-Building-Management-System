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
    public List<Zone> getByFloor(Long floorId, Long currentUserId, boolean staffScoped) {
        Floor floor = floorRepo.findById(floorId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Khong tim thay tang ID: " + floorId));
        Long buildingId = floor.getBuilding() != null ? floor.getBuilding().getId() : null;
        enforceStaffBuildingScope(buildingId, currentUserId, staffScoped);
        return getByFloor(floorId);
    }

    @Override
    public Zone getById(Long id, Long currentUserId, boolean staffScoped) {
        Zone zone = zoneRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay zone ID: " + id));
        Long buildingId = zone.getFloor() != null && zone.getFloor().getBuilding() != null
                ? zone.getFloor().getBuilding().getId() : null;
        enforceStaffBuildingScope(buildingId, currentUserId, staffScoped);
        return zone;
    }

    @Override
    @Transactional
    public Zone create(ZoneRequest req) {
        if (zoneRepo.existsByFloorIdAndName(req.getFloorId(), req.getName())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Zone '" + req.getName() + "' da ton tai o tang nay");
        }

        Floor floor = floorRepo.findById(req.getFloorId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay tang ID: " + req.getFloorId()));

        VehicleType vehicleType = vehicleTypeRepo.findById(req.getVehicleTypeId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay loai xe ID: " + req.getVehicleTypeId()));

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
    public Zone update(Long id, ZoneRequest req) {
        Zone zone = zoneRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Khong tim thay zone ID: " + id));
        zone.setName(req.getName());
        zone.setDescription(req.getDescription());
        if (req.getStatus() != null) {
            zone.setStatus(req.getStatus());
        }
        return zoneRepo.save(zone);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        Zone zone = zoneRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Khong tim thay zone ID: " + id));
        parkingSlotRepo.deleteAllInBatch(parkingSlotRepo.findByZoneId(zone.getId()));
        zoneRepo.delete(zone);
    }

    private void enforceStaffBuildingScope(Long buildingId, Long currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return;
        }
        User currentUser = userRepository.findById(Math.toIntExact(currentUserId))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Khong tim thay staff hien tai"));
        if (currentUser.getAssignedBuilding() == null || currentUser.getAssignedBuilding().getId() == null) {
            throw new AppException(HttpStatus.FORBIDDEN, "Staff chua duoc gan toa nha");
        }
        if (!currentUser.getAssignedBuilding().getId().equals(buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem zone ngoai toa nha duoc phan cong");
        }
    }
}

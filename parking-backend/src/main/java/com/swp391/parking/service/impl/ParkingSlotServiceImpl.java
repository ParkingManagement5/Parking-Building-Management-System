package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.dto.response.PublicSlotStatsResponse;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.ParkingSlot.Status;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.repository.ZoneRepository;
import com.swp391.parking.service.ParkingSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParkingSlotServiceImpl implements ParkingSlotService {

    private final ParkingSlotRepository slotRepo;
    private final ZoneRepository zoneRepo;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getAll(Long scopeBuildingId) {
        List<ParkingSlot> all = slotRepo.findAll();
        if (scopeBuildingId == null) return all;
        return all.stream()
                .filter(s -> s.getZone() != null && s.getZone().getFloor() != null
                        && s.getZone().getFloor().getBuilding() != null
                        && scopeBuildingId.equals(s.getZone().getFloor().getBuilding().getId()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getPublicOverview() {
        return slotRepo.findAllWithDetails();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicSlotStatsResponse getPublicStats() {
        var row = slotRepo.getPublicStats();
        return PublicSlotStatsResponse.builder()
                .buildingCount(row.getBuildingCount() != null ? row.getBuildingCount() : 0)
                .total(row.getTotal() != null ? row.getTotal() : 0)
                .available(row.getAvailable() != null ? row.getAvailable() : 0)
                .occupied(row.getOccupied() != null ? row.getOccupied() : 0)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getByZone(Long zoneId) {
        return slotRepo.findByZoneId(zoneId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getByZone(Long zoneId, Long currentUserId, boolean buildingScoped) {
        Zone zone = zoneRepo.findById(zoneId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy zone ID: " + zoneId));
        Long buildingId = zone.getFloor() != null && zone.getFloor().getBuilding() != null
                ? zone.getFloor().getBuilding().getId()
                : null;
        enforceStaffBuildingScope(buildingId, currentUserId, buildingScoped);
        return getByZone(zoneId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getAvailableByVehicleType(Long vehicleTypeId) {
        return slotRepo.findAvailableByVehicleType(vehicleTypeId);
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingSlot getById(Long id, Long currentUserId, boolean buildingScoped) {
        ParkingSlot slot = slotRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy slot ID: " + id));
        Long buildingId = slot.getZone() != null
                && slot.getZone().getFloor() != null
                && slot.getZone().getFloor().getBuilding() != null
                ? slot.getZone().getFloor().getBuilding().getId()
                : null;
        enforceStaffBuildingScope(buildingId, currentUserId, buildingScoped);
        return slot;
    }

    @Override
    @Transactional
    public ParkingSlot create(SlotRequest req, Long scopeBuildingId) {
        Zone zone = zoneRepo.findById(req.getZoneId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy zone ID: " + req.getZoneId()));
        enforceBuildingOwnership(zone, scopeBuildingId, "tạo slot cho");

        if (slotRepo.existsByZoneIdAndSlotCode(req.getZoneId(), req.getSlotCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Mã slot '" + req.getSlotCode() + "' đã tồn tại trong zone này");
        }

        ParkingSlot slot = ParkingSlot.builder()
            .zone(zone)
            .slotCode(req.getSlotCode())
            .slotSize(req.getSlotSize())
            .status(req.getStatus() != null ? req.getStatus() : Status.AVAILABLE)
            .isActive(true)
            .build();

        return slotRepo.save(slot);
    }

    @Override
    @Transactional
    public ParkingSlot update(Long id, SlotRequest req, Long scopeBuildingId) {
        ParkingSlot slot = slotRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy slot ID: " + id));
        enforceBuildingOwnership(slot.getZone(), scopeBuildingId, "sửa");

        if ((!slot.getZone().getId().equals(req.getZoneId()) || !slot.getSlotCode().equals(req.getSlotCode()))
                && slotRepo.existsByZoneIdAndSlotCode(req.getZoneId(), req.getSlotCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Mã slot '" + req.getSlotCode() + "' đã tồn tại trong zone này");
        }

        Zone zone = zoneRepo.findById(req.getZoneId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy zone ID: " + req.getZoneId()));
        // Neu doi sang zone khac, zone moi cung phai thuoc toa nha cua Manager
        enforceBuildingOwnership(zone, scopeBuildingId, "chuyển slot sang");

        slot.setZone(zone);
        slot.setSlotCode(req.getSlotCode());
        slot.setSlotSize(req.getSlotSize());
        if (req.getStatus() != null) {
            slot.setStatus(req.getStatus());
        }

        return slotRepo.save(slot);
    }

    @Override
    @Transactional
    public ParkingSlot updateStatus(Long id, Status newStatus) {
        ParkingSlot slot = slotRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy slot ID: " + id));
        slot.setStatus(newStatus);
        return slotRepo.save(slot);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> searchAvailableSlots(Long buildingId, Long vehicleTypeId, Long floorId) {
        return slotRepo.searchAvailableSlots(buildingId, vehicleTypeId, floorId);
    }

    @Override
    public void validateSelectable(Long slotId) {
        ParkingSlot slot = slotRepo.findById(slotId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy slot ID: " + slotId));

        if (slot.getStatus() == Status.MAINTENANCE) {
            throw new AppException(HttpStatus.CONFLICT,
                "Slot " + slot.getSlotCode() + " đang bảo trì, không thể chọn");
        }

        if (slot.getStatus() != Status.AVAILABLE) {
            throw new AppException(HttpStatus.CONFLICT,
                "Slot " + slot.getSlotCode() + " không khả dụng (trạng thái: " + slot.getStatus() + ")");
        }
    }

    @Override
    @Transactional
    public void delete(Long id, Long scopeBuildingId) {
        ParkingSlot slot = slotRepo.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy slot ID: " + id));
        enforceBuildingOwnership(slot.getZone(), scopeBuildingId, "xoá");
        slotRepo.delete(slot);
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
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem slot ngoài toà nhà được phân công");
        }
    }

    private void enforceBuildingOwnership(Zone zone, Long scopeBuildingId, String action) {
        if (scopeBuildingId == null) return;
        Long buildingId = zone != null && zone.getFloor() != null && zone.getFloor().getBuilding() != null
                ? zone.getFloor().getBuilding().getId() : null;
        if (!scopeBuildingId.equals(buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ được " + action + " slot thuộc toà nhà bạn quản lý");
        }
    }
}

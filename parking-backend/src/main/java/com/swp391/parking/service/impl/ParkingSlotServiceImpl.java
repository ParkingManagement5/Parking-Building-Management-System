package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.ParkingSlot.Status;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.ZoneRepository;
import com.swp391.parking.service.ParkingSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
public class ParkingSlotServiceImpl implements ParkingSlotService {

    private final ParkingSlotRepository slotRepo;
    private final ZoneRepository zoneRepo;

    @Override
    public List<ParkingSlot> getByZone(Long zoneId) {
        return slotRepo.findByZoneId(zoneId);
    }

    @Override
    public List<ParkingSlot> getAvailableByVehicleType(Long vehicleTypeId) {
        // FR-5: Driver xem slot trống khi đặt chỗ
        return slotRepo.findAvailableByVehicleType(vehicleTypeId);
    }

    @Override
    public ParkingSlot getById(Long id) {
        return slotRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy slot ID: " + id));
    }

    @Override
    @Transactional
    public ParkingSlot create(SlotRequest req) {
        // Kiểm tra global unique trước (DB schema: slot_code UNIQUE toàn hệ thống)
        if (slotRepo.existsBySlotCode(req.getSlotCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Mã slot '" + req.getSlotCode() + "' đã tồn tại trong hệ thống");
        }
        if (slotRepo.existsByZoneIdAndSlotCode(req.getZoneId(), req.getSlotCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Slot '" + req.getSlotCode() + "' đã tồn tại trong zone này");
        }

        Zone zone = zoneRepo.findById(req.getZoneId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy zone ID: " + req.getZoneId()));

        ParkingSlot slot = ParkingSlot.builder()
            .zone(zone)
            .slotCode(req.getSlotCode())
            .slotSize(req.getSlotSize())
            .status(Status.AVAILABLE) // luôn tạo mới với trạng thái AVAILABLE
            .isActive(true)
            .build();

        return slotRepo.save(slot);
    }

    @Override
    @Transactional
    public ParkingSlot update(Long id, SlotRequest req) {
        ParkingSlot slot = getById(id);
        // Nếu đổi slotCode thì kiểm tra không trùng với slot khác (global unique)
        if (!slot.getSlotCode().equals(req.getSlotCode())
                && slotRepo.existsBySlotCode(req.getSlotCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Mã slot '" + req.getSlotCode() + "' đã tồn tại trong hệ thống");
        }
        slot.setSlotCode(req.getSlotCode());
        slot.setSlotSize(req.getSlotSize());
        return slotRepo.save(slot);
    }

    @Override
    @Transactional
    public ParkingSlot updateStatus(Long id, Status newStatus) {
        // FR-3: Manager/Staff đổi trạng thái slot
        ParkingSlot slot = getById(id);
        slot.setStatus(newStatus);
        return slotRepo.save(slot);
    }

    @Override
    public List<ParkingSlot> searchAvailableSlots(Long buildingId, Long vehicleTypeId, Long floorId) {
        // Row 13: tìm slot AVAILABLE theo building + vehicleType, lọc thêm floor nếu có
        return slotRepo.searchAvailableSlots(buildingId, vehicleTypeId, floorId);
    }

    @Override
    public void validateSelectable(Long slotId) {
        // BR-11: slot MAINTENANCE không được chọn — gọi trước khi assign/đặt slot
        ParkingSlot slot = getById(slotId);
        if (slot.getStatus() == Status.MAINTENANCE) {
            throw new AppException(HttpStatus.CONFLICT,
                "Slot " + slot.getSlotCode() + " đang bảo trì, không thể chọn (BR-11)");
        }
        if (slot.getStatus() != Status.AVAILABLE) {
            throw new AppException(HttpStatus.CONFLICT,
                "Slot " + slot.getSlotCode() + " không khả dụng (trạng thái: " + slot.getStatus() + ")");
        }
    }
}

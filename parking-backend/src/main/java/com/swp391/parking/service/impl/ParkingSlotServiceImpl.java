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

@Service
@RequiredArgsConstructor
public class ParkingSlotServiceImpl implements ParkingSlotService {

    private final ParkingSlotRepository slotRepo;
    private final ZoneRepository zoneRepo;

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getByZone(Long zoneId) {
        return slotRepo.findByZoneId(zoneId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParkingSlot> getAvailableByVehicleType(Long vehicleTypeId) {
        return slotRepo.findAvailableByVehicleType(vehicleTypeId);
    }

    @Override
    @Transactional(readOnly = true)
    public ParkingSlot getById(Long id) {
        return slotRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay slot ID: " + id));
    }

    @Override
    @Transactional
    public ParkingSlot create(SlotRequest req) {
        if (slotRepo.existsByZoneIdAndSlotCode(req.getZoneId(), req.getSlotCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Ma slot '" + req.getSlotCode() + "' da ton tai trong zone nay");
        }

        Zone zone = zoneRepo.findById(req.getZoneId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay zone ID: " + req.getZoneId()));

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
    public ParkingSlot update(Long id, SlotRequest req) {
        ParkingSlot slot = getById(id);

        if ((!slot.getZone().getId().equals(req.getZoneId()) || !slot.getSlotCode().equals(req.getSlotCode()))
                && slotRepo.existsByZoneIdAndSlotCode(req.getZoneId(), req.getSlotCode())) {
            throw new AppException(HttpStatus.CONFLICT,
                "Ma slot '" + req.getSlotCode() + "' da ton tai trong zone nay");
        }

        Zone zone = zoneRepo.findById(req.getZoneId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Khong tim thay zone ID: " + req.getZoneId()));

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
        ParkingSlot slot = getById(id);
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
        ParkingSlot slot = getById(slotId);

        if (slot.getStatus() == Status.MAINTENANCE) {
            throw new AppException(HttpStatus.CONFLICT,
                "Slot " + slot.getSlotCode() + " dang bao tri, khong the chon");
        }

        if (slot.getStatus() != Status.AVAILABLE) {
            throw new AppException(HttpStatus.CONFLICT,
                "Slot " + slot.getSlotCode() + " khong kha dung (trang thai: " + slot.getStatus() + ")");
        }
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ParkingSlot slot = getById(id);
        slotRepo.delete(slot);
    }
}

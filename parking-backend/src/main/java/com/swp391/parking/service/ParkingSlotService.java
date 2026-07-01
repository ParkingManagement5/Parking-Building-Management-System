package com.swp391.parking.service;

import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.ParkingSlot.Status;

import java.util.List;

public interface ParkingSlotService {
    List<ParkingSlot> getAll();
    List<ParkingSlot> getByZone(Long zoneId);
    List<ParkingSlot> getByZone(Long zoneId, Long currentUserId, boolean staffScoped);
    List<ParkingSlot> getAvailableByVehicleType(Long vehicleTypeId);
    ParkingSlot getById(Long id, Long currentUserId, boolean staffScoped);
    ParkingSlot create(SlotRequest req);
    ParkingSlot update(Long id, SlotRequest req);
    ParkingSlot updateStatus(Long id, Status newStatus);
    List<ParkingSlot> searchAvailableSlots(Long buildingId, Long vehicleTypeId, Long floorId);
    void validateSelectable(Long slotId);
    void delete(Long id);
}

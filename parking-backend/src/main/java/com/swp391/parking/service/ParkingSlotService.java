package com.swp391.parking.service;

import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.ParkingSlot.Status;
import java.util.List;

public interface ParkingSlotService {
    List<ParkingSlot> getByZone(Long zoneId);
    List<ParkingSlot> getAvailableByVehicleType(Long vehicleTypeId); // FR-5
    ParkingSlot getById(Long id);
    ParkingSlot create(SlotRequest req);
    ParkingSlot update(Long id, SlotRequest req);
    ParkingSlot updateStatus(Long id, Status newStatus);            // FR-3
    void validateSelectable(Long slotId);                           // BR-11

 
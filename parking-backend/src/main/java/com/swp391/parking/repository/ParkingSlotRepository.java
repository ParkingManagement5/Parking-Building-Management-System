package com.swp391.parking.repository;

import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.ParkingSlot.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {

    List<ParkingSlot> findByZoneId(Long zoneId);

    List<ParkingSlot> findByZoneIdAndStatus(Long zoneId, Status status);

@Query(value = """
    SELECT ps.*
    FROM parking_slot ps
    JOIN zone z ON ps.zone_id = z.zone_id
    WHERE z.vehicle_type_id = :vehicleTypeId
      AND ps.status = 'AVAILABLE'
      AND ps.is_active = true
      AND z.is_active = true
    ORDER BY ps.slot_code
    """, nativeQuery = true)
List<ParkingSlot> findAvailableByVehicleType(@Param("vehicleTypeId") Long vehicleTypeId);

    boolean existsBySlotCode(String slotCode);

    boolean existsByZoneIdAndSlotCode(Long zoneId, String slotCode);

@Query(value = """
    SELECT ps.*
    FROM parking_slot ps
    JOIN zone z ON ps.zone_id = z.zone_id
    JOIN floor f ON z.floor_id = f.floor_id
    JOIN parking_building b ON f.building_id = b.building_id
    WHERE b.building_id = :buildingId
      AND z.vehicle_type_id = :vehicleTypeId
      AND (:floorId IS NULL OR f.floor_id = :floorId)
      AND ps.status = 'AVAILABLE'
      AND ps.is_active = true
      AND z.is_active = true
      AND f.is_active = true
      AND b.is_active = true
    ORDER BY ps.slot_code
    """, nativeQuery = true)
List<ParkingSlot> searchAvailableSlots(
        @Param("buildingId") Long buildingId,
        @Param("vehicleTypeId") Long vehicleTypeId,
        @Param("floorId") Long floorId
);
}
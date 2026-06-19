package com.swp391.parking.repository;

import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.ParkingSlot.Status;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {

    List<ParkingSlot> findByZoneId(Long zoneId);

    List<ParkingSlot> findByZoneIdAndStatus(Long zoneId, Status status);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT ps FROM ParkingSlot ps WHERE ps.id = :slotId")
Optional<ParkingSlot> findByIdForUpdate(@Param("slotId") Long slotId);

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

@Query(value = """
    SELECT ps.*
    FROM parking_slot ps
    JOIN zone z ON ps.zone_id = z.zone_id
    JOIN floor f ON z.floor_id = f.floor_id
    WHERE f.building_id = :buildingId
      AND ps.slot_size = :slotSize
      AND ps.status = 'AVAILABLE'
      AND ps.is_active = true
      AND z.is_active = true
      AND f.is_active = true
    ORDER BY f.floor_number, ps.slot_code
    """, nativeQuery = true)
List<ParkingSlot> findAvailableByBuildingAndSlotSize(
        @Param("buildingId") Long buildingId,
        @Param("slotSize") ParkingSlot.SlotSize slotSize
);

@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("""
    SELECT ps
    FROM ParkingSlot ps
    JOIN ps.zone z
    JOIN z.floor f
    JOIN f.building b
    WHERE b.id = :buildingId
      AND ps.slotSize = :slotSize
      AND ps.status = 'AVAILABLE'
      AND ps.isActive = true
      AND z.isActive = true
      AND f.isActive = true
      AND b.isActive = true
    ORDER BY f.floorNumber, ps.slotCode, ps.id
    """)
List<ParkingSlot> findFirstAvailableByBuildingAndSlotSizeForUpdate(
        @Param("buildingId") Long buildingId,
        @Param("slotSize") ParkingSlot.SlotSize slotSize,
        Pageable pageable
);

@Query(value = """
    SELECT ps.*
    FROM parking_slot ps
    JOIN zone z ON ps.zone_id = z.zone_id
    JOIN floor f ON z.floor_id = f.floor_id
    WHERE ps.slot_size = :slotSize
      AND ps.status = 'AVAILABLE'
      AND ps.is_active = true
      AND z.is_active = true
      AND f.is_active = true
    ORDER BY f.floor_number, ps.slot_code
    """, nativeQuery = true)
List<ParkingSlot> findAvailableBySlotSize(@Param("slotSize") ParkingSlot.SlotSize slotSize);
}

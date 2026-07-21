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
        @Param("slotSize") String slotSize
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
List<ParkingSlot> findAvailableBySlotSize(@Param("slotSize") String slotSize);

    // Toan bo slot he thong, JOIN FETCH mot lan de tranh N+1 (truoc day frontend
    // phai goi rieng tung zone, hang tram request cho trang cong khai/landing).
    @Query("""
        SELECT ps FROM ParkingSlot ps
        JOIN FETCH ps.zone z
        JOIN FETCH z.floor f
        JOIN FETCH f.building b
        JOIN FETCH z.vehicleType
        """)
    List<ParkingSlot> findAllWithDetails();

    @Query(value = """
        SELECT
            COUNT(DISTINCT b.building_id) AS buildingCount,
            COUNT(*) AS total,
            SUM(CASE WHEN ps.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN ps.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied
        FROM parking_slot ps
        JOIN zone z ON ps.zone_id = z.zone_id
        JOIN floor f ON z.floor_id = f.floor_id
        JOIN parking_building b ON f.building_id = b.building_id
        """, nativeQuery = true)
    PublicSlotStatsProjection getPublicStats();

    interface PublicSlotStatsProjection {
        Long getBuildingCount();
        Long getTotal();
        Long getAvailable();
        Long getOccupied();
    }
}

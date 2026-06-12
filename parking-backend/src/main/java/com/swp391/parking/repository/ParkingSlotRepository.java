package com.swp391.parking.repository;

import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.ParkingSlot.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {

    List<ParkingSlot> findByZoneId(Long zoneId);

    List<ParkingSlot> findByZoneIdAndStatus(Long zoneId, Status status);

    // FR-5: tìm slot AVAILABLE theo loại xe — Driver dùng khi đặt chỗ
    @Query("""
        SELECT s FROM ParkingSlot s
        JOIN s.zone z
        WHERE z.vehicleType.id = :vehicleTypeId
          AND s.status = 'AVAILABLE'
          AND s.isActive = true
          AND z.isActive = true
        """)
    List<ParkingSlot> findAvailableByVehicleType(@Param("vehicleTypeId") Long vehicleTypeId);

    boolean existsByZoneIdAndSlotCode(Long zoneId, String slotCode);

    boolean existsBySlotCode(String slotCode);

    // Row 13: tìm slot AVAILABLE theo building + vehicleType, lọc thêm floor nếu có
    @Query("""
        SELECT s FROM ParkingSlot s
        JOIN s.zone z
        JOIN z.floor f
        WHERE f.building.id = :buildingId
          AND z.vehicleType.id = :vehicleTypeId
          AND s.status = 'AVAILABLE'
          AND s.isActive = true
          AND z.isActive = true
          AND (:floorId IS NULL OR f.id = :floorId)
        ORDER BY s.slotCode
        """)
    List<ParkingSlot> searchAvailableSlots(
            @Param("buildingId") Long buildingId,
            @Param("vehicleTypeId") Long vehicleTypeId,
            @Param("floorId") Long floorId);

    // BR-02: SlotAssignmentService — tìm slot AVAILABLE theo slotSize trong 1 building
    @Query("""
        SELECT s FROM ParkingSlot s
        JOIN s.zone z
        JOIN z.floor f
        WHERE f.building.id = :buildingId
          AND s.slotSize = :slotSize
          AND s.status = 'AVAILABLE'
          AND s.isActive = true
        """)
    List<ParkingSlot> findAvailableByBuildingAndSlotSize(
            @Param("buildingId") Long buildingId,
            @Param("slotSize") ParkingSlot.SlotSize slotSize);

    // BR-02: SlotAssignmentService — tìm slot AVAILABLE theo slotSize, bất kỳ building
    List<ParkingSlot> findBySlotSizeAndStatusAndIsActiveTrue(
            ParkingSlot.SlotSize slotSize, Status status);

    default List<ParkingSlot> findAvailableBySlotSize(ParkingSlot.SlotSize slotSize) {
        return findBySlotSizeAndStatusAndIsActiveTrue(slotSize, Status.AVAILABLE);
    }
}

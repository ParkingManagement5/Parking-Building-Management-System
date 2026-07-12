package com.swp391.parking.repository;

import com.swp391.parking.entity.PricingPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PricingPolicyRepository extends JpaRepository<PricingPolicy, Long> {

    List<PricingPolicy> findByVehicleType_IdAndIsActiveTrue(Long vehicleTypeId);

    List<PricingPolicy> findByIsActiveTrue();

    // Tra ve TAT CA phien ban (ke ca da bi thay the) de tinh phi lich su chinh xac
    // cho cac phien do da qua thoi diem Manager sua gia.
    List<PricingPolicy> findByVehicleType_Id(Long vehicleTypeId);

    // ── Per-building pricing ────────────────────────────────────────────────
    // building_id NULL = gia mac dinh (global default) ap dung khi 1 toa nha
    // chua tu cau hinh gia rieng cho loai xe do.
    List<PricingPolicy> findByVehicleType_IdAndBuilding_Id(Long vehicleTypeId, Long buildingId);

    List<PricingPolicy> findByVehicleType_IdAndBuildingIsNull(Long vehicleTypeId);

    List<PricingPolicy> findByVehicleType_IdAndBuilding_IdAndIsActiveTrue(Long vehicleTypeId, Long buildingId);

    List<PricingPolicy> findByVehicleType_IdAndBuildingIsNullAndIsActiveTrue(Long vehicleTypeId);

    List<PricingPolicy> findByBuilding_Id(Long buildingId);

    List<PricingPolicy> findByBuildingIsNull();

    /**
     * Danh sach policy (TAT CA phien ban) ap dung cho 1 toa nha + loai xe:
     * uu tien policy rieng cua toa nha, neu toa chua tu cau hinh thi fallback
     * ve policy global (building_id IS NULL).
     */
    default List<PricingPolicy> resolveForBuilding(Long vehicleTypeId, Long buildingId) {
        if (buildingId == null) {
            return findByVehicleType_Id(vehicleTypeId);
        }
        List<PricingPolicy> scoped = findByVehicleType_IdAndBuilding_Id(vehicleTypeId, buildingId);
        return scoped.isEmpty() ? findByVehicleType_IdAndBuildingIsNull(vehicleTypeId) : scoped;
    }

    /** Giong resolveForBuilding nhung chi lay phien ban dang active. */
    default List<PricingPolicy> resolveActiveForBuilding(Long vehicleTypeId, Long buildingId) {
        if (buildingId == null) {
            return findByVehicleType_IdAndIsActiveTrue(vehicleTypeId);
        }
        List<PricingPolicy> scoped = findByVehicleType_IdAndBuilding_IdAndIsActiveTrue(vehicleTypeId, buildingId);
        return scoped.isEmpty() ? findByVehicleType_IdAndBuildingIsNullAndIsActiveTrue(vehicleTypeId) : scoped;
    }
}

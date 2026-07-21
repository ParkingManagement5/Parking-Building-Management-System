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
}
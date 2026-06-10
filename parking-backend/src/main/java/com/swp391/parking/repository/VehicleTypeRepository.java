package com.swp391.parking.repository;

import com.swp391.parking.entity.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VehicleTypeRepository extends JpaRepository<VehicleType, Long> {

    List<VehicleType> findByIsActiveTrue();

    // FR-4: tên loại xe phải unique
    boolean existsByName(String name);
}

package com.swp391.parking.repository;

import com.swp391.parking.entity.ParkingBuilding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ParkingBuildingRepository extends JpaRepository<ParkingBuilding, Long> {

    List<ParkingBuilding> findByIsActiveTrue();

    boolean existsByName(String name);
}

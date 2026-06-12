package com.swp391.parking.repository;

import com.swp391.parking.entity.Floor;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FloorRepository extends JpaRepository<Floor, Long> {

    List<Floor> findByBuildingId(Long buildingId);

    @EntityGraph(attributePaths = {"building"})
    List<Floor> findByBuildingIdAndIsActiveTrue(Long buildingId);

    boolean existsByBuildingIdAndFloorNumber(Long buildingId, Integer floorNumber);
}

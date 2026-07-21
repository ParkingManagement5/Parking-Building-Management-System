package com.swp391.parking.repository;

import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.Gate.GateType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GateRepository extends JpaRepository<Gate, Long> {

    @EntityGraph(attributePaths = {"building"})
    List<Gate> findByBuildingId(Long buildingId);

    @EntityGraph(attributePaths = {"building"})
    List<Gate> findByBuildingIdAndIsActiveTrue(Long buildingId);

    boolean existsByGateCode(String gateCode);

    @EntityGraph(attributePaths = {"building"})
    Optional<Gate> findByGateCodeIgnoreCase(String gateCode);

    @EntityGraph(attributePaths = {"building"})
    List<Gate> findByBuildingIdAndGateTypeAndIsActiveTrue(Long buildingId, GateType gateType);
}

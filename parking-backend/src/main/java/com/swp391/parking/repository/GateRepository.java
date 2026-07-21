package com.swp391.parking.repository;

import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.Gate.GateType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GateRepository extends JpaRepository<Gate, Long> {

    List<Gate> findByBuildingId(Long buildingId);

    List<Gate> findByBuildingIdAndIsActiveTrue(Long buildingId);

    boolean existsByGateCode(String gateCode);

<<<<<<< HEAD
=======
    Optional<Gate> findByGateCode(String gateCode);

    @EntityGraph(attributePaths = {"building"})
>>>>>>> 317e6bc (feat: revenue report - daily/monthly chart, vehicle type breakdown)
    List<Gate> findByBuildingIdAndGateTypeAndIsActiveTrue(Long buildingId, GateType gateType);
}

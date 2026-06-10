package com.swp391.parking.repository;

import com.swp391.parking.entity.Zone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ZoneRepository extends JpaRepository<Zone, Long> {

    List<Zone> findByFloorIdAndIsActiveTrue(Long floorId);

    List<Zone> findByVehicleTypeIdAndIsActiveTrue(Long vehicleTypeId);

    boolean existsByFloorIdAndName(Long floorId, String name);
}

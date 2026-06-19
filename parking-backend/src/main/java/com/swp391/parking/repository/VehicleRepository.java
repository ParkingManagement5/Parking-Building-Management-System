package com.swp391.parking.repository;

import com.swp391.parking.entity.Vehicle;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByUserIdAndIsActiveTrue(Integer userId);

    List<Vehicle> findByVehicleTypeId(Long vehicleTypeId);

    Optional<Vehicle> findByLicensePlate(String licensePlate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Vehicle v WHERE v.id = :vehicleId")
    Optional<Vehicle> findByIdForUpdate(@Param("vehicleId") Long vehicleId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Vehicle v WHERE v.licensePlate = :licensePlate")
    Optional<Vehicle> findByLicensePlateForUpdate(@Param("licensePlate") String licensePlate);

    boolean existsByLicensePlate(String licensePlate);
}

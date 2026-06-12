package com.swp391.parking.repository;

import com.swp391.parking.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByUserIdAndIsActiveTrue(Long userId);

    // Staff dùng khi xe vào/ra cổng
    Optional<Vehicle> findByLicensePlate(String licensePlate);

    // Biển số phải unique toàn hệ thống
    boolean existsByLicensePlate(String licensePlate);
}

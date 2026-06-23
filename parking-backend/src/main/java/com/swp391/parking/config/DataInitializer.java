package com.swp391.parking.config;

import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private static final String[] STAFF_TEST_PLATES = {
            "30K-550.55",
            "38A-666.66",
            "59G2-67890"
    };

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleTypeRepository vehicleTypeRepository;

    @Override
    @Transactional
    public void run(String... args) {
        User driver = userRepository.findByUsername("driver1")
                .or(() -> userRepository.findByRolesRoleName(Role.RoleName.DRIVER).stream().findFirst())
                .or(() -> userRepository.findAll().stream().findFirst())
                .orElse(null);
        VehicleType carType = vehicleTypeRepository.findByIsActiveTrue().stream()
                .filter(type -> "MEDIUM".equals(type.getSlotSize().name()))
                .findFirst()
                .or(() -> vehicleTypeRepository.findByIsActiveTrue().stream().findFirst())
                .orElse(null);

        if (driver == null || carType == null) {
            log.warn("Skip staff test plate seed because driver={} carType={}", driver != null, carType != null);
            return;
        }

        for (String plate : STAFF_TEST_PLATES) {
            if (!vehicleRepository.existsByLicensePlate(plate)) {
                vehicleRepository.save(Vehicle.builder()
                        .userId(driver.getUserId().longValue())
                        .vehicleType(carType)
                        .licensePlate(plate)
                        .brand("Test")
                        .model("Staff Flow")
                        .color("White")
                        .isActive(true)
                        .build());
                log.info("Seeded staff test vehicle plate {} for user #{}", plate, driver.getUserId());
            }
        }
    }
}

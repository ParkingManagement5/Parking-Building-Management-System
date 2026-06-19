package com.swp391.parking.repository;

import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VehicleRepositoryLockingTest extends AbstractIntegrationTestSupport {

    @Test
    void findByIdForUpdate_shouldReturnVehicle() {
        Vehicle vehicle = createTestVehicle("lock-id-owner", "51A-LOCK1");

        Optional<Vehicle> result = vehicleRepository.findByIdForUpdate(vehicle.getId());

        assertTrue(result.isPresent());
        assertEquals(vehicle.getId(), result.get().getId());
    }

    @Test
    void findByLicensePlateForUpdate_shouldReturnVehicle() {
        Vehicle vehicle = createTestVehicle("lock-plate-owner", "51A-LOCK2");

        Optional<Vehicle> result = vehicleRepository.findByLicensePlateForUpdate(vehicle.getLicensePlate());

        assertTrue(result.isPresent());
        assertEquals(vehicle.getId(), result.get().getId());
    }

    @Test
    void findByLicensePlateForUpdate_shouldReturnEmptyForUnknownPlate() {
        Optional<Vehicle> result = vehicleRepository.findByLicensePlateForUpdate("51A-UNKNOWN");

        assertTrue(result.isEmpty());
    }

    private Vehicle createTestVehicle(String username, String plate) {
        User owner = createUser(username, com.swp391.parking.entity.Role.RoleName.DRIVER);
        VehicleType vehicleType = createVehicleType("Lock Vehicle Type " + plate, VehicleType.SlotSize.MEDIUM);
        return createVehicle(owner, vehicleType, plate);
    }
}

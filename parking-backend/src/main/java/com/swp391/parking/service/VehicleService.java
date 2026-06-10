package com.swp391.parking.service;

import com.swp391.parking.dto.request.VehicleRequest;
import com.swp391.parking.entity.Vehicle;
import java.util.List;

public interface VehicleService {
    List<Vehicle> getByUser(Integer userId);
    Vehicle getById(Long id);
    Vehicle getByLicensePlate(String licensePlate); // Staff dùng khi xe vào/ra
    Vehicle create(Integer userId, VehicleRequest req);
    Vehicle update(Long id, VehicleRequest req);
    void deactivate(Long id);
}

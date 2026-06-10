package com.swp391.parking.service;

import com.swp391.parking.dto.request.VehicleTypeRequest;
import com.swp391.parking.entity.VehicleType;
import java.util.List;

public interface VehicleTypeService {
    List<VehicleType> getAll();
    VehicleType getById(Long id);
    VehicleType create(VehicleTypeRequest req);
    VehicleType update(Long id, VehicleTypeRequest req);
    void deactivate(Long id); // FR-4: deactivate giữ lại lịch sử
}

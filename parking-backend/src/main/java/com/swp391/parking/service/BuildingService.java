package com.swp391.parking.service;

import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.entity.ParkingBuilding;
import java.util.List;

public interface BuildingService {
    List<ParkingBuilding> getAll();
    ParkingBuilding getById(Long id);
    ParkingBuilding create(BuildingRequest req);
    ParkingBuilding update(Long id, BuildingRequest req, Long scopeBuildingId);
    void deactivate(Long id, Long scopeBuildingId);
}

package com.swp391.parking.service;

import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.entity.Floor;
import java.util.List;

public interface FloorService {
    List<Floor> getByBuilding(Long buildingId);
    List<Floor> getByBuilding(Long buildingId, Long currentUserId, boolean buildingScoped);
    Floor getById(Long id, Long currentUserId, boolean buildingScoped);
    List<Floor> getAll(Long scopeBuildingId);
    Floor create(FloorRequest req, Long scopeBuildingId);
    Floor update(Long id, FloorRequest req, Long scopeBuildingId);
    void deactivate(Long id, Long scopeBuildingId);
}

package com.swp391.parking.service;

import com.swp391.parking.dto.request.ZoneRequest;
import com.swp391.parking.entity.Zone;
import java.util.List;

public interface ZoneService {
    List<Zone> getByFloor(Long floorId);
    List<Zone> getByFloor(Long floorId, Long currentUserId, boolean buildingScoped);
    Zone getById(Long id, Long currentUserId, boolean buildingScoped);
    List<Zone> getAll(Long scopeBuildingId);
    Zone create(ZoneRequest req, Long scopeBuildingId);
    Zone update(Long id, ZoneRequest req, Long scopeBuildingId);
    void deactivate(Long id, Long scopeBuildingId);
}

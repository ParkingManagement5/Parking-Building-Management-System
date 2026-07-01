package com.swp391.parking.service;

import com.swp391.parking.dto.request.ZoneRequest;
import com.swp391.parking.entity.Zone;
import java.util.List;

public interface ZoneService {
    List<Zone> getByFloor(Long floorId);
    List<Zone> getByFloor(Long floorId, Long currentUserId, boolean staffScoped);
    Zone getById(Long id, Long currentUserId, boolean staffScoped);
    Zone create(ZoneRequest req);
    Zone update(Long id, ZoneRequest req);
    void deactivate(Long id);
}

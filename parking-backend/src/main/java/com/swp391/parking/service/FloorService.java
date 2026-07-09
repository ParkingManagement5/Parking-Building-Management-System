package com.swp391.parking.service;

import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.entity.Floor;
import java.util.List;

public interface FloorService {
    List<Floor> getByBuilding(Long buildingId);
    Floor getById(Long id);
    Floor create(FloorRequest req);
    Floor update(Long id, FloorRequest req);
    void deactivate(Long id);
}

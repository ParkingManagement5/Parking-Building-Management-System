package com.swp391.parking.service;

import com.swp391.parking.dto.request.GateRequest;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.Gate.GateType;
import java.util.List;

public interface GateService {
    List<Gate> getByBuilding(Long buildingId);
    List<Gate> getActiveByBuilding(Long buildingId);
    List<Gate> getByBuildingAndType(Long buildingId, GateType gateType);
    Gate getById(Long id);
    Gate create(GateRequest req);
    Gate update(Long id, GateRequest req);
    void deactivate(Long id);
}

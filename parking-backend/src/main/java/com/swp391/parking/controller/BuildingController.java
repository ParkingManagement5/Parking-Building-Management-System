package com.swp391.parking.controller;

import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.service.BuildingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/parking-buildings")
@RequiredArgsConstructor
public class BuildingController {

    private final BuildingService buildingService;
    private final ParkingSlotRepository slotRepository;

    // -----------------------------------------------------------------------
    // Public: tình trạng lấp đầy theo tòa nhà — driver xem trước khi đặt chỗ
    // GET /api/v1/parking-buildings/availability
    // -----------------------------------------------------------------------
    @GetMapping("/availability")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getBuildingAvailability() {
        List<Object[]> raw = slotRepository.getBuildingOccupancy();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : raw) {
            int total     = ((Number) row[1]).intValue();
            int available = ((Number) row[2]).intValue();
            int occupied  = ((Number) row[3]).intValue();
            int reserved  = ((Number) row[4]).intValue();
            int pct = total > 0 ? Math.round((float)(total - available) / total * 100) : 0;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("buildingId",       ((Number) row[0]).longValue());
            item.put("totalSlots",       total);
            item.put("availableSlots",   available);
            item.put("occupiedSlots",    occupied);
            item.put("reservedSlots",    reserved);
            item.put("occupancyPercent", pct);
            result.add(item);
        }
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ParkingBuilding>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(buildingService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ParkingBuilding>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(buildingService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingBuilding>> create(
            @Valid @RequestBody BuildingRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tao toa nha thanh cong",
            buildingService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingBuilding>> update(
            @PathVariable Long id,
            @Valid @RequestBody BuildingRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cap nhat toa nha thanh cong",
            buildingService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        buildingService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Da xoa toa nha khoi DB"));
    }
}

package com.swp391.parking.controller;

import com.swp391.parking.dto.request.BuildingRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.service.BuildingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/parking-buildings")
@RequiredArgsConstructor
public class BuildingController {

    private final BuildingService buildingService;

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
        return ResponseEntity.ok(ApiResponse.success("Tạo toà nhà thành công",
            buildingService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingBuilding>> update(
            @PathVariable Long id,
            @Valid @RequestBody BuildingRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật toà nhà thành công",
            buildingService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        buildingService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xoá toà nhà khỏi DB"));
    }
}

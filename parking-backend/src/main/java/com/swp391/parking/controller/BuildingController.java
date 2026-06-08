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

/**
 * Quản lý tòa nhà bãi đỗ xe.
 * GET /api/v1/parking-buildings/** đã được SecurityConfig whitelist (public).
 */
@RestController
@RequestMapping("/api/v1/parking-buildings")
@RequiredArgsConstructor
public class BuildingController {

    private final BuildingService buildingService;

    /** GET /api/v1/parking-buildings — public, không cần đăng nhập */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ParkingBuilding>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(buildingService.getAll()));
    }

    /** GET /api/v1/parking-buildings/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ParkingBuilding>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(buildingService.getById(id)));
    }

    /** POST /api/v1/parking-buildings — chỉ MANAGER, ADMIN */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingBuilding>> create(
            @Valid @RequestBody BuildingRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tạo tòa nhà thành công",
            buildingService.create(req)));
    }

    /** PUT /api/v1/parking-buildings/{id} */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingBuilding>> update(
            @PathVariable Long id,
            @Valid @RequestBody BuildingRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tòa nhà thành công",
            buildingService.update(id, req)));
    }

    /** DELETE /api/v1/parking-buildings/{id} — soft delete */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        buildingService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hóa tòa nhà"));
    }
}

package com.swp391.parking.controller;

import com.swp391.parking.dto.request.GateRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.Gate.GateType;
import com.swp391.parking.service.GateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/gates")
@RequiredArgsConstructor
public class GateController {

    private final GateService gateService;

    /** GET /api/v1/gates?buildingId=1 — lấy tất cả cổng theo tòa nhà */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Gate>>> getByBuilding(
            @RequestParam Long buildingId) {
        return ResponseEntity.ok(ApiResponse.success(gateService.getByBuilding(buildingId)));
    }

    /** GET /api/v1/gates/active?buildingId=1 — lấy cổng đang hoạt động */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<Gate>>> getActiveByBuilding(
            @RequestParam Long buildingId) {
        return ResponseEntity.ok(ApiResponse.success(gateService.getActiveByBuilding(buildingId)));
    }

    /** GET /api/v1/gates/by-type?buildingId=1&gateType=ENTRY */
    @GetMapping("/by-type")
    public ResponseEntity<ApiResponse<List<Gate>>> getByType(
            @RequestParam Long buildingId,
            @RequestParam GateType gateType) {
        return ResponseEntity.ok(ApiResponse.success(
            gateService.getByBuildingAndType(buildingId, gateType)));
    }

    /** GET /api/v1/gates/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Gate>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(gateService.getById(id)));
    }

    /** POST /api/v1/gates — chỉ MANAGER, ADMIN */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Gate>> create(@Valid @RequestBody GateRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tạo cổng thành công",
            gateService.create(req)));
    }

    /** PUT /api/v1/gates/{id} */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Gate>> update(
            @PathVariable Long id,
            @Valid @RequestBody GateRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật cổng thành công",
            gateService.update(id, req)));
    }

    /** DELETE /api/v1/gates/{id} — soft delete */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        gateService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hóa cổng"));
    }
}

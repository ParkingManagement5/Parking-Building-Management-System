package com.swp391.parking.controller;

import com.swp391.parking.dto.request.VehicleTypeRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.service.VehicleTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * FR-2: GET vehicle-types nên là public để Driver thấy khi đặt chỗ.
 * Quang cần thêm "/api/v1/vehicle-types/**" vào PUBLIC_URLS trong SecurityConfig.
 * Hiện tại các GET yêu cầu đăng nhập (đủ dùng cho Driver đã login).
 */
@RestController
@RequestMapping("/api/v1/vehicle-types")
@RequiredArgsConstructor
public class VehicleTypeController {

    private final VehicleTypeService vehicleTypeService;

    /** GET /api/v1/vehicle-types */
    @GetMapping
    public ResponseEntity<ApiResponse<List<VehicleType>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(vehicleTypeService.getAll()));
    }

    /** GET /api/v1/vehicle-types/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VehicleType>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vehicleTypeService.getById(id)));
    }

    /** POST /api/v1/vehicle-types */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<VehicleType>> create(
            @Valid @RequestBody VehicleTypeRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tạo loại xe thành công",
            vehicleTypeService.create(req)));
    }

    /** PUT /api/v1/vehicle-types/{id} */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<VehicleType>> update(
            @PathVariable Long id,
            @Valid @RequestBody VehicleTypeRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật loại xe thành công",
            vehicleTypeService.update(id, req)));
    }

    /** DELETE /api/v1/vehicle-types/{id} — FR-4: deactivate, giữ lịch sử */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        vehicleTypeService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hóa loại xe"));
    }
}

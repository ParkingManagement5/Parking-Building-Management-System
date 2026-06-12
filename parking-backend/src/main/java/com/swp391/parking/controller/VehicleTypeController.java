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

@RestController
@RequestMapping("/api/v1/vehicle-types")
@RequiredArgsConstructor
public class VehicleTypeController {

    private final VehicleTypeService vehicleTypeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<VehicleType>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(vehicleTypeService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VehicleType>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vehicleTypeService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<VehicleType>> create(
            @Valid @RequestBody VehicleTypeRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tao loai xe thanh cong",
            vehicleTypeService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<VehicleType>> update(
            @PathVariable Long id,
            @Valid @RequestBody VehicleTypeRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cap nhat loai xe thanh cong",
            vehicleTypeService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        vehicleTypeService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Da xoa loai xe khoi DB"));
    }
}

package com.swp391.parking.controller;

import com.swp391.parking.dto.request.ZoneRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.service.ZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/zones")
@RequiredArgsConstructor
public class ZoneController {

    private final ZoneService zoneService;

    /** GET /api/v1/zones/floor/{floorId} */
    @GetMapping("/floor/{floorId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<Zone>>> getByFloor(@PathVariable Long floorId) {
        return ResponseEntity.ok(ApiResponse.success(zoneService.getByFloor(floorId)));
    }

    /** GET /api/v1/zones/{id} */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(zoneService.getById(id)));
    }

    /** POST /api/v1/zones */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> create(@Valid @RequestBody ZoneRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tạo zone thành công",
            zoneService.create(req)));
    }

    /** PUT /api/v1/zones/{id} */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> update(
            @PathVariable Long id,
            @Valid @RequestBody ZoneRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật zone thành công",
            zoneService.update(id, req)));
    }

    /** DELETE /api/v1/zones/{id} — soft delete */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        zoneService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hóa zone"));
    }
}

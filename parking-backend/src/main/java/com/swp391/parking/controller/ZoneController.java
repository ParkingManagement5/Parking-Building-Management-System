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

    @GetMapping("/floor/{floorId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<Zone>>> getByFloor(@PathVariable Long floorId) {
        return ResponseEntity.ok(ApiResponse.success(zoneService.getByFloor(floorId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(zoneService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> create(@Valid @RequestBody ZoneRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tao zone thanh cong",
            zoneService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> update(
            @PathVariable Long id,
            @Valid @RequestBody ZoneRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cap nhat zone thanh cong",
            zoneService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        zoneService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Da xoa zone khoi DB"));
    }
}

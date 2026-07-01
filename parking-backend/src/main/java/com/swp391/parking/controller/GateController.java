package com.swp391.parking.controller;

import com.swp391.parking.dto.request.GateRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.Gate.GateType;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.service.GateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gates")
@RequiredArgsConstructor
public class GateController {

    private final GateService gateService;
    private final GateRepository gateRepository;

    @GetMapping("/all")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<Gate>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(gateRepository.findAll()));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Gate>>> getByBuilding(@RequestParam Long buildingId) {
        return ResponseEntity.ok(ApiResponse.success(gateService.getByBuilding(buildingId)));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<Gate>>> getActiveByBuilding(@RequestParam Long buildingId) {
        return ResponseEntity.ok(ApiResponse.success(gateService.getActiveByBuilding(buildingId)));
    }

    @GetMapping("/by-type")
    public ResponseEntity<ApiResponse<List<Gate>>> getByType(
            @RequestParam Long buildingId,
            @RequestParam GateType gateType) {
        return ResponseEntity.ok(ApiResponse.success(
            gateService.getByBuildingAndType(buildingId, gateType)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Gate>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(gateService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Gate>> create(@Valid @RequestBody GateRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tao cong thanh cong",
            gateService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Gate>> update(
            @PathVariable Long id,
            @Valid @RequestBody GateRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cap nhat cong thanh cong",
            gateService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        gateService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Da xoa cong khoi DB"));
    }
}

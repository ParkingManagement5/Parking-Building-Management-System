package com.swp391.parking.controller;

import com.swp391.parking.dto.request.SystemConfigRequest;
import com.swp391.parking.dto.response.SystemConfigResponse;
import com.swp391.parking.service.SystemConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/system-configs")
@RequiredArgsConstructor
@Tag(name = "System Config", description = "Manage system configurations")
public class SystemConfigController {

    private final SystemConfigService systemConfigService;

    @PostMapping
    @Operation(summary = "Create config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemConfigResponse> create(
            @Valid @RequestBody SystemConfigRequest request,
            @RequestParam int updatedBy) {
        return ResponseEntity.ok(systemConfigService.create(request, updatedBy));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemConfigResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody SystemConfigRequest request,
            @RequestParam int updatedBy) {
        return ResponseEntity.ok(systemConfigService.update(id, request, updatedBy));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get config by ID")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemConfigResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(systemConfigService.getById(id));
    }

    @GetMapping("/key/{configKey}")
    @Operation(summary = "Get config by key")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemConfigResponse> getByKey(@PathVariable String configKey) {
        return ResponseEntity.ok(systemConfigService.getByKey(configKey));
    }

    @GetMapping
    @Operation(summary = "Get all configs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SystemConfigResponse>> getAll() {
        return ResponseEntity.ok(systemConfigService.getAll());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete config")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        systemConfigService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

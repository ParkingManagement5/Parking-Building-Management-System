package com.swp391.parking.controller;

import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.PricingPolicyResponse;
import com.swp391.parking.service.PricingPolicyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pricing")
@RequiredArgsConstructor
@Tag(name = "Pricing Policy", description = "Manage pricing policies")
public class PricingPolicyController {

    private final PricingPolicyService pricingPolicyService;

    @PostMapping
    @Operation(summary = "Create pricing policy")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PricingPolicyResponse>> create(
            @Valid @RequestBody CreatePricingPolicyRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Policy created", pricingPolicyService.createPolicy(request)));
    }

    @GetMapping
    @Operation(summary = "Get all pricing policies")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<PricingPolicyResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(pricingPolicyService.getAllPolicies()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get pricing policy by ID")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PricingPolicyResponse>> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(pricingPolicyService.getPolicy(id)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update pricing policy")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PricingPolicyResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CreatePricingPolicyRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Policy updated", pricingPolicyService.updatePolicy(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deactivate pricing policy (soft-delete, preserves history for fee recalculation)")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        pricingPolicyService.deletePolicy(id);
        return ResponseEntity.ok(ApiResponse.success("Đã tắt bảng giá", null));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activate pricing policy")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PricingPolicyResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Policy activated", pricingPolicyService.activatePolicy(id)));
    }
}

package com.swp391.parking.controller;

import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.response.PricingPolicyResponse;
import com.swp391.parking.service.PricingPolicyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<PricingPolicyResponse> create(
            @Valid @RequestBody CreatePricingPolicyRequest request) {
        return ResponseEntity.ok(pricingPolicyService.createPolicy(request));
    }

    @GetMapping
    @Operation(summary = "Get all pricing policies")
    public ResponseEntity<List<PricingPolicyResponse>> getAll() {
        return ResponseEntity.ok(pricingPolicyService.getAllPolicies());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get pricing policy by ID")
    public ResponseEntity<PricingPolicyResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(pricingPolicyService.getPolicy(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update pricing policy")
    public ResponseEntity<PricingPolicyResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CreatePricingPolicyRequest request) {
        return ResponseEntity.ok(pricingPolicyService.updatePolicy(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete pricing policy")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        pricingPolicyService.deletePolicy(id);
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{id}/activate")
@Operation(summary = "Activate pricing policy")
public ResponseEntity<PricingPolicyResponse> activate(@PathVariable Long id) {
    return ResponseEntity.ok(pricingPolicyService.activatePolicy(id));
}
}
package com.swp391.parking.controller;

import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.PricingPolicyResponse;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.PricingPolicyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/pricing")
@RequiredArgsConstructor
@Tag(name = "Pricing Policy", description = "Manage pricing policies")
public class PricingPolicyController {

    private final PricingPolicyService pricingPolicyService;
    private final UserRepository userRepository;

    // Chi Manager duoc dat/sua bang gia, gioi han dung toa nha minh quan ly —
    // tranh 2 role cung sua 1 gia.

    @PostMapping
    @Operation(summary = "Create pricing policy")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<PricingPolicyResponse>> create(
            @Valid @RequestBody CreatePricingPolicyRequest request, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Policy created",
                pricingPolicyService.createPolicy(request, resolveScopeBuildingId(authentication))));
    }

    @GetMapping
    @Operation(summary = "Get all pricing policies")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER')")
    public ResponseEntity<ApiResponse<List<PricingPolicyResponse>>> getAll(Authentication authentication) {
        // DRIVER/STAFF khong co khai niem "toa nha dang quan ly" -> khong loc theo
        // scope de van thay duoc gia ap dung khi tra cuu/dat cho/thanh toan.
        Long scope = isManager(authentication) ? resolveScopeBuildingId(authentication) : null;
        return ResponseEntity.ok(ApiResponse.success(pricingPolicyService.getAllPolicies(scope)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get pricing policy by ID")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER')")
    public ResponseEntity<ApiResponse<PricingPolicyResponse>> getOne(@PathVariable Long id, Authentication authentication) {
        Long scope = isManager(authentication) ? resolveScopeBuildingId(authentication) : null;
        return ResponseEntity.ok(ApiResponse.success(pricingPolicyService.getPolicy(id, scope)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update pricing policy")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<PricingPolicyResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody CreatePricingPolicyRequest request, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Policy updated",
                pricingPolicyService.updatePolicy(id, request, resolveScopeBuildingId(authentication))));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Deactivate pricing policy (soft-delete, preserves history for fee recalculation)")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, Authentication authentication) {
        pricingPolicyService.deletePolicy(id, resolveScopeBuildingId(authentication));
        return ResponseEntity.ok(ApiResponse.success("Đã tắt bảng giá", null));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activate pricing policy")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<PricingPolicyResponse>> activate(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Policy activated",
                pricingPolicyService.activatePolicy(id, resolveScopeBuildingId(authentication))));
    }

    private boolean isManager(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
    }

    /** MANAGER luon tra ve buildingId cua ho, hoac loi neu chua duoc gan. */
    private Long resolveScopeBuildingId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy user hiện tại"));
        if (user.getAssignedBuilding() == null) {
            throw new AppException(HttpStatus.FORBIDDEN, "Manager chưa được gán toà nhà, không thể quản lý bảng giá");
        }
        return user.getAssignedBuilding().getId();
    }
}

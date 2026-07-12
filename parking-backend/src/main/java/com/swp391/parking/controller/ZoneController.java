package com.swp391.parking.controller;

import com.swp391.parking.dto.request.ZoneRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.ZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/zones")
@RequiredArgsConstructor
public class ZoneController {

    private final ZoneService zoneService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<Zone>>> getAll(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(zoneService.getAll(resolveScopeBuildingId(authentication))));
    }

    @GetMapping("/floor/{floorId}")
    public ResponseEntity<ApiResponse<List<Zone>>> getByFloor(@PathVariable Long floorId, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                zoneService.getByFloor(floorId, resolveUserId(authentication), isBuildingScoped(authentication))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> getById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                zoneService.getById(id, resolveUserId(authentication), isBuildingScoped(authentication))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> create(@Valid @RequestBody ZoneRequest req, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Tạo zone thành công",
            zoneService.create(req, resolveScopeBuildingId(authentication))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Zone>> update(
            @PathVariable Long id,
            @Valid @RequestBody ZoneRequest req,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật zone thành công",
            zoneService.update(id, req, resolveScopeBuildingId(authentication))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id, Authentication authentication) {
        zoneService.deactivate(id, resolveScopeBuildingId(authentication));
        return ResponseEntity.ok(ApiResponse.success("Đã xoá zone khỏi DB"));
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.isAuthenticated();
    }

    private boolean isBuildingScoped(Authentication authentication) {
        if (!isAuthenticated(authentication)) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STAFF") || a.getAuthority().equals("ROLE_MANAGER"));
    }

    private boolean isManager(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
    }

    private Long resolveScopeBuildingId(Authentication authentication) {
        if (!isManager(authentication)) {
            return null;
        }
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy user hiện tại"));
        if (user.getAssignedBuilding() == null) {
            throw new AppException(HttpStatus.FORBIDDEN, "Manager chưa được gán toà nhà");
        }
        return user.getAssignedBuilding().getId();
    }

    private Long resolveUserId(Authentication authentication) {
        if (!isAuthenticated(authentication)) return null;
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User not found"))
                .getUserId().longValue();
    }
}

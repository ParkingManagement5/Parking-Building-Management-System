package com.swp391.parking.controller;

import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.FloorRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.FloorService;
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
@RequestMapping("/api/v1/floors")
@RequiredArgsConstructor
public class FloorController {

    private final FloorService floorService;
    private final FloorRepository floorRepository;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<Floor>>> getAll(Authentication authentication) {
        boolean isManager = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        if (isManager) {
            var user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User không tồn tại"));
            if (user.getAssignedBuilding() == null) return ResponseEntity.ok(ApiResponse.success(List.of()));
            Long buildingId = user.getAssignedBuilding().getId();
            return ResponseEntity.ok(ApiResponse.success(
                    floorRepository.findAll().stream()
                            .filter(f -> buildingId.equals(f.getBuilding().getId()))
                            .toList()));
        }
        return ResponseEntity.ok(ApiResponse.success(floorRepository.findAll()));
    }

    @GetMapping("/building/{buildingId}")
    public ResponseEntity<ApiResponse<List<Floor>>> getByBuilding(@PathVariable Long buildingId, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                floorService.getByBuilding(buildingId, resolveUserId(authentication), isStaff(authentication))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> getById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                floorService.getById(id, resolveUserId(authentication), isStaff(authentication))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> create(@Valid @RequestBody FloorRequest req, Authentication authentication) {
        enforceManagerBuildingOwnership(req.getBuildingId(), authentication);
        return ResponseEntity.ok(ApiResponse.success("Tao tang thanh cong",
            floorService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> update(
            @PathVariable Long id,
            @Valid @RequestBody FloorRequest req,
            Authentication authentication) {
        Floor existing = floorRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy tầng #" + id));
        enforceManagerBuildingOwnership(existing.getBuilding().getId(), authentication);
        return ResponseEntity.ok(ApiResponse.success("Cap nhat tang thanh cong",
            floorService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id, Authentication authentication) {
        Floor existing = floorRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy tầng #" + id));
        enforceManagerBuildingOwnership(existing.getBuilding().getId(), authentication);
        floorService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Da xoa tang khoi DB"));
    }

    private void enforceManagerBuildingOwnership(Long buildingId, Authentication authentication) {
        boolean isManager = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        if (!isManager) return;
        var user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User không tồn tại"));
        if (user.getAssignedBuilding() == null
                || !user.getAssignedBuilding().getId().equals(buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Manager chỉ được thao tác trên bãi đỗ xe được phân công");
        }
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.isAuthenticated();
    }

    private boolean isStaff(Authentication authentication) {
        if (!isAuthenticated(authentication)) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"));
    }

    private Long resolveUserId(Authentication authentication) {
        if (!isAuthenticated(authentication)) return null;
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User not found"))
                .getUserId().longValue();
    }
}

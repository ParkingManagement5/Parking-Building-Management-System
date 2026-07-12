package com.swp391.parking.controller;

import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
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
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<Floor>>> getAll(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(floorService.getAll(resolveScopeBuildingId(authentication))));
    }

    @GetMapping("/building/{buildingId}")
    public ResponseEntity<ApiResponse<List<Floor>>> getByBuilding(@PathVariable Long buildingId, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                floorService.getByBuilding(buildingId, resolveUserId(authentication), isBuildingScoped(authentication))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> getById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                floorService.getById(id, resolveUserId(authentication), isBuildingScoped(authentication))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> create(@Valid @RequestBody FloorRequest req, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Tạo tầng thành công",
            floorService.create(req, resolveScopeBuildingId(authentication))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> update(
            @PathVariable Long id,
            @Valid @RequestBody FloorRequest req,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tầng thành công",
            floorService.update(id, req, resolveScopeBuildingId(authentication))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id, Authentication authentication) {
        floorService.deactivate(id, resolveScopeBuildingId(authentication));
        return ResponseEntity.ok(ApiResponse.success("Đã xoá tầng khỏi DB"));
    }

    private boolean isAuthenticated(Authentication authentication) {
        return authentication != null
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.isAuthenticated();
    }

    /** STAFF và MANAGER đều bị ràng buộc theo assignedBuilding; chỉ ADMIN không giới hạn. */
    private boolean isBuildingScoped(Authentication authentication) {
        if (!isAuthenticated(authentication)) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STAFF") || a.getAuthority().equals("ROLE_MANAGER"));
    }

    private boolean isManager(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
    }

    /** null = ADMIN (không giới hạn). MANAGER trả về buildingId của họ, hoặc lỗi nếu chưa được gán. */
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

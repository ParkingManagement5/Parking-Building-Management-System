package com.swp391.parking.controller;

import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.PublicSlotStatsResponse;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.ParkingSlotService;
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
@RequestMapping("/api/v1/slots")
@RequiredArgsConstructor
public class ParkingSlotController {

    private final ParkingSlotService slotService;
    private final UserRepository userRepository;

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getAll(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(slotService.getAll(resolveScopeBuildingId(authentication))));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> searchAvailable(
            @RequestParam Long buildingId,
            @RequestParam Long vehicleTypeId,
            @RequestParam(required = false) Long floorId) {
        return ResponseEntity.ok(ApiResponse.success(
            slotService.searchAvailableSlots(buildingId, vehicleTypeId, floorId)));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getAvailable(@RequestParam Long vehicleTypeId) {
        return ResponseEntity.ok(ApiResponse.success(
            slotService.getAvailableByVehicleType(vehicleTypeId)));
    }

    // Cong khai, khong can auth - 1 query gop toan bo slot he thong, tranh
    // frontend phai goi rieng tung zone khi so luong toa nha lon.
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getPublicOverview() {
        return ResponseEntity.ok(ApiResponse.success(slotService.getPublicOverview()));
    }

    @GetMapping("/public-stats")
    public ResponseEntity<ApiResponse<PublicSlotStatsResponse>> getPublicStats() {
        return ResponseEntity.ok(ApiResponse.success(slotService.getPublicStats()));
    }

    @GetMapping("/zone/{zoneId}")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getByZone(@PathVariable Long zoneId, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                slotService.getByZone(zoneId, resolveUserId(authentication), isBuildingScoped(authentication))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> getById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                slotService.getById(id, resolveUserId(authentication), isBuildingScoped(authentication))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> create(@Valid @RequestBody SlotRequest req, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Tạo slot thành công",
            slotService.create(req, resolveScopeBuildingId(authentication))));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> update(
            @PathVariable Long id,
            @Valid @RequestBody SlotRequest req,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật slot thành công",
            slotService.update(id, req, resolveScopeBuildingId(authentication))));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, Authentication authentication) {
        slotService.delete(id, resolveScopeBuildingId(authentication));
        return ResponseEntity.ok(ApiResponse.success("Đã xoá slot khỏi DB"));
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

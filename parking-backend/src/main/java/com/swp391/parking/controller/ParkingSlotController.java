package com.swp391.parking.controller;

import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.ParkingSlot;
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

    @GetMapping("/zone/{zoneId}")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getByZone(@PathVariable Long zoneId, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                slotService.getByZone(zoneId, resolveUserId(authentication), isStaff(authentication))));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> getById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                slotService.getById(id, resolveUserId(authentication), isStaff(authentication))));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> create(@Valid @RequestBody SlotRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tao slot thanh cong",
            slotService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> update(
            @PathVariable Long id,
            @Valid @RequestBody SlotRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cap nhat slot thanh cong",
            slotService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        slotService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Da xoa slot khoi DB"));
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

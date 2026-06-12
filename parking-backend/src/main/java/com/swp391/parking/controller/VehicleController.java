package com.swp391.parking.controller;

import com.swp391.parking.dto.request.VehicleRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleService vehicleService;
    private final UserRepository userRepository; // lấy userId từ username trong JWT

    /**
     * GET /api/v1/vehicles/my
     * Driver xem danh sách xe của mình (lấy userId từ JWT token).
     */
    @GetMapping("/my")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<List<Vehicle>>> getMyVehicles(
            Authentication authentication) {
        User user = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                vehicleService.getByUser(user.getUserId().longValue())));
    }

    /**
     * GET /api/v1/vehicles/plate/{licensePlate}
     * Staff/Manager tra cứu xe theo biển số — dùng khi xe vào/ra cổng (FR-6, FR-7).
     */
    @GetMapping("/plate/{licensePlate}")
    @PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Vehicle>> getByPlate(
            @PathVariable String licensePlate) {
        return ResponseEntity.ok(ApiResponse.success(
            vehicleService.getByLicensePlate(licensePlate)));
    }

    /** GET /api/v1/vehicles/{id} */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DRIVER', 'STAFF', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Vehicle>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(vehicleService.getById(id)));
    }

    /**
     * POST /api/v1/vehicles
     * Driver đăng ký xe mới.
     */
    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<Vehicle>> create(
            Authentication authentication,
            @Valid @RequestBody VehicleRequest req) {
        User user = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký xe thành công",
            vehicleService.create(user.getUserId().longValue(), req)));
    }

    /**
     * PUT /api/v1/vehicles/{id}
     * Driver cập nhật thông tin xe (brand, model, color).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<Vehicle>> update(
            @PathVariable Long id,
            @Valid @RequestBody VehicleRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật xe thành công",
            vehicleService.update(id, req)));
    }

    /** DELETE /api/v1/vehicles/{id} — soft delete */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        vehicleService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hóa xe"));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    /**
     * Lấy User entity từ JWT Authentication.
     * JwtAuthFilter lưu username vào SecurityContext, ta dùng để tra cứu userId.
     */
    private User resolveUser(Authentication authentication) {
        String username = authentication.getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED,
                "Không tìm thấy user: " + username));
    }
}

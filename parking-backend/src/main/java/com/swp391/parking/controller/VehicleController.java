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
    private final UserRepository userRepository;

    @GetMapping("/my")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<List<Vehicle>>> getMyVehicles(Authentication authentication) {
        User user = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success(
            vehicleService.getByUser(user.getUserId())));
    }

    @GetMapping("/plate/{licensePlate}")
    @PreAuthorize("hasAnyRole('STAFF', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Vehicle>> getByPlate(@PathVariable String licensePlate) {
        return ResponseEntity.ok(ApiResponse.success(
            vehicleService.getByLicensePlate(licensePlate)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DRIVER', 'STAFF', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Vehicle>> getById(@PathVariable Long id, Authentication authentication) {
        Vehicle vehicle = vehicleService.getById(id);
        boolean isDriver = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DRIVER"));
        if (isDriver) {
            User user = resolveUser(authentication);
            if (!vehicle.getUserId().equals(user.getUserId().longValue())) {
                throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem xe của người khác");
            }
        }
        return ResponseEntity.ok(ApiResponse.success(vehicle));
    }

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<Vehicle>> create(
            Authentication authentication,
            @Valid @RequestBody VehicleRequest req) {
        User user = resolveUser(authentication);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký xe thành công",
            vehicleService.create(user.getUserId(), req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<Vehicle>> update(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody VehicleRequest req) {
        User user = resolveUser(authentication);
        Vehicle vehicle = vehicleService.getById(id);
        if (!vehicle.getUserId().equals(user.getUserId().longValue())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền sửa xe của người khác");
        }
        return ResponseEntity.ok(ApiResponse.success("Cập nhật xe thành công",
            vehicleService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(
            @PathVariable Long id, Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!isAdmin) {
            User user = resolveUser(authentication);
            Vehicle vehicle = vehicleService.getById(id);
            if (!vehicle.getUserId().equals(user.getUserId().longValue())) {
                throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xoá xe của người khác");
            }
        }
        vehicleService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hoá xe"));
    }

    private User resolveUser(Authentication authentication) {
        String username = authentication.getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED,
                "Không tìm thấy user: " + username));
    }
}

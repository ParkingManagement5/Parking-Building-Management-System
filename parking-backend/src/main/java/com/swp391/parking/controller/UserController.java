package com.swp391.parking.controller;

import com.swp391.parking.dto.request.ChangePasswordRequest;
import com.swp391.parking.dto.request.ChangeUserRoleRequest;
import com.swp391.parking.dto.request.ChangeUserStatusRequest;
import com.swp391.parking.dto.request.CreateStaffRequest;
import com.swp391.parking.dto.request.UpdateProfileRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.UserProfileResponse;
import com.swp391.parking.dto.response.UserSummaryResponse;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.UserAdminService;
import com.swp391.parking.service.UserProfileService;
import com.swp391.parking.service.UserQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserQueryService userQueryService;
    private final UserAdminService userAdminService;
    private final UserProfileService userProfileService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<UserSummaryResponse>>> getUsers(
            @RequestParam(required = false) String role,
            Authentication authentication) {
        List<UserSummaryResponse> users = userQueryService.getUsers(role);
        boolean isManager = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        if (isManager) {
            // MANAGER chỉ thấy nhân viên thuộc toà nhà mình quản lý.
            var manager = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy user hiện tại"));
            Long managerBuildingId = manager.getAssignedBuilding() != null ? manager.getAssignedBuilding().getId() : null;
            // Thay vi tro (chua duoc gan toa nao) van hien de Manager onboard nhan
            // vien moi; nhan vien da thuoc toa KHAC thi an di (khong duoc "chiem"
            // nhan vien cua Manager khac).
            users = users.stream()
                    .filter(u -> managerBuildingId != null
                            && (u.getAssignedBuildingId() == null
                                || managerBuildingId.equals(u.getAssignedBuildingId().longValue())))
                    .toList();
        }
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PutMapping("/{userId}/assign-building")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> assignBuilding(
            @PathVariable Integer userId,
            @RequestParam(required = false) Long buildingId,
            Authentication authentication) {
        // MANAGER chỉ được thêm/gỡ nhân viên trong phạm vi toà nhà của chính mình
        // (không được gán/chuyển nhân viên sang toà khác — đó là việc của Admin).
        boolean isManager = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        if (isManager) {
            var manager = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy user hiện tại"));
            Long managerBuildingId = manager.getAssignedBuilding() != null ? manager.getAssignedBuilding().getId() : null;
            var target = userRepository.findById(userId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
            Long targetCurrentBuildingId = target.getAssignedBuilding() != null ? target.getAssignedBuilding().getId() : null;

            if (buildingId == null) {
                // Gỡ khỏi toà: chỉ được gỡ nhân viên đang thuộc đúng toà mình
                if (managerBuildingId == null || !managerBuildingId.equals(targetCurrentBuildingId)) {
                    throw new AppException(HttpStatus.FORBIDDEN,
                            "Chỉ được gỡ nhân viên đang thuộc toà nhà bạn quản lý");
                }
            } else {
                if (managerBuildingId == null || !managerBuildingId.equals(buildingId)) {
                    throw new AppException(HttpStatus.FORBIDDEN,
                            "Chỉ được gán nhân viên vào toà nhà bạn quản lý");
                }
                if (targetCurrentBuildingId != null && !targetCurrentBuildingId.equals(buildingId)) {
                    throw new AppException(HttpStatus.FORBIDDEN,
                            "Nhân viên này đang thuộc toà nhà khác, không thể tự ý chuyển — cần Admin thực hiện");
                }
            }
        }
        return ResponseEntity.ok(ApiResponse.success(
                buildingId == null ? "Đã gỡ khỏi toà nhà" : "Gán building thành công",
                userAdminService.assignBuilding(userId, buildingId)));
    }

    @PostMapping("/staff")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> createStaff(
            @Valid @RequestBody CreateStaffRequest request,
            Authentication authentication) {
        // Endpoint noi bo (khac /auth/register cong khai): tao thang tai khoan
        // STAFF, active ngay, khong qua OTP xac minh email.
        boolean isManager = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        Long forcedBuildingId = null;
        if (isManager) {
            var manager = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy user hiện tại"));
            if (manager.getAssignedBuilding() == null) {
                throw new AppException(HttpStatus.FORBIDDEN, "Manager chưa được gán toà nhà, không thể tạo nhân viên");
            }
            forcedBuildingId = manager.getAssignedBuilding().getId();
        }
        return ResponseEntity.ok(ApiResponse.success(
                "Tạo tài khoản nhân viên thành công",
                userAdminService.createStaff(request, forcedBuildingId)));
    }

    @PutMapping("/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> changeUserRole(
            @PathVariable Integer userId,
            Authentication authentication,
            @Valid @RequestBody ChangeUserRoleRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cập nhật role thành công",
                userAdminService.changeUserRole(userId, request, authentication.getName())));
    }

    @PutMapping("/{userId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> changeUserStatus(
            @PathVariable Integer userId,
            Authentication authentication,
            @Valid @RequestBody ChangeUserStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cập nhật trạng thái thành công",
                userAdminService.changeUserStatus(userId, request.getStatus(), authentication.getName())));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                userProfileService.getMyProfile(authentication.getName())));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cập nhật thông tin thành công",
                userProfileService.updateMyProfile(authentication.getName(), request)));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changeMyPassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        userProfileService.changeMyPassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công"));
    }
}

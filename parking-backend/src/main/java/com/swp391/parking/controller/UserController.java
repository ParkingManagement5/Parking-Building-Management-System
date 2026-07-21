package com.swp391.parking.controller;

import com.swp391.parking.dto.request.ChangePasswordRequest;
import com.swp391.parking.dto.request.ChangeUserRoleRequest;
import com.swp391.parking.dto.request.ChangeUserStatusRequest;
import com.swp391.parking.dto.request.UpdateProfileRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.UserProfileResponse;
import com.swp391.parking.dto.response.UserSummaryResponse;
import com.swp391.parking.service.UserAdminService;
import com.swp391.parking.service.UserProfileService;
import com.swp391.parking.service.UserQueryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<UserSummaryResponse>>> getUsers(
            @RequestParam(required = false) String role) {
        return ResponseEntity.ok(ApiResponse.success(userQueryService.getUsers(role)));
    }

    @PutMapping("/{userId}/assign-building")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> assignBuilding(
            @PathVariable Integer userId,
            @RequestParam Long buildingId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Gan building thanh cong",
                userAdminService.assignBuilding(userId, buildingId)));
    }

    @PutMapping("/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> changeUserRole(
            @PathVariable Integer userId,
            Authentication authentication,
            @Valid @RequestBody ChangeUserRoleRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cap nhat role thanh cong",
                userAdminService.changeUserRole(userId, request, authentication.getName())));
    }

    @PutMapping("/{userId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> changeUserStatus(
            @PathVariable Integer userId,
            Authentication authentication,
            @Valid @RequestBody ChangeUserStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cap nhat trang thai thanh cong",
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
                "Cap nhat thong tin thanh cong",
                userProfileService.updateMyProfile(authentication.getName(), request)));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changeMyPassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        userProfileService.changeMyPassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Doi mat khau thanh cong"));
    }
}

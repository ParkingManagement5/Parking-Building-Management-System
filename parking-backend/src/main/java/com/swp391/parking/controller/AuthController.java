package com.swp391.parking.controller;

import com.swp391.parking.dto.request.ChangePasswordRequest;
import com.swp391.parking.dto.request.ForgotPasswordRequest;
import com.swp391.parking.dto.request.ResetPasswordRequest;
import com.swp391.parking.dto.request.LoginRequest;
import com.swp391.parking.dto.request.RegisterRequest;
import com.swp391.parking.dto.request.UpdateProfileRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.AuthResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.swp391.parking.dto.response.UserProfileResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import com.swp391.parking.service.impl.AuthService;

/**
 * Public endpoints — không cần JWT.
 * Đã whitelist trong SecurityConfig.PUBLIC_URLS: /api/v1/auth/**
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/v1/auth/register
     * Body: { username, fullName, email, phone, password }
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký thành công", response));
    }

    /**
     * POST /api/v1/auth/login
     * Body: { username, password }
     * Response: { token, username, fullName, email, roles }
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    /**
     * POST /api/v1/auth/forgot-password
     * Body: { email }
     * Demo: trả token trực tiếp để test bằng Postman
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        String token = authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo token reset password thành công", token));
    }

    /**
     * POST /api/v1/auth/reset-password
     * Body: { token, newPassword }
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        authService.resetPassword(request);

        return ResponseEntity.ok(
                ApiResponse.success("Reset password thành công"));
    }

    /**
     * GET /api/v1/auth/me
     * Yêu cầu JWT token — trả về thông tin user đang đăng nhập
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMe(
            @AuthenticationPrincipal UserDetails userDetails) {
        UserProfileResponse response = authService.getMe(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * PUT /api/v1/auth/change-password
     * Yêu cầu JWT token — đổi mật khẩu
     * Body: { oldPassword, newPassword }
     */
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công"));
    }

    /**
     * PUT /api/v1/users/profile
     * Yêu cầu JWT token — cập nhật profile người dùng
     * Body: { fullName, email, phone, address }
     */
    @PutMapping("/users/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserProfileResponse response = authService.updateProfile(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật profile thành công", response));
    }
}

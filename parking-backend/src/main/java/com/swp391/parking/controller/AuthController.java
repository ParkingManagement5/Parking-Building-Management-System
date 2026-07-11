package com.swp391.parking.controller;

import com.swp391.parking.dto.request.ForgotPasswordRequest;
import com.swp391.parking.dto.request.GoogleLoginRequest;
import com.swp391.parking.dto.request.LoginRequest;
import com.swp391.parking.dto.request.RegisterRequest;
import com.swp391.parking.dto.request.ResetPasswordRequest;
import com.swp391.parking.dto.request.ResendVerificationRequest;
import com.swp391.parking.dto.request.VerifyEmailRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.AuthResponse;
import com.swp391.parking.service.impl.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP",
                response));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {
        AuthResponse response = authService.verifyEmail(request);
        return ResponseEntity.ok(ApiResponse.success("Xác thực email thành công", response));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request) {
        authService.resendVerification(request);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi lại mã OTP", null));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Đã gửi mã OTP đặt lại mật khẩu qua email", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success(
                "Đặt lại mật khẩu thành công", null));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(
            @Valid @RequestBody GoogleLoginRequest request) {
        AuthResponse response = authService.googleLogin(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập Google thành công", response));
    }
}

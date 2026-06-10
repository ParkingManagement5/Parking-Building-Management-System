package com.swp391.parking.controller;

import com.swp391.parking.dto.request.LoginRequest;
import com.swp391.parking.dto.request.RegisterRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.AuthResponse;
import com.swp391.parking.service.impl.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}

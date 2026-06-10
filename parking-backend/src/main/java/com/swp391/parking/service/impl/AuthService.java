package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.ChangePasswordRequest;
import com.swp391.parking.dto.request.ForgotPasswordRequest;
import com.swp391.parking.dto.request.ResetPasswordRequest;
import com.swp391.parking.dto.request.LoginRequest;
import com.swp391.parking.dto.request.RegisterRequest;
import com.swp391.parking.dto.request.UpdateProfileRequest;
import com.swp391.parking.dto.response.AuthResponse;
import com.swp391.parking.entity.PasswordResetToken;
import com.swp391.parking.entity.ActivityLog;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.PasswordResetTokenRepository;
import com.swp391.parking.repository.ActivityLogRepository;
import com.swp391.parking.repository.RoleRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.security.jwt.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.swp391.parking.dto.response.UserProfileResponse;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final ActivityLogRepository activityLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    // ── Register ─────────────────────────────────────────────────────────────
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        // Kiểm tra trùng username/email
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new AppException(HttpStatus.CONFLICT, "Username đã tồn tại");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new AppException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }

        // Lấy role DRIVER mặc định (phải có sẵn trong DB)
        Role driverRole = roleRepository.findByRoleName(Role.RoleName.DRIVER)
                .orElseThrow(() -> new AppException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Role DRIVER chưa được khởi tạo trong DB"));

        // Tạo user mới
        User user = User.builder()
                .username(req.getUsername())
                .fullName(req.getFullName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .status(User.UserStatus.ACTIVE)
                .roles(Set.of(driverRole))
                .build();

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return buildAuthResponse(user, token);
    }

    // ── Login ────────────────────────────────────────────────────────────────
    public AuthResponse login(LoginRequest req) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
        } catch (AuthenticationException e) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Username hoặc password không đúng");
        }

        User user = userRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        if (User.UserStatus.LOCKED.equals(user.getStatus())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return buildAuthResponse(user, token);
    }

    // ── Helper ───────────────────────────────────────────────────────────────
    private AuthResponse buildAuthResponse(User user, String token) {
        Set<String> roles = user.getRoles().stream()
                .map(r -> "ROLE_" + r.getRoleName().name())
                .collect(Collectors.toSet());

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .roles(roles)
                .build();
    }

    // ── Get Me ───────────────────────────────────────────────────────────────
    public UserProfileResponse getMe(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        Set<String> roles = user.getRoles().stream()
                .map(r -> "ROLE_" + r.getRoleName().name())
                .collect(Collectors.toSet());

        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus().name())
                .roles(roles)
                .createdAt(user.getCreatedAt())
                .build();
    }

    // ── Change Password ──────────────────────────────────────────────────────
    @Transactional
    public void changePassword(String username, ChangePasswordRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        // Verify old password
        if (!passwordEncoder.matches(req.getOldPassword(), user.getPasswordHash())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Mật khẩu cũ không đúng");
        }

        // Update password
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }

    // ── Update Profile ───────────────────────────────────────────────────
    @Transactional
    public UserProfileResponse updateProfile(String username, UpdateProfileRequest req) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        // Check if new email is already in use by another user
        if (!user.getEmail().equals(req.getEmail()) && userRepository.existsByEmail(req.getEmail())) {
            throw new AppException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }

        // Update fields
        user.setFullName(req.getFullName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());

        userRepository.save(user);

        // Build response
        Set<String> roles = user.getRoles().stream()
                .map(r -> "ROLE_" + r.getRoleName().name())
                .collect(Collectors.toSet());

        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus().name())
                .roles(roles)
                .createdAt(user.getCreatedAt())
                .build();
    }

    // ── Forgot Password ─────────────────────────────────────────────────────
    @Transactional
    public String forgotPassword(ForgotPasswordRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Email không tồn tại"));

        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .build();

        passwordResetTokenRepository.save(resetToken);
        logActivity(
                user,
                "FORGOT_PASSWORD",
                "User yêu cầu reset password");

        return token;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(req.getToken())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Token không tồn tại"));

        if (resetToken.isUsed()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Token đã được sử dụng");
        }

        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Token đã hết hạn");
        }

        User user = resetToken.getUser();

        user.setPasswordHash(
                passwordEncoder.encode(req.getNewPassword()));

        userRepository.save(user);

        resetToken.setUsed(true);

        passwordResetTokenRepository.save(resetToken);
        logActivity(
                user,
                "RESET_PASSWORD",
                "User reset password thành công");
    }

    private void logActivity(User user,
            String action,
            String description) {

        ActivityLog log = ActivityLog.builder()
                .user(user)
                .action(action)
                .description(description)
                .build();

        activityLogRepository.save(log);
    }
}

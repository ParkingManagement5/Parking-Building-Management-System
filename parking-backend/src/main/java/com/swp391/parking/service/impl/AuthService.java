package com.swp391.parking.service.impl;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.swp391.parking.dto.request.ForgotPasswordRequest;
import com.swp391.parking.dto.request.GoogleLoginRequest;
import com.swp391.parking.dto.request.LoginRequest;
import com.swp391.parking.dto.request.RegisterRequest;
import com.swp391.parking.dto.request.ResetPasswordRequest;
import com.swp391.parking.dto.request.ResendVerificationRequest;
import com.swp391.parking.dto.request.VerifyEmailRequest;
import com.swp391.parking.dto.response.AuthResponse;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.RoleRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.security.jwt.JwtUtil;
import com.swp391.parking.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom OTP_RANDOM = new SecureRandom();
    private static final int OTP_MIN = 100000;
    private static final int OTP_RANGE = 900000;
    private static final int LOCK_THRESHOLD = 5;
    private static final int PERMANENT_LOCK_THRESHOLD = 20;
    private final Map<String, LoginAttemptState> loginAttempts = new ConcurrentHashMap<>();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final ActivityLogService activityLogService;

    @Value("${google.client-id}")
    private String googleClientId;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername())) {
            throw new AppException(HttpStatus.CONFLICT, "Username đã tồn tại");
        }
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new AppException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }

        Role driverRole = roleRepository.findByRoleName(Role.RoleName.DRIVER)
                .orElseThrow(() -> new AppException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Role DRIVER chưa được khởi tạo trong DB"));

        String otp = generateOtp();
        User user = User.builder()
                .username(req.getUsername())
                .fullName(req.getFullName())
                .email(req.getEmail())
                .phone(req.getPhone())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .emailVerificationCode(otp)
                .emailVerificationExpiresAt(LocalDateTime.now().plusMinutes(10))
                .status(User.UserStatus.PENDING)
                .roles(Set.of(driverRole))
                .build();

        userRepository.save(user);
        emailService.sendVerificationOtp(user.getEmail(), user.getUsername(), otp);

        return buildAuthResponse(user, null);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = findByUsernameOrEmail(req.getUsername());

        if (User.UserStatus.PENDING.equals(user.getStatus())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Tài khoản chưa xác thực email");
        }
        if (User.UserStatus.LOCKED.equals(user.getStatus())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khoá");
        }
        enforceTemporaryLoginLock(user);

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), req.getPassword()));
        } catch (AuthenticationException e) {
            handleFailedPasswordLogin(user);
        }

        resetLoginLock(user);
        activityLogService.log(user.getUserId(), "LOGIN", user.getUsername() + " đã đăng nhập");
        String token = jwtUtil.generateToken(user.getUsername());
        return buildAuthResponse(user, token);
    }

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest req) {
        User user = findByUsernameOrEmail(req.getUsername());

        if (User.UserStatus.ACTIVE.equals(user.getStatus())) {
            throw new AppException(
                    HttpStatus.CONFLICT,
                    "Tài khoản đã được xác thực. Vui lòng đăng nhập bằng email hoặc username và mật khẩu");
        }

        if (!req.getOtp().equals(user.getEmailVerificationCode())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã OTP không đúng");
        }
        if (user.getEmailVerificationExpiresAt() == null
                || user.getEmailVerificationExpiresAt().isBefore(LocalDateTime.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã OTP đã hết hạn");
        }

        if (!User.UserStatus.ACTIVE.equals(user.getStatus())) {
            user.setStatus(User.UserStatus.ACTIVE);
        }
        user.setEmailVerificationCode(null);
        user.setEmailVerificationExpiresAt(null);
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return buildAuthResponse(user, token);
    }

    @Transactional
    public void resendVerification(ResendVerificationRequest req) {
        User user = findByUsernameOrEmail(req.getUsername());

        if (User.UserStatus.ACTIVE.equals(user.getStatus())) {
            throw new AppException(HttpStatus.CONFLICT, "Tài khoản đã được xác thực");
        }

        String otp = generateOtp();
        user.setEmailVerificationCode(otp);
        user.setEmailVerificationExpiresAt(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);
        emailService.sendVerificationOtp(user.getEmail(), user.getUsername(), otp);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tài khoản với email này"));

        if (User.UserStatus.LOCKED.equals(user.getStatus())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khoá");
        }

        String otp = generateOtp();
        user.setPasswordResetOtp(otp);
        user.setPasswordResetOtpExpiresAt(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);

        emailService.sendPasswordResetOtp(user.getEmail(), user.getUsername(), otp);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tài khoản với email này"));

        if (user.getPasswordResetOtp() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chưa yêu cầu đặt lại mật khẩu. Vui lòng gọi forgot-password trước");
        }
        if (!req.getOtp().equals(user.getPasswordResetOtp())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã OTP không đúng");
        }
        if (user.getPasswordResetOtpExpiresAt() == null
                || user.getPasswordResetOtpExpiresAt().isBefore(LocalDateTime.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mã OTP đã hết hạn");
        }
        if (!req.getNewPassword().equals(req.getConfirmPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Mật khẩu xác nhận không khớp");
        }

        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setPasswordResetOtp(null);
        user.setPasswordResetOtpExpiresAt(null);
        userRepository.save(user);
    }

    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest req) {
        GoogleTokenInfo tokenInfo = verifyGoogleCredential(req.getCredential());

        User user = userRepository.findByEmail(tokenInfo.getEmail())
                .orElseGet(() -> createGoogleUser(tokenInfo));

        if (User.UserStatus.LOCKED.equals(user.getStatus())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khoá");
        }
        enforceTemporaryLoginLock(user);
        if (User.UserStatus.PENDING.equals(user.getStatus())) {
            user.setStatus(User.UserStatus.ACTIVE);
            user.setEmailVerificationCode(null);
            user.setEmailVerificationExpiresAt(null);
            userRepository.save(user);
        }

        activityLogService.log(user.getUserId(), "LOGIN", user.getUsername() + " đã đăng nhập bằng Google");
        String token = jwtUtil.generateToken(user.getUsername());
        return buildAuthResponse(user, token);
    }

    private User findByUsernameOrEmail(String login) {
        return userRepository.findByUsername(login)
                .or(() -> userRepository.findByEmail(login))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User không tồn tại"));
    }

    private void enforceTemporaryLoginLock(User user) {
        LoginAttemptState state = loginAttempts.get(loginAttemptKey(user));
        if (state == null || state.lockedUntil == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        if (state.lockedUntil.isAfter(now)) {
            long remainingMinutes = Math.max(1, Duration.between(now, state.lockedUntil).toMinutes() + 1);
            throw new AppException(
                    HttpStatus.LOCKED,
                    "Tài khoản tạm khoá do nhập sai mật khẩu quá nhiều lần. Thử lại sau "
                            + remainingMinutes + " phút");
        }

        state.lockedUntil = null;
    }

    private void handleFailedPasswordLogin(User user) {
        String key = loginAttemptKey(user);
        LoginAttemptState state = loginAttempts.computeIfAbsent(key, ignored -> new LoginAttemptState());
        int failedAttempts = state.failedAttempts + 1;
        state.failedAttempts = failedAttempts;

        if (failedAttempts >= PERMANENT_LOCK_THRESHOLD) {
            user.setStatus(User.UserStatus.LOCKED);
            userRepository.save(user);
            loginAttempts.remove(key);
            throw new AppException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản đã bị khoá do nhập sai mật khẩu quá nhiều lần");
        }

        if (failedAttempts % LOCK_THRESHOLD == 0) {
            int lockMinutes = lockMinutesForFailedAttempts(failedAttempts);
            state.lockedUntil = LocalDateTime.now().plusMinutes(lockMinutes);
            throw new AppException(
                    HttpStatus.LOCKED,
                    "Nhập sai mật khẩu " + failedAttempts + " lần. Tài khoản tạm khoá "
                            + lockMinutes + " phút");
        }

        int remainingAttempts = LOCK_THRESHOLD - (failedAttempts % LOCK_THRESHOLD);
        throw new AppException(
                HttpStatus.UNAUTHORIZED,
                "Username hoặc password không đúng. Còn " + remainingAttempts
                        + " lần trước khi tạm khoá tài khoản");
    }

    private int lockMinutesForFailedAttempts(int failedAttempts) {
        int lockLevel = failedAttempts / LOCK_THRESHOLD;
        return switch (lockLevel) {
            case 1 -> 5;
            case 2 -> 15;
            default -> 30;
        };
    }

    private void resetLoginLock(User user) {
        loginAttempts.remove(loginAttemptKey(user));
    }

    private String loginAttemptKey(User user) {
        return user.getUsername().toLowerCase();
    }

    private static class LoginAttemptState {
        private int failedAttempts;
        private LocalDateTime lockedUntil;
    }

    private GoogleTokenInfo verifyGoogleCredential(String credential) {
        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + credential;
        GoogleTokenInfo tokenInfo;
        try {
            tokenInfo = new RestTemplate().getForObject(url, GoogleTokenInfo.class);
        } catch (Exception ex) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Google token không hợp lệ");
        }

        if (tokenInfo == null || !googleClientId.equals(tokenInfo.getAud())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Google token sai client id");
        }
        if (!"true".equalsIgnoreCase(tokenInfo.getEmailVerified())) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Google email chưa được xác thực");
        }
        if (tokenInfo.getEmail() == null || tokenInfo.getEmail().isBlank()) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "Google token thiếu email");
        }

        return tokenInfo;
    }

    private User createGoogleUser(GoogleTokenInfo tokenInfo) {
        Role driverRole = roleRepository.findByRoleName(Role.RoleName.DRIVER)
                .orElseThrow(() -> new AppException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Role DRIVER chưa được khởi tạo trong DB"));

        String username = uniqueGoogleUsername(tokenInfo.getEmail());
        User user = User.builder()
                .username(username)
                .fullName(resolveGoogleName(tokenInfo))
                .email(tokenInfo.getEmail())
                .passwordHash(passwordEncoder.encode(generateOtp() + tokenInfo.getEmail()))
                .status(User.UserStatus.ACTIVE)
                .roles(Set.of(driverRole))
                .build();

        return userRepository.save(user);
    }

    private String resolveGoogleName(GoogleTokenInfo tokenInfo) {
        if (tokenInfo.getName() != null && !tokenInfo.getName().isBlank()) {
            return tokenInfo.getName();
        }
        return tokenInfo.getEmail().split("@")[0];
    }

    private String uniqueGoogleUsername(String email) {
        String base = email.split("@")[0].replaceAll("[^A-Za-z0-9_]", "_");
        if (base.length() < 3) {
            base = "google_user";
        }
        if (base.length() > 40) {
            base = base.substring(0, 40);
        }

        String candidate = base;
        int index = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + "_" + index++;
        }
        return candidate;
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        Set<String> roles = user.getRoles().stream()
                .map(r -> "ROLE_" + r.getRoleName().name())
                .collect(Collectors.toSet());

        AuthResponse.AuthResponseBuilder builder = AuthResponse.builder()
                .token(token)
                .requiresOtp(false)
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .roles(roles);

        if (user.getAssignedBuilding() != null) {
            builder.assignedBuildingId(user.getAssignedBuilding().getId().intValue())
                   .assignedBuildingName(user.getAssignedBuilding().getName());
        }

        return builder.build();
    }

    private String generateOtp() {
        return String.valueOf(OTP_MIN + OTP_RANDOM.nextInt(OTP_RANGE));
    }

    @Data
    private static class GoogleTokenInfo {
        private String aud;
        private String email;
        private String name;
        private String picture;
        private String sub;
        @JsonProperty("email_verified")
        private String emailVerified;
    }
}

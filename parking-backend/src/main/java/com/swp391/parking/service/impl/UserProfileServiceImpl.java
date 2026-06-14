package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.ChangePasswordRequest;
import com.swp391.parking.dto.request.UpdateProfileRequest;
import com.swp391.parking.dto.response.UserProfileResponse;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(String username) {
        return toResponse(findByUsername(username));
    }

    @Override
    @Transactional
    public UserProfileResponse updateMyProfile(String username, UpdateProfileRequest request) {
        User user = findByUsername(username);
        String normalizedEmail = request.getEmail().trim();

        userRepository.findByEmail(normalizedEmail)
                .filter(existing -> !existing.getUserId().equals(user.getUserId()))
                .ifPresent(existing -> {
                    throw new AppException(HttpStatus.CONFLICT, "Email da duoc su dung");
                });

        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPhone(request.getPhone() == null ? null : request.getPhone().trim());

        return toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public void changeMyPassword(String username, ChangePasswordRequest request) {
        User user = findByUsername(username);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Current password khong dung");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Confirm password khong khop");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "New password phai khac password hien tai");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private User findByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Khong tim thay user: " + username));
    }

    private UserProfileResponse toResponse(User user) {
        Set<String> roles = user.getRoles().stream()
                .map(role -> "ROLE_" + role.getRoleName().name())
                .collect(Collectors.toSet());

        return UserProfileResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus() == null ? null : user.getStatus().name())
                .roles(roles)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}

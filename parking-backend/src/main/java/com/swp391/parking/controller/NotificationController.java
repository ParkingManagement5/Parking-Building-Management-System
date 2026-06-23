package com.swp391.parking.controller;

import com.swp391.parking.dto.request.SendNotificationRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.NotificationResponse;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notification", description = "Manage notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @PostMapping
    @Operation(summary = "Send notification")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<NotificationResponse>> send(
            @Valid @RequestBody SendNotificationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(notificationService.sendNotification(request)));
    }

    @GetMapping("/user/{userId}")
    @Operation(summary = "Get notifications by user")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getByUser(
            @PathVariable Long userId, Authentication authentication) {
        enforceOwnership(userId, authentication);
        return ResponseEntity.ok(ApiResponse.success(notificationService.getNotifications(userId)));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark notification as read")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/user/{userId}/read-all")
    @Operation(summary = "Mark all notifications as read")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<Void> markAllAsRead(
            @PathVariable Long userId, Authentication authentication) {
        enforceOwnership(userId, authentication);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    private void enforceOwnership(Long targetUserId, Authentication authentication) {
        boolean isStaffOrAbove = authentication.getAuthorities().stream()
                .anyMatch(a -> {
                    String role = a.getAuthority();
                    return role.equals("ROLE_STAFF") || role.equals("ROLE_MANAGER") || role.equals("ROLE_ADMIN");
                });
        if (isStaffOrAbove) return;
        Long currentUserId = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User not found"))
                .getUserId().longValue();
        if (!currentUserId.equals(targetUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen truy cap notification cua nguoi khac");
        }
    }
}
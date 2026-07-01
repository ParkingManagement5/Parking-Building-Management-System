package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.SendNotificationRequest;
import com.swp391.parking.dto.response.NotificationResponse;
import com.swp391.parking.entity.Notification;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.NotificationRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    public NotificationResponse sendNotification(SendNotificationRequest request) {
        User user = userRepository.findById((int)(long) request.getUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        Notification notification = Notification.builder()
                .user(user)
                .title(request.getTitle())
                .body(request.getBody())
                .type(request.getType())
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
        notification = notificationRepository.save(notification);
        return toResponse(notification);
    }

    @Override
    public List<NotificationResponse> getNotifications(Long userId) {
        return notificationRepository.findByUserUserIdOrderByCreatedAtDesc((int)(long) userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void markAsRead(Long notificationId, Long currentUserId, boolean privileged) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Notification not found"));
        Long ownerUserId = notification.getUser() != null ? notification.getUser().getUserId().longValue() : null;
        if (!privileged && (ownerUserId == null || !ownerUserId.equals(currentUserId))) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen danh dau notification cua nguoi khac");
        }
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Override
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead((int)(long) userId);
    }

    @Override
    public void notify(Long userId, String title, String body, String type, String entityType, Integer entityId) {
        userRepository.findById((int)(long) userId).ifPresent(user -> {
            notificationRepository.save(Notification.builder()
                    .user(user).title(title).body(body).type(type)
                    .entityType(entityType).entityId(entityId)
                    .isRead(false).createdAt(LocalDateTime.now())
                    .build());
        });
    }

    @Override
    public void notifyAllStaff(String title, String body, String type, String entityType, Integer entityId) {
        LocalDateTime now = LocalDateTime.now();
        userRepository.findByRolesRoleName(Role.RoleName.STAFF).forEach(user -> {
            notificationRepository.save(Notification.builder()
                    .user(user).title(title).body(body).type(type)
                    .entityType(entityType).entityId(entityId)
                    .isRead(false).createdAt(now)
                    .build());
        });
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .notificationId(notification.getNotificationId())
                .userId((long) notification.getUser().getUserId())
                .title(notification.getTitle())
                .body(notification.getBody())
                .type(notification.getType())
                .entityType(notification.getEntityType())
                .entityId(notification.getEntityId())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}

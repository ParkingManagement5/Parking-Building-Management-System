package com.swp391.parking.service;

import com.swp391.parking.dto.request.BroadcastNotificationRequest;
import com.swp391.parking.dto.request.SendNotificationRequest;
import com.swp391.parking.dto.response.NotificationResponse;

import java.util.List;

public interface NotificationService {
    NotificationResponse sendNotification(SendNotificationRequest request);
    List<NotificationResponse> broadcastNotification(BroadcastNotificationRequest request);
    List<NotificationResponse> getNotifications(Long userId);
    void markAsRead(Long notificationId, Long currentUserId, boolean privileged);
    void markAllAsRead(Long userId);
    void notify(Long userId, String title, String body, String type, String entityType, Integer entityId);
    void notifyAllStaff(String title, String body, String type, String entityType, Integer entityId);

    void notifyStaffInBuilding(Long buildingId, String title, String body, String type, String entityType, Integer entityId);
}

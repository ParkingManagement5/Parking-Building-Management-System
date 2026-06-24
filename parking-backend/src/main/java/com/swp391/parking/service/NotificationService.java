package com.swp391.parking.service;

import com.swp391.parking.dto.request.SendNotificationRequest;
import com.swp391.parking.dto.response.NotificationResponse;

import java.util.List;

public interface NotificationService {
    NotificationResponse sendNotification(SendNotificationRequest request);
    List<NotificationResponse> getNotifications(Long userId);
    void markAsRead(Long notificationId);
    void markAllAsRead(Long userId);
    void notify(Long userId, String title, String body, String type, String entityType, Integer entityId);
    void notifyAllStaff(String title, String body, String type, String entityType, Integer entityId);
}
package com.swp391.parking.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationResponse {
    private Long notificationId;
    private Long userId;
    private String title;
    private String body;
    private String type;
    private String entityType;
    private Integer entityId;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
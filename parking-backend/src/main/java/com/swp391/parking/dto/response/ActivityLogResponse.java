package com.swp391.parking.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivityLogResponse {
    private Long logId;
    private Integer userId;
    private String username;
    private String actionType;
    private String action;
    private String ipAddress;
    private LocalDateTime createdAt;
}

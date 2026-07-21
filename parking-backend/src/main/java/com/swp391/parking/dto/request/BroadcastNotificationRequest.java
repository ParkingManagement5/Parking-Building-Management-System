package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BroadcastNotificationRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String body;

    private String type;

    private String entityType;

    private Integer entityId;

    @NotNull(message = "Target group is required")
    private TargetGroup targetGroup;

    public enum TargetGroup {
        ALL_USERS,
        STAFF,
        MANAGERS,
        DRIVERS,
        ADMINS
    }
}

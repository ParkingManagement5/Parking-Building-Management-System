package com.swp391.parking.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemConfigResponse {
    private Long configId;
    private String configKey;
    private String configValue;
    private String description;
    private Integer updatedBy;
    private LocalDateTime updatedAt;
}
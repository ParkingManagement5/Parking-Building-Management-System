package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemConfigRequest {
    @NotBlank(message = "Config key is required")
    private String configKey;

    private String configValue;
    private String description;
}
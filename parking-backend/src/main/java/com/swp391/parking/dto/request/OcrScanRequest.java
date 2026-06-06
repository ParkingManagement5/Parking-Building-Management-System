package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OcrScanRequest {
    @NotNull(message = "gateId không được để trống")
    private Long gateId;

    @NotBlank(message = "triggerType không được để trống")
    private String triggerType;  // ENTRY / EXIT

    private String detectedPlate;
    private Float confidenceScore;
    private String imagePath;
    private Long sessionId; // null nếu entry scan
}

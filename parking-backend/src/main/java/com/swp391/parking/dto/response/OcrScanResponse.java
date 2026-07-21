package com.swp391.parking.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class OcrScanResponse {
    private Long scanId;
    private Long sessionId;
    private Long gateId;
    private Long buildingId;
    private String imagePath;
    private String detectedPlate;
    private Float plateConfidenceScore;
    private String correctedPlate;
    private Boolean isCorrected;
    private Long correctedByUserId;
    private LocalDateTime correctedAt;
    private String correctionReason;
    private String triggerType;
    private String processStatus;
    private LocalDateTime scannedAt;
    private String effectivePlate;
}

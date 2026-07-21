package com.swp391.parking.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class QrTokenResponse {
    private String qrToken;
    private String purpose;
    private LocalDateTime expiresAt;
    private Long sessionId;
    private String licensePlate;
}

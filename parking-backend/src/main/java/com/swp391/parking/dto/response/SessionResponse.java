package com.swp391.parking.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class SessionResponse {
    private Long sessionId;
    private Long bookingId;
    private Long slotId;
    private String slotCode;
    private Long userId;
    private Long vehicleId;
    private String licensePlate;
    private Long entryGateId;
    private String entryGateCode;
    private Long exitGateId;
    private String exitGateCode;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    private String entryMode;
    private String status;
    private LocalDateTime createdAt;
}

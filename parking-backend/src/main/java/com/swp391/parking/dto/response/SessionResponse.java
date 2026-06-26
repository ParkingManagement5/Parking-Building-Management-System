package com.swp391.parking.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
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
    private Long vehicleTypeId;
    private String vehicleTypeName;
    private Long entryGateId;
    private String entryGateCode;
    private Long exitGateId;
    private String exitGateCode;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    private String entryMode;
    private String status;
    private LocalDateTime createdAt;
    private BigDecimal calculatedFee;
    private BigDecimal hourlyRate;
    private BigDecimal depositAmount;
}

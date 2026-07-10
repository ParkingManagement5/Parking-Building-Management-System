package com.swp391.parking.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data @Builder
public class BookingResponse {
    private Long bookingId;
    private Long userId;
    private Long vehicleId;
    private String licensePlate;
    private Long slotId;
    private String slotCode;
    private Long zoneId;
    private String zoneName;
    private Long floorId;
    private String floorName;
    private Long buildingId;
    private String buildingName;
    private LocalDateTime bookingStartTime;
    private LocalDateTime bookingEndTime;
    private String bookingType;
    private LocalDateTime reservedAt;
    private LocalDateTime expiredAt;
    private String qrToken;
    private LocalDateTime qrIssuedAt;
    private Boolean qrUsed;
    private BigDecimal depositAmount;
    private LocalDateTime depositPaidAt;
    private String status;
    private LocalDateTime createdAt;
}

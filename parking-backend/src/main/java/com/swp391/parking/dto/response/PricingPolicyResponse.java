package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingPolicyResponse {
    private Long policyId;
    private Long vehicleTypeId;
    private String dayType;
    private String timeType;
    private Integer startHour;
    private Integer endHour;
    private BigDecimal pricePerHour;
    private LocalDateTime effectiveFrom;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
package com.swp391.parking.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class PricingPolicyResponse {

    private Long policyId;
    private Long vehicleTypeId;
    private String dayType;
    private String timeType;
    private Double basePrice;
    private Double overtimePrice;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePricingPolicyRequest {

    @NotNull(message = "Vehicle type ID is required")
    private Long vehicleTypeId;

    @NotBlank(message = "Day type is required")
    private String dayType;

    @NotBlank(message = "Time type is required")
    private String timeType;

    @NotNull(message = "Base price is required")
    private Double basePrice;

    @NotNull(message = "Overtime price is required")
    private Double overtimePrice;
}
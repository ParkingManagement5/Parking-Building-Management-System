package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreatePricingPolicyRequest {

    @NotNull(message = "Vehicle type ID is required")
    private Long vehicleTypeId;

    /** Chỉ Admin dùng được field này (chọn toà nhà áp dụng riêng, để trống = giá global). Manager tạo policy sẽ luôn bị ép về toà nhà mình quản lý, bỏ qua field này. */
    private Long buildingId;

    @NotBlank(message = "Day type is required")
    private String dayType;

    @NotBlank(message = "Time type is required")
    private String timeType;

    private Integer startHour;
    private Integer endHour;

    @NotNull(message = "Price per hour is required")
    private BigDecimal pricePerHour;

    private Boolean isActive = true;
}
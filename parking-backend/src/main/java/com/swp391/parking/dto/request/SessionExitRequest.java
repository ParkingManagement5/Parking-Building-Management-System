package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SessionExitRequest {
    @NotNull(message = "gateId không được để trống")
    private Long gateId;

    @NotNull(message = "paymentMethod không được để trống")
    private String paymentMethod; // CASH / MOCK / VNPAY

    private Long staffUserId;
}
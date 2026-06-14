package com.swp391.parking.dto.request;

import com.swp391.parking.entity.Payment.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PaymentRequest {

    private Integer bookingId;

    private Integer sessionId;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;
}
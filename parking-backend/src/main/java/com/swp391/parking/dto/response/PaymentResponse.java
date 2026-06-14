package com.swp391.parking.dto.response;

import com.swp391.parking.entity.Payment.PaymentMethod;
import com.swp391.parking.entity.Payment.PaymentStatus;
import com.swp391.parking.entity.Payment.PaymentType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponse {

    private Integer paymentId;
    private Integer bookingId;
    private Integer sessionId;
    private Integer policyId;
    private PaymentType paymentType;
    private BigDecimal appliedRate;
    private BigDecimal baseFee;
    private BigDecimal overtimeFee;
    private BigDecimal penaltyFee;
    private BigDecimal discount;
    private BigDecimal depositDeducted;
    private BigDecimal totalAmount;
    private String transactionRef;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
}
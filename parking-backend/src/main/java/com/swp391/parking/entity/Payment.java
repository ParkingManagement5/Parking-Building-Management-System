package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Integer paymentId;

    @Column(name = "session_id")
    private Integer sessionId;

    @Column(name = "booking_id")
    private Integer bookingId;

    @Column(name = "policy_id")
    private Integer policyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false, length = 20)
    private PaymentType paymentType;

    @Column(name = "applied_rate", precision = 10, scale = 2)
    private BigDecimal appliedRate;

    @Column(name = "base_fee", precision = 12, scale = 2)
    private BigDecimal baseFee;

    @Column(name = "overtime_fee", precision = 12, scale = 2)
    private BigDecimal overtimeFee;

    @Column(name = "penalty_fee", precision = 12, scale = 2)
    private BigDecimal penaltyFee;

    @Column(name = "discount", precision = 12, scale = 2)
    private BigDecimal discount;

    @Column(name = "deposit_deducted", precision = 12, scale = 2)
    private BigDecimal depositDeducted;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "transaction_ref", unique = true, length = 100)
    private String transactionRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    private PaymentStatus paymentStatus;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    public enum PaymentType {
        DEPOSIT, PARKING_FEE
    }

    public enum PaymentMethod {
        CASH, VNPAY
    }

    public enum PaymentStatus {
        PENDING, PAID, FAILED, REFUNDED
    }
}
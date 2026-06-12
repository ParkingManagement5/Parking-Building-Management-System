package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "booking")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Booking extends BaseEntity {

    public enum BookingStatus {
        PENDING_PAYMENT, CONFIRMED, CHECKED_IN, EXPIRED, CANCELLED, COMPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK → users (module Quang) — dùng Long để khớp PK
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // FK → vehicle (module Du)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    // FK → parking_slot (module Du)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = false)
    private ParkingSlot slot;

    @Column(name = "booking_start_time")
    private LocalDateTime bookingStartTime;

    @Column(name = "booking_end_time")
    private LocalDateTime bookingEndTime;

    @Column(name = "reserved_at")
    private LocalDateTime reservedAt;

    // MIN(now+15p, booking_start_time-5p)  [BR-03b]
    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    // QR fields — thay thế Ticket trong V2
    @Column(name = "qr_token", unique = true, length = 500)
    private String qrToken;

    @Column(name = "qr_issued_at")
    private LocalDateTime qrIssuedAt;

    // NULL = chưa dùng → != NULL = đã check-in [BR-05]
    @Column(name = "qr_used_at")
    private LocalDateTime qrUsedAt;

    // Deposit — chỉ CAR/ELECTRIC_CAR [BR-03d]
    @Builder.Default
    @Column(name = "deposit_amount", precision = 10, scale = 2)
    private BigDecimal depositAmount = BigDecimal.ZERO;

    @Column(name = "deposit_paid_at")
    private LocalDateTime depositPaidAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private BookingStatus status;
}

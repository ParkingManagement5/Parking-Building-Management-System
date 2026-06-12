package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "gate_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GateLog extends BaseEntity {

    public enum EventType { ENTRY, EXIT }
    public enum ResultStatus { SUCCESS, FAILED, MANUAL_CHECK }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK → gate (Du)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gate_id", nullable = false)
    private Gate gate;

    // Nullable — log lỗi thì chưa có session
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private ParkingSession session;

    // Staff xử lý — nullable (auto thì không có)
    @Column(name = "staff_user_id")
    private Long staffUserId;

    @Column(name = "license_plate", length = 20)
    private String licensePlate;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private EventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "result_status", nullable = false, length = 20)
    private ResultStatus resultStatus;

    @Column(name = "event_time", nullable = false)
    private LocalDateTime eventTime;
}

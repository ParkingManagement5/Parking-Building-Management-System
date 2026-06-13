package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_session")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ParkingSession extends BaseEntity {

    public enum EntryMode { BOOKING, WALK_IN_AUTO, WALK_IN_MANUAL }
    public enum SessionStatus { ACTIVE, WAITING_PAYMENT, COMPLETED, EXCEPTION }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Long id;

    // NULL nếu walk-in
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    // FK → parking_slot (Du)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = false)
    private ParkingSlot slot;

    // FK → users (Quang) — dùng Long
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // FK → vehicle (Du)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    // 2 FK tới gate — đặt tên tường minh, không để cùng "gate_id"
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_gate_id")
    private Gate entryGate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exit_gate_id")
    private Gate exitGate;

    @Column(name = "entry_time")
    private LocalDateTime entryTime;

    @Column(name = "exit_time")
    private LocalDateTime exitTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_mode", nullable = false, length = 20)
    private EntryMode entryMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SessionStatus status;
}
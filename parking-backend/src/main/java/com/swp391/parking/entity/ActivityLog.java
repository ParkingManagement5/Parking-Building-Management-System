package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "activity_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "action_type", length = 50)
    private String actionType;

    @Column(name = "action", nullable = false, length = 200)
    private String action;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}

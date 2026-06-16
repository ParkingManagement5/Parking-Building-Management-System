package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "request")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Request extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id")
    private Integer requestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id")
    private User assignedStaff;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 30)
    private RequestType requestType;

    @Column(name = "subject", length = 200)
    private String subject;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private RequestStatus status;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public enum RequestType {
        LOST_QR, WRONG_FEE, CANNOT_FIND_CAR, OTHER
    }

    public enum RequestStatus {
        OPEN, IN_PROGRESS, RESOLVED, CLOSED
    }
}
package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exception_case")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ExceptionCase extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "exception_id")
    private Integer exceptionId;

    @Column(name = "session_id")
    private Integer sessionId;

    @Column(name = "request_id")
    private Integer requestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "exception_type", nullable = false, length = 30)
    private ExceptionType exceptionType;

    @Column(name = "description", length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ExceptionStatus status;

    @Column(name = "resolved_by")
    private Integer resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public enum ExceptionType {
        LOST_QR, WRONG_FEE, CANNOT_FIND_CAR, SYSTEM_ERROR, OTHER
    }

    public enum ExceptionStatus {
        OPEN, IN_PROGRESS, RESOLVED, CLOSED
    }
}
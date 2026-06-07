package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ocr_scan")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OcrScan extends BaseEntity {

    public enum TriggerType { ENTRY, EXIT }
    public enum ProcessStatus {
        AUTO_APPROVED, MANUAL_REVIEW, STAFF_APPROVED,
        CORRECTED_AFTER_APPROVAL, FAILED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nullable — tạo scan trước, gắn session sau
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    private ParkingSession session;

    // FK tới gate, để phân biệt entry/exit, và để log nếu có lỗi  [BR-10]
//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "gate_id")
//    private Gate gate;

    @Column(name = "image_path", length = 500)
    private String imagePath;

    @Column(name = "detected_plate", length = 20)
    private String detectedPlate;

    // 0.0 - 1.0, nếu < threshold → MANUAL_REVIEW  [BR-11]
    @Column(name = "plate_confidence_score")
    private Float plateConfidenceScore;

    @Column(name = "corrected_plate", length = 20)
    private String correctedPlate;

    @Builder.Default
    @Column(name = "is_corrected", nullable = false)
    private Boolean isCorrected = false;

    @Column(name = "corrected_by_user_id")
    private Long correctedByUserId;

    @Column(name = "corrected_at")
    private LocalDateTime correctedAt;

    @Column(name = "correction_reason", length = 255)
    private String correctionReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false, length = 20)
    private TriggerType triggerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "process_status", nullable = false, length = 30)
    private ProcessStatus processStatus;

    @Column(name = "scanned_at")
    private LocalDateTime scannedAt;
}

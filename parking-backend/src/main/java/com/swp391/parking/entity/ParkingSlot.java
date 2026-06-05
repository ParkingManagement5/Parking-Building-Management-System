package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Slot đỗ xe — đơn vị nhỏ nhất trong bãi.
 * FR-3: 4 trạng thái slot
 * BR-01: mỗi slot chỉ chứa 1 xe tại 1 thời điểm
 * BR-11: slot MAINTENANCE không được chọn/đặt trước
 */
@Entity
@Table(
    name = "parking_slot",
    uniqueConstraints = @UniqueConstraint(columnNames = {"zone_id", "slot_code"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ParkingSlot extends BaseEntity {

    // FR-3: 4 trạng thái
    public enum Status { AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE }

    // Kích cỡ slot phải khớp với loại xe (BR-02)
    public enum SlotSize { SMALL, MEDIUM, LARGE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    @Column(name = "slot_code", nullable = false, length = 20)
    private String slotCode; // "A01", "B12"

    @Enumerated(EnumType.STRING)
    @Column(name = "slot_size", nullable = false)
    private SlotSize slotSize;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.AVAILABLE;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "parking_slot",
    uniqueConstraints = @UniqueConstraint(columnNames = {"zone_id", "slot_code"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParkingSlot extends BaseEntity {

    public enum Status { AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE }

    public enum SlotSize { SMALL, MEDIUM, LARGE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "slot_id")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    @Column(name = "slot_code", nullable = false, length = 20)
    private String slotCode;

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

package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Cổng ra/vào của tòa nhà bãi đỗ xe.
 * GateType: ENTRY (chỉ vào), EXIT (chỉ ra), BOTH (vừa vào vừa ra)
 * gate_log sẽ reference gate_id để ghi lại lịch sử xe qua cổng.
 */
@Entity
@Table(name = "gate")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Gate extends BaseEntity {

    public enum GateType { ENTRY, EXIT, BOTH }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id", nullable = false)
    private ParkingBuilding building;

    @Column(name = "gate_code", nullable = false, unique = true, length = 50)
    private String gateCode; // "GATE-A1", "GATE-B2"

    @Enumerated(EnumType.STRING)
    @Column(name = "gate_type", nullable = false, length = 20)
    private GateType gateType; // ENTRY | EXIT | BOTH

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

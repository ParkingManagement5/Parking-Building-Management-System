package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Khu vực trong 1 tầng, mỗi khu chỉ nhận 1 loại xe.
 * Ví dụ: Tầng 1 có Zone A (xe máy) và Zone B (ô tô)
 * BR-02: zone gắn với 1 vehicle_type → đảm bảo xe đúng khu
 */
@Entity
@Table(
    name = "zone",
    uniqueConstraints = @UniqueConstraint(columnNames = {"floor_id", "zone_name"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Zone extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "zone_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "floor_id", nullable = false)
    private Floor floor; // zone thuộc tầng nào

    // BR-02: zone chỉ nhận loại xe này
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_type_id", nullable = false)
    private VehicleType vehicleType;

    @Column(name = "zone_name", nullable = false, length = 50)
    private String name; // "Zone A", "Zone B"

    @Column(length = 255)
    private String description;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

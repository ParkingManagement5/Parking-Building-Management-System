package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Mỗi tòa nhà có nhiều tầng.
 * @ManyToOne : nhiều Floor thuộc về 1 ParkingBuilding
 * unique: không được có 2 tầng cùng số trong 1 tòa nhà
 */
@Entity
@Table(
    name = "floor",
    uniqueConstraints = @UniqueConstraint(columnNames = {"building_id", "floor_number"})
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Floor extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "floor_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id", nullable = false)
    private ParkingBuilding building;

    @Column(name = "floor_number", nullable = false)
    private Integer floorNumber; // 1, 2, 3, -1 (hầm B1)

    @Column(name = "floor_name", nullable = false, length = 50)
    private String name; // "Tầng 1", "Hầm B1"

    @Builder.Default
    @Column(nullable = false)
    private Integer capacity = 0; // tổng số slot trên tầng này

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

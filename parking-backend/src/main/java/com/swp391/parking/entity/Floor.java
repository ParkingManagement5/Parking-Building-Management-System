package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Moi toa nha co nhieu tang.
 */
@Entity
@Table(
    name = "floor",
    uniqueConstraints = @UniqueConstraint(columnNames = {"building_id", "floor_number"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Floor extends BaseEntity {

    public enum Status { ACTIVE, INACTIVE, MAINTENANCE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "floor_id")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "building_id", nullable = false)
    private ParkingBuilding building;

    @Column(name = "floor_number", nullable = false)
    private Integer floorNumber;

    @Column(name = "floor_name", nullable = false, length = 50)
    private String name;

    @Builder.Default
    @Column(nullable = false)
    private Integer capacity = 0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

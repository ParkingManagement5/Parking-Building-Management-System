package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;

/**
 * Tòa nhà bãi đỗ xe.
 * FR-2: Public — Guest cũng xem được danh sách tòa nhà
 * BR-05: facility phải có giờ mở/đóng cửa
 */
@Entity
@Table(name = "parking_building")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ParkingBuilding extends BaseEntity {

    public enum Status { ACTIVE, INACTIVE, MAINTENANCE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "building_id")
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String description;

    // BR-05: phải có giờ mở/đóng cửa
    @Column(name = "open_time", nullable = false)
    private LocalTime openTime;

    @Column(name = "close_time", nullable = false)
    private LocalTime closeTime;

    @Builder.Default
    @Transient
    private Status status = Status.ACTIVE;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

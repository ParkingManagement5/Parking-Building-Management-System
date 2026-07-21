package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Xe của Driver đăng ký trong hệ thống.
 * user_id trỏ về bảng users của module Auth (Quang) — không dùng @ManyToOne để tránh coupling.
 */
@Entity
@Table(name = "vehicle")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Vehicle extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vehicle_id")
    private Long id;

    // Trỏ về user trong module Auth — Integer để match User.userId (Integer) của Quang
    @Column(name = "owner_user_id", nullable = false)
    private Integer userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_type_id", nullable = false)
    private VehicleType vehicleType;

    @Column(name = "license_plate", nullable = false, unique = true, length = 20)
    private String licensePlate; // "51F-123.45" — phải unique toàn hệ thống

    @Column(length = 50)
    private String brand;

    @Column(length = 50)
    private String model;

    @Column(length = 30)
    private String color;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

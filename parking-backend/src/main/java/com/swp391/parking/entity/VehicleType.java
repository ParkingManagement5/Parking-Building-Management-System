package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/**
 * Loại xe: Xe máy, Ô tô, Xe tải...
 * FR-4: Manager quản lý danh sách loại xe được nhận vào bãi
 * BR-02: mỗi loại xe chỉ được đậu ở slot có kích cỡ tương thích
 */
@Entity
@Table(name = "vehicle_type")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VehicleType extends BaseEntity {

    public enum SlotSize { SMALL, MEDIUM, LARGE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vehicle_type_id")
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name; // "Motorbike", "Car", "Truck" — phải unique

    @Column(length = 255)
    private String description;

    // BR-02: slot size phải khớp với loại xe
    @Enumerated(EnumType.STRING)
    @Column(name = "slot_size", nullable = false)
    private SlotSize slotSize;

    // Giá cơ bản theo giờ — dùng BigDecimal cho tiền tệ, không dùng double
    @Builder.Default
    @Column(name = "hourly_rate", nullable = false, precision = 10, scale = 2)
    private BigDecimal hourlyRate = BigDecimal.ZERO;

    @Column(name = "daily_rate", precision = 10, scale = 2)
    private BigDecimal dailyRate; // có thể null nếu không có gói ngày

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}

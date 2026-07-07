package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_policy")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PricingPolicy extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "policy_id")
    private Long policyId;

    @ManyToOne
    @JoinColumn(name = "vehicle_type_id")
    private VehicleType vehicleType;

    @Column(name = "time_type", nullable = false, length = 20)
    private String timeType;

    @Column(name = "day_type", nullable = false, length = 20)
    private String dayType;

    @Column(name = "start_hour")
    private Integer startHour;

    @Column(name = "end_hour")
    private Integer endHour;

    @Column(name = "price_per_hour", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerHour;

    @Column(name = "effective_from", nullable = false)
    private LocalDateTime effectiveFrom;

   @Builder.Default
@Column(name = "is_active", nullable = false)
private Boolean isActive = true;
}
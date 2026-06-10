package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pricing_policy")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PricingPolicy extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "policy_id")
    private Long policyId;

@Column(name = "vehicle_type_id")
private VehicleType vehicleTypeId;
    

    @Column(name = "day_type", length = 20)
    private String dayType;

    @Column(name = "time_type", length = 20)
    private String timeType;

    @Column(name = "base_price")
    private Double basePrice;

    @Column(name = "overtime_price")
    private Double overtimePrice;

    @Column(name = "status", length = 20)
    private String status;
}
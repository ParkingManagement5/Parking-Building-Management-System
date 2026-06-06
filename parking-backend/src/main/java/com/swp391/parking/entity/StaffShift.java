package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "staff_shift")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffShift extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "staff_shift_id")
    private Long staffShiftId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "working_date", nullable = false)
    private String workingDate;

    @Column(name = "status", length = 20)
    private String status;
}
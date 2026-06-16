package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "staff_shift")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffShift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "staff_shift_id")
    private Long staffShiftId;

    @ManyToOne
    @JoinColumn(name = "staff_user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "shift_id")
    private Shift shift;    

    @Column(name = "working_date", nullable = false)
    private LocalDate workingDate;
}
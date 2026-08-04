package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "staff_shift")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffShift {

    public enum AttendanceStatus { NOT_STARTED, ON_TIME, LATE, ABSENT, COMPLETED }

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

    @Column(name = "check_in_time")
    private LocalDateTime checkInTime;

    @Column(name = "check_out_time")
    private LocalDateTime checkOutTime;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status", nullable = false, length = 20)
    private AttendanceStatus attendanceStatus = AttendanceStatus.NOT_STARTED;

    // Vo hieu hoa mem — giu lai lich su check-in/check-out neu Manager go/huy phan ca.
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
package com.swp391.parking.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffShiftResponse {
    private Long staffShiftId;
    private Long userId;
    private String userName;
    private Long shiftId;
    private String shiftName;
    private LocalDate workingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private String attendanceStatus;
}
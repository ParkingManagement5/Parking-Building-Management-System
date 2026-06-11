package com.swp391.parking.dto.response;

import lombok.*;
import java.time.LocalTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShiftResponse {
    private Long shiftId;
    private String shiftName;
    private LocalTime startTime;
    private LocalTime endTime;
    private String status;
}
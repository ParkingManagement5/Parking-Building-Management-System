package com.swp391.parking.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ShiftResponse {
    private Long shiftId;
    private String shiftName;
    private String startTime;
    private String endTime;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
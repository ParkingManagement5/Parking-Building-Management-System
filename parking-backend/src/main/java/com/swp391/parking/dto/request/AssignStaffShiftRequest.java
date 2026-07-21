package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignStaffShiftRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Shift ID is required")
    private Long shiftId;

    @NotNull(message = "Working date is required")
    private LocalDate workingDate;
}
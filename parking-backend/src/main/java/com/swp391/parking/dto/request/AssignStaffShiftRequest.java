package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignStaffShiftRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Shift ID is required")
    private Long shiftId;

    @NotBlank(message = "Working date is required")
    private String workingDate;

    private String status;
}
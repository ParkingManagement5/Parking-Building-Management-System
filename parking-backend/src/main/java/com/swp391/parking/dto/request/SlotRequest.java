package com.swp391.parking.dto.request;

import com.swp391.parking.entity.ParkingSlot.SlotSize;
import jakarta.validation.constraints.*;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SlotRequest {

    @NotNull(message = "Zone ID không được để trống")
    private Long zoneId;

    @NotBlank(message = "Mã slot không được để trống")
    @Size(max = 20)
    private String slotCode; // "A01", "B12"

    @NotNull(message = "Kích cỡ slot không được để trống")
    private SlotSize slotSize; // SMALL, MEDIUM, LARGE
}

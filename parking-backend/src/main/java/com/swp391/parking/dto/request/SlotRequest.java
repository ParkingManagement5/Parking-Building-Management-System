package com.swp391.parking.dto.request;

import com.swp391.parking.entity.ParkingSlot.SlotSize;
import com.swp391.parking.entity.ParkingSlot.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SlotRequest {

    @NotNull(message = "Zone ID không được để trống")
    private Long zoneId;

    @NotBlank(message = "Mã slot không được để trống")
    @Size(max = 20)
    private String slotCode;

    @NotNull(message = "Kích cỡ slot không được để trống")
    private SlotSize slotSize;

    private Status status;
}

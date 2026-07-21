package com.swp391.parking.dto.request;

import com.swp391.parking.entity.Gate.GateType;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GateRequest {

    @NotNull(message = "Building ID không được để trống")
    private Long buildingId;

    @NotBlank(message = "Mã cổng không được để trống")
    @Size(max = 50, message = "Mã cổng tối đa 50 ký tự")
    private String gateCode; // "GATE-A1"

    @NotNull(message = "Loại cổng không được để trống")
    private GateType gateType; // ENTRY | EXIT | BOTH
}

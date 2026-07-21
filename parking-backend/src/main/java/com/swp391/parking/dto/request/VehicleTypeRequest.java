package com.swp391.parking.dto.request;

import com.swp391.parking.entity.VehicleType.SlotSize;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class VehicleTypeRequest {

    @NotBlank(message = "Tên loại xe không được để trống")
    @Size(max = 50)
    private String name; // "Motorbike", "Car", "Truck"

    @Size(max = 255)
    private String description;

    @NotNull(message = "Kích cỡ slot không được để trống")
    private SlotSize slotSize; // SMALL, MEDIUM, LARGE

    @NotNull(message = "Giá theo giờ không được để trống")
    @DecimalMin(value = "0.0", message = "Giá không được âm")
    private BigDecimal hourlyRate;

    @DecimalMin(value = "0.0", message = "Giá không được âm")
    private BigDecimal dailyRate; // có thể null
}

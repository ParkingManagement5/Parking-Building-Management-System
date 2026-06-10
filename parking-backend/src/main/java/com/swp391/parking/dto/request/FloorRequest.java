package com.swp391.parking.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FloorRequest {

    @NotNull(message = "Building ID không được để trống")
    private Long buildingId;

    @NotNull(message = "Số tầng không được để trống")
    private Integer floorNumber; // 1, 2, 3, -1 (hầm B1)

    @NotBlank(message = "Tên tầng không được để trống")
    @Size(max = 50)
    private String name; // "Tầng 1", "Hầm B1"

    @Builder.Default
    @Min(value = 0, message = "Sức chứa không được âm")
    private Integer capacity = 0;
}

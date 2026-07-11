package com.swp391.parking.dto.request;

import com.swp391.parking.entity.Floor.Status;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FloorRequest {

    @NotNull(message = "Building ID không được để trống")
    private Long buildingId;

    @NotNull(message = "Số tầng không được để trống")
    private Integer floorNumber;

    @NotBlank(message = "Tên tầng không được để trống")
    @Size(max = 50)
    private String name;

    @Min(value = 0, message = "Sức chứa không được âm")
    @Builder.Default
    private Integer capacity = 0;

    private Status status;
}

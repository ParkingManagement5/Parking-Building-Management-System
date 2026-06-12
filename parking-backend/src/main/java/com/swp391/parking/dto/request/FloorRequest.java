package com.swp391.parking.dto.request;

import com.swp391.parking.entity.Floor.Status;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FloorRequest {

    @NotNull(message = "Building ID khong duoc de trong")
    private Long buildingId;

    @NotNull(message = "So tang khong duoc de trong")
    private Integer floorNumber;

    @NotBlank(message = "Ten tang khong duoc de trong")
    @Size(max = 50)
    private String name;

    @Min(value = 0, message = "Suc chua khong duoc am")
    @Builder.Default
    private Integer capacity = 0;

    private Status status;
}

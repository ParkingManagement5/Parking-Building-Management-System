package com.swp391.parking.dto.request;

import com.swp391.parking.entity.Zone.Status;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZoneRequest {

    @NotNull(message = "Floor ID không được để trống")
    private Long floorId;

    @NotNull(message = "Vehicle type ID không được để trống")
    private Long vehicleTypeId;

    @NotBlank(message = "Tên zone không được để trống")
    @Size(max = 50)
    private String name;

    @Size(max = 255)
    private String description;

    private Status status;
}

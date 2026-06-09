package com.swp391.parking.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ZoneRequest {

    @NotNull(message = "Floor ID không được để trống")
    private Long floorId;

    @NotNull(message = "Vehicle type ID không được để trống")
    private Long vehicleTypeId; // BR-02: zone chỉ nhận loại xe này

    @NotBlank(message = "Tên zone không được để trống")
    @Size(max = 50)
    private String name; // "Zone A", "Zone B"

    @Size(max = 255)
    private String description;
}

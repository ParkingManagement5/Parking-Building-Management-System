package com.swp391.parking.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class VehicleRequest {

    @NotNull(message = "Vehicle type ID không được để trống")
    private Long vehicleTypeId;

    @NotBlank(message = "Biển số xe không được để trống")
    @Size(max = 20)
    private String licensePlate; // "51F-123.45"

    @Size(max = 50)
    private String brand;

    @Size(max = 50)
    private String model;

    @Size(max = 30)
    private String color;
}

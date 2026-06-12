package com.swp391.parking.dto.request;

import com.swp391.parking.entity.Zone.Status;
import jakarta.validation.constraints.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZoneRequest {

    @NotNull(message = "Floor ID khong duoc de trong")
    private Long floorId;

    @NotNull(message = "Vehicle type ID khong duoc de trong")
    private Long vehicleTypeId;

    @NotBlank(message = "Ten zone khong duoc de trong")
    @Size(max = 50)
    private String name;

    @Size(max = 255)
    private String description;

    private Status status;
}

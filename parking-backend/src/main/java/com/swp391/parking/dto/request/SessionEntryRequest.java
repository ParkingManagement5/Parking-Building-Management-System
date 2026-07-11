package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SessionEntryRequest {
    @NotNull(message = "gateId không được để trống")
    private Long gateId;

    private String qrToken;
    private String licensePlate;

    @NotBlank(message = "entryMode không được để trống")
    private String entryMode;

    private Long slotId;
    private Long vehicleTypeId;
    private Long staffUserId;
}

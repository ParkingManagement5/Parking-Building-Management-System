package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SessionEntryRequest {
    @NotNull(message = "gateId khong duoc de trong")
    private Long gateId;

    private String qrToken;
    private String licensePlate;

    @NotBlank(message = "entryMode khong duoc de trong")
    private String entryMode;

    private Long slotId;
    private Long vehicleTypeId;
    private Long staffUserId;
}

package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SessionEntryRequest {
    @NotNull(message = "gateId không được để trống")
    private Long gateId;

    private String qrToken;       // BOOKING mode
    private String licensePlate;  // WALK_IN mode

    @NotBlank(message = "entryMode không được để trống")
    private String entryMode;     // BOOKING / WALK_IN_AUTO / WALK_IN_MANUAL

    private Long slotId;          // walk-in: staff chọn slot
}

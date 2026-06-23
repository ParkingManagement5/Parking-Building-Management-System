package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SessionQrScanRequest {
    @NotBlank
    private String qrToken;

    @NotNull
    private Long gateId;

    private Long staffUserId;
}

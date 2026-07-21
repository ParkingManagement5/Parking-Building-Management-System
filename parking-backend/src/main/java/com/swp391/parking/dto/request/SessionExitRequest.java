package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SessionExitRequest {
    @NotNull(message = "gateId khong duoc de trong")
    private Long gateId;

    private Long staffUserId;

    private Boolean qrVerified;

    // Staff override: bypass QR requirement khi xe không scan được QR (mất QR, lỗi hệ thống)
    private Boolean staffForceExit;
}

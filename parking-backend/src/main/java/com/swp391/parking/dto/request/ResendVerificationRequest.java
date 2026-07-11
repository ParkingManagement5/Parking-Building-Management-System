package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ResendVerificationRequest {

    @NotBlank(message = "Username không được để trống")
    private String username;
}

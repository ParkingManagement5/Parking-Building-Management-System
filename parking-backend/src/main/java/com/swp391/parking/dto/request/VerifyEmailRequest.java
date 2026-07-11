package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyEmailRequest {

    @NotBlank(message = "Username không được để trống")
    private String username;

    @NotBlank(message = "Mã OTP không được để trống")
    private String otp;
}

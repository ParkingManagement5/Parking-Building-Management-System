package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "Current password khong duoc de trong")
    private String currentPassword;

    @NotBlank(message = "New password khong duoc de trong")
    @Size(min = 8, message = "New password toi thieu 8 ky tu")
    private String newPassword;

    @NotBlank(message = "Confirm password khong duoc de trong")
    private String confirmPassword;
}

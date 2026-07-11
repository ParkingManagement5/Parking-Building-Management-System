package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordRequest {

    @NotBlank(message = "Current password không được để trống")
    private String currentPassword;

    @NotBlank(message = "New password không được để trống")
    @Size(min = 8, message = "New password tối thiểu 8 ký tự")
    private String newPassword;

    @NotBlank(message = "Confirm password không được để trống")
    private String confirmPassword;
}

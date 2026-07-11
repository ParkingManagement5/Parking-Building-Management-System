package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeUserRoleRequest {

    @NotBlank(message = "Role không được để trống")
    private String roleName;
}

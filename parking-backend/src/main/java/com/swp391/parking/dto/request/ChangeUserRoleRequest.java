package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeUserRoleRequest {

    @NotBlank(message = "Role khong duoc de trong")
    private String roleName;
}

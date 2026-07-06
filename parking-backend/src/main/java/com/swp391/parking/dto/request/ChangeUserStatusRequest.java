package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeUserStatusRequest {

    @NotBlank(message = "Trang thai khong duoc de trong")
    private String status;
}

package com.swp391.parking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeUserStatusRequest {

    @NotBlank(message = "Trạng thái không được để trống")
    private String status;
}

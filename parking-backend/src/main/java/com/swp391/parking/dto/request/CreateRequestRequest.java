package com.swp391.parking.dto.request;

import com.swp391.parking.entity.Request.RequestType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRequestRequest {

    @NotNull(message = "Request type is required")
    private RequestType requestType;

    private String subject;

    private String description;

    private Long buildingId;
}
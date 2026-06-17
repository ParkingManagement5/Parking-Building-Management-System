package com.swp391.parking.dto.request;

import com.swp391.parking.entity.ExceptionCase.ExceptionType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateExceptionCaseRequest {

    private Integer sessionId;

    private Integer requestId;

    @NotNull(message = "Exception type is required")
    private ExceptionType exceptionType;

    private String description;
}
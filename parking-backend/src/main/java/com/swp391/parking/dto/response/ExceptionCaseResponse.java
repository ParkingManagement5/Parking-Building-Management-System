package com.swp391.parking.dto.response;

import com.swp391.parking.entity.ExceptionCase.ExceptionStatus;
import com.swp391.parking.entity.ExceptionCase.ExceptionType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ExceptionCaseResponse {

    private Integer exceptionId;
    private Integer sessionId;
    private Integer requestId;
    private Integer bookingId;
    private ExceptionType exceptionType;
    private String description;
    private ExceptionStatus status;
    private Integer resolvedBy;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
}
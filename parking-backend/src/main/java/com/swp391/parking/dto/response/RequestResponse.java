package com.swp391.parking.dto.response;

import com.swp391.parking.entity.Request.RequestStatus;
import com.swp391.parking.entity.Request.RequestType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RequestResponse {

    private Integer requestId;
    private Integer userId;
    private String username;
    private Integer assignedStaffId;
    private String assignedStaffName;
    private RequestType requestType;
    private String subject;
    private String description;
    private RequestStatus status;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
}
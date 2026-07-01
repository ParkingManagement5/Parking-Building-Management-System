package com.swp391.parking.service;

import com.swp391.parking.dto.request.CreateRequestRequest;
import com.swp391.parking.dto.response.RequestResponse;
import com.swp391.parking.entity.Request.RequestStatus;
import com.swp391.parking.entity.Request.RequestType;

import java.util.List;

public interface RequestService {

    RequestResponse createRequest(Integer userId, CreateRequestRequest request);

    RequestResponse getById(Integer requestId, Integer currentUserId, boolean staffScoped);

    List<RequestResponse> getByUserId(Integer userId, Integer currentUserId, boolean staffScoped);
    List<RequestResponse> getByStatus(RequestStatus status, Integer currentUserId, boolean staffScoped);
    List<RequestResponse> getByType(RequestType requestType, Integer currentUserId, boolean staffScoped);
    RequestResponse assignStaff(Integer requestId, Integer staffId, Integer currentUserId, boolean staffScoped);
    RequestResponse resolveRequest(Integer requestId, Integer currentUserId, boolean staffScoped);
    RequestResponse closeRequest(Integer requestId, Integer currentUserId, boolean staffScoped);
}

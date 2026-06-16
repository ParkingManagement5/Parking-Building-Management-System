package com.swp391.parking.service;

import com.swp391.parking.dto.request.CreateRequestRequest;
import com.swp391.parking.dto.response.RequestResponse;
import com.swp391.parking.entity.Request.RequestStatus;
import com.swp391.parking.entity.Request.RequestType;

import java.util.List;

public interface RequestService {

    RequestResponse createRequest(Integer userId, CreateRequestRequest request);

    RequestResponse getById(Integer requestId);

    List<RequestResponse> getByUserId(Integer userId);
    List<RequestResponse> getByStatus(RequestStatus status);
    List<RequestResponse> getByType(RequestType requestType);
    RequestResponse assignStaff(Integer requestId, Integer staffId);
    RequestResponse resolveRequest(Integer requestId);
    RequestResponse closeRequest(Integer requestId);
}
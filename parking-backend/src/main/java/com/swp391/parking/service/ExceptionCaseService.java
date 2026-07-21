package com.swp391.parking.service;

import com.swp391.parking.dto.request.CreateExceptionCaseRequest;
import com.swp391.parking.dto.response.ExceptionCaseResponse;
import com.swp391.parking.entity.ExceptionCase.ExceptionStatus;
import com.swp391.parking.entity.ExceptionCase.ExceptionType;

import java.util.List;

public interface ExceptionCaseService {

    ExceptionCaseResponse createExceptionCase(CreateExceptionCaseRequest request);

    ExceptionCaseResponse getById(Integer exceptionId, Integer currentUserId, boolean staffScoped);

    List<ExceptionCaseResponse> getBySessionId(Integer sessionId, Integer currentUserId, boolean staffScoped);

    List<ExceptionCaseResponse> getByRequestId(Integer requestId, Integer currentUserId, boolean staffScoped);

    List<ExceptionCaseResponse> getByStatus(ExceptionStatus status, Integer currentUserId, boolean staffScoped);


    List<ExceptionCaseResponse> getByType(ExceptionType exceptionType, Integer currentUserId, boolean staffScoped);
    ExceptionCaseResponse assignToStaff(Integer exceptionId, Integer staffId, Integer currentUserId, boolean staffScoped);

    ExceptionCaseResponse resolveExceptionCase(Integer exceptionId, Integer currentUserId, boolean staffScoped);

    ExceptionCaseResponse closeExceptionCase(Integer exceptionId, Integer currentUserId, boolean staffScoped);
}

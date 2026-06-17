package com.swp391.parking.service;

import com.swp391.parking.dto.request.CreateExceptionCaseRequest;
import com.swp391.parking.dto.response.ExceptionCaseResponse;
import com.swp391.parking.entity.ExceptionCase.ExceptionStatus;
import com.swp391.parking.entity.ExceptionCase.ExceptionType;

import java.util.List;

public interface ExceptionCaseService {

    ExceptionCaseResponse createExceptionCase(CreateExceptionCaseRequest request);

    ExceptionCaseResponse getById(Integer exceptionId);

    List<ExceptionCaseResponse> getBySessionId(Integer sessionId);

    List<ExceptionCaseResponse> getByRequestId(Integer requestId);

    List<ExceptionCaseResponse> getByStatus(ExceptionStatus status);


    List<ExceptionCaseResponse> getByType(ExceptionType exceptionType);
    ExceptionCaseResponse assignToStaff(Integer exceptionId, Integer staffId);

    ExceptionCaseResponse resolveExceptionCase(Integer exceptionId);

    ExceptionCaseResponse closeExceptionCase(Integer exceptionId);
}
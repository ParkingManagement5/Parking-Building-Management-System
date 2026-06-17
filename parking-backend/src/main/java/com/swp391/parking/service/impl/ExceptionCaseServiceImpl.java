package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreateExceptionCaseRequest;
import com.swp391.parking.dto.response.ExceptionCaseResponse;
import com.swp391.parking.entity.ExceptionCase;
import com.swp391.parking.entity.ExceptionCase.ExceptionStatus;
import com.swp391.parking.entity.ExceptionCase.ExceptionType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ExceptionCaseRepository;
import com.swp391.parking.service.ExceptionCaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExceptionCaseServiceImpl implements ExceptionCaseService {

    private final ExceptionCaseRepository exceptionCaseRepository;

    @Override
    @Transactional
    public ExceptionCaseResponse createExceptionCase(CreateExceptionCaseRequest req) {
        ExceptionCase exceptionCase = ExceptionCase.builder()
            .sessionId(req.getSessionId())
            .requestId(req.getRequestId())
            .exceptionType(req.getExceptionType())
            .description(req.getDescription())
            .status(ExceptionStatus.OPEN)
            .build();

        return toResponse(exceptionCaseRepository.save(exceptionCase));
    }

    @Override
    public ExceptionCaseResponse getById(Integer exceptionId) {
        return toResponse(findById(exceptionId));
    }

    @Override
    public List<ExceptionCaseResponse> getBySessionId(Integer sessionId) {
        return exceptionCaseRepository.findBySessionId(sessionId)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ExceptionCaseResponse> getByRequestId(Integer requestId) {
        return exceptionCaseRepository.findByRequestId(requestId)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ExceptionCaseResponse> getByStatus(ExceptionStatus status) {
        return exceptionCaseRepository.findByStatus(status)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ExceptionCaseResponse> getByType(ExceptionType exceptionType) {
        return exceptionCaseRepository.findByExceptionType(exceptionType)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ExceptionCaseResponse assignToStaff(Integer exceptionId, Integer staffId) {
        ExceptionCase exceptionCase = findById(exceptionId);

        exceptionCase.setResolvedBy(staffId);
        exceptionCase.setStatus(ExceptionStatus.IN_PROGRESS);

        return toResponse(exceptionCaseRepository.save(exceptionCase));
    }

    @Override
    @Transactional
    public ExceptionCaseResponse resolveExceptionCase(Integer exceptionId) {
        ExceptionCase exceptionCase = findById(exceptionId);

        exceptionCase.setStatus(ExceptionStatus.RESOLVED);
        exceptionCase.setResolvedAt(LocalDateTime.now());

        return toResponse(exceptionCaseRepository.save(exceptionCase));
    }

    @Override
    @Transactional
    public ExceptionCaseResponse closeExceptionCase(Integer exceptionId) {
        ExceptionCase exceptionCase = findById(exceptionId);

        exceptionCase.setStatus(ExceptionStatus.CLOSED);

        return toResponse(exceptionCaseRepository.save(exceptionCase));
    }

    // ── Helper ───────────────────────────────────────────────

    private ExceptionCase findById(Integer exceptionId) {
        return exceptionCaseRepository.findById(exceptionId)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Exception case not found"));
    }

    private ExceptionCaseResponse toResponse(ExceptionCase exceptionCase) {
        return ExceptionCaseResponse.builder()
            .exceptionId(exceptionCase.getExceptionId())
            .sessionId(exceptionCase.getSessionId())
            .requestId(exceptionCase.getRequestId())
            .exceptionType(exceptionCase.getExceptionType())
            .description(exceptionCase.getDescription())
            .status(exceptionCase.getStatus())
            .resolvedBy(exceptionCase.getResolvedBy())
            .resolvedAt(exceptionCase.getResolvedAt())
            .createdAt(exceptionCase.getCreatedAt())
            .build();
    }
}
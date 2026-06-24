package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreateRequestRequest;
import com.swp391.parking.dto.response.RequestResponse;
import com.swp391.parking.entity.Request;
import com.swp391.parking.entity.Request.RequestStatus;
import com.swp391.parking.entity.Request.RequestType;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.RequestRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.NotificationService;
import com.swp391.parking.service.RequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RequestServiceImpl implements RequestService {

    private final RequestRepository requestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public RequestResponse createRequest(Integer userId, CreateRequestRequest req) {
        User user = findUserById(userId);

        Request request = Request.builder()
            .user(user)
            .requestType(req.getRequestType())
            .subject(req.getSubject())
            .description(req.getDescription())
            .status(RequestStatus.OPEN)
            .build();

        Request saved = requestRepository.save(request);

        notificationService.notifyAllStaff("Request moi tu driver",
                (req.getSubject() != null ? req.getSubject() : req.getRequestType().name()),
                "info", "REQUEST", saved.getRequestId());

        return toResponse(saved);
    }

    @Override
    public RequestResponse getById(Integer requestId) {
        return toResponse(findById(requestId));
    }

    @Override
    public List<RequestResponse> getByUserId(Integer userId) {
        return requestRepository.findByUser_UserId(userId)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<RequestResponse> getByStatus(RequestStatus status) {
        return requestRepository.findByStatus(status)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<RequestResponse> getByType(RequestType requestType) {
        return requestRepository.findByRequestType(requestType)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RequestResponse assignStaff(Integer requestId, Integer staffId) {
        Request request = findById(requestId);
        User staff = findUserById(staffId);

        request.setAssignedStaff(staff);
        request.setStatus(RequestStatus.IN_PROGRESS);

        return toResponse(requestRepository.save(request));
    }

    @Override
    @Transactional
    public RequestResponse resolveRequest(Integer requestId) {
        Request request = findById(requestId);

        request.setStatus(RequestStatus.RESOLVED);
        request.setResolvedAt(LocalDateTime.now());

        return toResponse(requestRepository.save(request));
    }

    @Override
    @Transactional
    public RequestResponse closeRequest(Integer requestId) {
        Request request = findById(requestId);

        request.setStatus(RequestStatus.CLOSED);

        return toResponse(requestRepository.save(request));
    }

    // ── Helper ───────────────────────────────────────────────

    private Request findById(Integer requestId) {
        return requestRepository.findById(requestId)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Request not found"));
    }

    private User findUserById(Integer userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "User not found"));
    }

    private RequestResponse toResponse(Request request) {
        return RequestResponse.builder()
            .requestId(request.getRequestId())
            .userId(request.getUser().getUserId())
            .username(request.getUser().getUsername())
            .assignedStaffId(request.getAssignedStaff() != null
                ? request.getAssignedStaff().getUserId() : null)
            .assignedStaffName(request.getAssignedStaff() != null
                ? request.getAssignedStaff().getFullName() : null)
            .requestType(request.getRequestType())
            .subject(request.getSubject())
            .description(request.getDescription())
            .status(request.getStatus())
            .resolvedAt(request.getResolvedAt())
            .createdAt(request.getCreatedAt())
            .build();
    }
}
package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreateRequestRequest;
import com.swp391.parking.dto.response.RequestResponse;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.Request;
import com.swp391.parking.entity.Request.RequestStatus;
import com.swp391.parking.entity.Request.RequestType;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingBuildingRepository;
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
    private final ParkingBuildingRepository parkingBuildingRepository;

    @Override
    @Transactional
    public RequestResponse createRequest(Integer userId, CreateRequestRequest req) {
        User user = findUserById(userId);

        ParkingBuilding building = null;
        if (req.getBuildingId() != null) {
            building = parkingBuildingRepository.findById(req.getBuildingId())
                    .orElse(null);
        }

        Request request = Request.builder()
            .user(user)
            .requestType(req.getRequestType())
            .subject(req.getSubject())
            .description(req.getDescription())
            .status(RequestStatus.OPEN)
            .building(building)
            .build();

        Request saved = requestRepository.save(request);

        String notifBody = req.getSubject() != null ? req.getSubject() : req.getRequestType().name();
        if (building != null) {
            notificationService.notifyStaffInBuilding(building.getId(),
                    "Request moi tu driver", notifBody, "info", "REQUEST", saved.getRequestId());
        } else {
            notificationService.notifyAllStaff("Request moi tu driver",
                    notifBody, "info", "REQUEST", saved.getRequestId());
        }

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public RequestResponse getById(Integer requestId, Integer currentUserId, boolean staffScoped) {
        Request request = findById(requestId);
        enforceStaffAccess(request, currentUserId, staffScoped);
        return toResponse(request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RequestResponse> getByUserId(Integer userId, Integer currentUserId, boolean staffScoped) {
        return requestRepository.findByUser_UserId(userId)
            .stream()
            .filter(request -> canStaffAccess(request, currentUserId, staffScoped))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RequestResponse> getByStatus(RequestStatus status, Integer currentUserId, boolean staffScoped) {
        return requestRepository.findByStatus(status)
            .stream()
            .filter(request -> canStaffAccess(request, currentUserId, staffScoped))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RequestResponse> getByType(RequestType requestType, Integer currentUserId, boolean staffScoped) {
        return requestRepository.findByRequestType(requestType)
            .stream()
            .filter(request -> canStaffAccess(request, currentUserId, staffScoped))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RequestResponse assignStaff(Integer requestId, Integer staffId, Integer currentUserId, boolean staffScoped) {
        Request request = findById(requestId);
        enforceStaffAccess(request, currentUserId, staffScoped);
        User staff = findUserById(staffId);
        ensureStatus(request, RequestStatus.OPEN, "assign");
        if (!hasRole(staff, Role.RoleName.STAFF)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ có thể assign request cho tài khoản STAFF");
        }

        request.setAssignedStaff(staff);
        request.setStatus(RequestStatus.IN_PROGRESS);

        return toResponse(requestRepository.save(request));
    }

    @Override
    @Transactional
    public RequestResponse resolveRequest(Integer requestId, Integer currentUserId, boolean staffScoped) {
        Request request = findById(requestId);
        enforceAssignedStaff(request, currentUserId, staffScoped);
        ensureStatus(request, RequestStatus.IN_PROGRESS, "resolve");

        request.setStatus(RequestStatus.RESOLVED);
        request.setResolvedAt(LocalDateTime.now());

        return toResponse(requestRepository.save(request));
    }

    @Override
    @Transactional
    public RequestResponse closeRequest(Integer requestId, Integer currentUserId, boolean staffScoped) {
        Request request = findById(requestId);
        enforceAssignedStaff(request, currentUserId, staffScoped);
        ensureStatus(request, RequestStatus.RESOLVED, "close");

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

    private void ensureStatus(Request request, RequestStatus expectedStatus, String action) {
        if (request.getStatus() != expectedStatus) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Không thể " + action + " request khi trạng thái là " + request.getStatus()
                            + ". Trạng thái hợp lệ: " + expectedStatus);
        }
    }

    private boolean hasRole(User user, Role.RoleName roleName) {
        return user.getRoles() != null
                && user.getRoles().stream().anyMatch(role -> role.getRoleName() == roleName);
    }

    private void enforceStaffAccess(Request request, Integer currentUserId, boolean staffScoped) {
        if (!canStaffAccess(request, currentUserId, staffScoped)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem request của staff khác");
        }
    }

    private boolean canStaffAccess(Request request, Integer currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return true;
        }
        // Building scope: staff only sees requests for their assigned building
        User currentUser = userRepository.findById(currentUserId).orElse(null);
        if (currentUser != null
                && currentUser.getAssignedBuilding() != null
                && request.getBuilding() != null) {
            if (!currentUser.getAssignedBuilding().getId().equals(request.getBuilding().getId())) {
                return false;
            }
        }
        // Within scope: open requests visible to any staff, in-progress only to assigned staff
        if (request.getStatus() == RequestStatus.OPEN) {
            return true;
        }
        return request.getAssignedStaff() != null
                && request.getAssignedStaff().getUserId().equals(currentUserId);
    }

    private void enforceAssignedStaff(Request request, Integer currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return;
        }
        if (request.getAssignedStaff() == null || !request.getAssignedStaff().getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ staff được assign mới được xử lý request này");
        }
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

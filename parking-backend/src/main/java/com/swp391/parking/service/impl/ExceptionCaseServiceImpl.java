package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreateExceptionCaseRequest;
import com.swp391.parking.dto.response.ExceptionCaseResponse;
import com.swp391.parking.entity.ExceptionCase;
import com.swp391.parking.entity.ExceptionCase.ExceptionStatus;
import com.swp391.parking.entity.ExceptionCase.ExceptionType;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ExceptionCaseRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.ExceptionCaseService;
import com.swp391.parking.service.NotificationService;
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
    private final UserRepository userRepository;
    private final NotificationService notificationService;

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

        ExceptionCase saved = exceptionCaseRepository.save(exceptionCase);

        notificationService.notifyAllStaff("Exception moi",
                "Loai: " + req.getExceptionType() + ". " + (req.getDescription() != null ? req.getDescription() : ""),
                "warning", "EXCEPTION", saved.getExceptionId());

        return toResponse(saved);
    }

    @Override
    public ExceptionCaseResponse getById(Integer exceptionId, Integer currentUserId, boolean staffScoped) {
        ExceptionCase exceptionCase = findById(exceptionId);
        enforceStaffAccess(exceptionCase, currentUserId, staffScoped);
        return toResponse(exceptionCase);
    }

    @Override
    public List<ExceptionCaseResponse> getBySessionId(Integer sessionId, Integer currentUserId, boolean staffScoped) {
        return exceptionCaseRepository.findBySessionId(sessionId)
            .stream()
            .filter(exceptionCase -> canStaffAccess(exceptionCase, currentUserId, staffScoped))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ExceptionCaseResponse> getByRequestId(Integer requestId, Integer currentUserId, boolean staffScoped) {
        return exceptionCaseRepository.findByRequestId(requestId)
            .stream()
            .filter(exceptionCase -> canStaffAccess(exceptionCase, currentUserId, staffScoped))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ExceptionCaseResponse> getByStatus(ExceptionStatus status, Integer currentUserId, boolean staffScoped) {
        return exceptionCaseRepository.findByStatus(status)
            .stream()
            .filter(exceptionCase -> canStaffAccess(exceptionCase, currentUserId, staffScoped))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<ExceptionCaseResponse> getByType(ExceptionType exceptionType, Integer currentUserId, boolean staffScoped) {
        return exceptionCaseRepository.findByExceptionType(exceptionType)
            .stream()
            .filter(exceptionCase -> canStaffAccess(exceptionCase, currentUserId, staffScoped))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ExceptionCaseResponse assignToStaff(Integer exceptionId, Integer staffId, Integer currentUserId, boolean staffScoped) {
        ExceptionCase exceptionCase = findById(exceptionId);
        enforceStaffAccess(exceptionCase, currentUserId, staffScoped);
        if (exceptionCase.getStatus() != ExceptionStatus.OPEN) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chi co the assign exception dang OPEN (hien: " + exceptionCase.getStatus() + ")");
        }
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Khong tim thay staff duoc assign"));
        boolean isStaff = staff.getRoles() != null
                && staff.getRoles().stream().anyMatch(role -> role.getRoleName() == Role.RoleName.STAFF);
        if (!isStaff) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chi co the assign exception cho tai khoan STAFF");
        }

        exceptionCase.setResolvedBy(staffId);
        exceptionCase.setStatus(ExceptionStatus.IN_PROGRESS);

        return toResponse(exceptionCaseRepository.save(exceptionCase));
    }

    @Override
    @Transactional
    public ExceptionCaseResponse resolveExceptionCase(Integer exceptionId, Integer currentUserId, boolean staffScoped) {
        ExceptionCase exceptionCase = findById(exceptionId);
        enforceAssignedStaff(exceptionCase, currentUserId, staffScoped);
        if (exceptionCase.getStatus() != ExceptionStatus.IN_PROGRESS) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chi co the resolve exception dang IN_PROGRESS (hien: " + exceptionCase.getStatus() + ")");
        }

        exceptionCase.setStatus(ExceptionStatus.RESOLVED);
        exceptionCase.setResolvedAt(LocalDateTime.now());

        return toResponse(exceptionCaseRepository.save(exceptionCase));
    }

    @Override
    @Transactional
    public ExceptionCaseResponse closeExceptionCase(Integer exceptionId, Integer currentUserId, boolean staffScoped) {
        ExceptionCase exceptionCase = findById(exceptionId);
        enforceAssignedStaff(exceptionCase, currentUserId, staffScoped);
        if (exceptionCase.getStatus() != ExceptionStatus.RESOLVED) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chi co the close exception da RESOLVED (hien: " + exceptionCase.getStatus() + ")");
        }

        exceptionCase.setStatus(ExceptionStatus.CLOSED);

        return toResponse(exceptionCaseRepository.save(exceptionCase));
    }

    // ── Helper ───────────────────────────────────────────────

    private ExceptionCase findById(Integer exceptionId) {
        return exceptionCaseRepository.findById(exceptionId)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Exception case not found"));
    }

    private void enforceStaffAccess(ExceptionCase exceptionCase, Integer currentUserId, boolean staffScoped) {
        if (!canStaffAccess(exceptionCase, currentUserId, staffScoped)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem exception cua staff khac");
        }
    }

    private boolean canStaffAccess(ExceptionCase exceptionCase, Integer currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return true;
        }
        if (exceptionCase.getStatus() == ExceptionStatus.OPEN) {
            return true;
        }
        return exceptionCase.getResolvedBy() != null && exceptionCase.getResolvedBy().equals(currentUserId);
    }

    private void enforceAssignedStaff(ExceptionCase exceptionCase, Integer currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return;
        }
        if (exceptionCase.getResolvedBy() == null || !exceptionCase.getResolvedBy().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chi staff duoc assign moi duoc xu ly exception nay");
        }
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

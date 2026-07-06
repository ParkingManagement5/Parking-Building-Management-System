package com.swp391.parking.service.impl;

import com.swp391.parking.dto.response.ActivityLogResponse;
import com.swp391.parking.entity.ActivityLog;
import com.swp391.parking.entity.User;
import com.swp391.parking.repository.ActivityLogRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogServiceImpl implements ActivityLogService {

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void log(Integer userId, String actionType, String action) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        ActivityLog entry = ActivityLog.builder()
                .user(user)
                .actionType(actionType)
                .action(action)
                .ipAddress(resolveClientIp())
                .createdAt(LocalDateTime.now())
                .build();

        activityLogRepository.save(entry);
    }

    @Override
    public List<ActivityLogResponse> getAll() {
        return activityLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public List<ActivityLogResponse> getByUser(Integer userId) {
        return activityLogRepository.findAllByUser_UserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    private String resolveClientIp() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return null;
        }

        HttpServletRequest request = attributes.getRequest();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private ActivityLogResponse toResponse(ActivityLog entry) {
        return ActivityLogResponse.builder()
                .logId(entry.getLogId())
                .userId(entry.getUser() != null ? entry.getUser().getUserId() : null)
                .username(entry.getUser() != null ? entry.getUser().getUsername() : null)
                .actionType(entry.getActionType())
                .action(entry.getAction())
                .ipAddress(entry.getIpAddress())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}

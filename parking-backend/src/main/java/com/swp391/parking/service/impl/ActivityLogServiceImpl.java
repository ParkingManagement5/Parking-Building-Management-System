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

    // LOGIN la su kien tan suat cao, gia tri audit thap (khac voi doi vai
    // tro/trang thai/cau hinh - hiem, gia tri cao, giu vinh vien). Chi giu lai
    // N ban ghi LOGIN gan nhat moi user de bang activity_log khong bi phinh to
    // vo han theo thoi gian ("tran du lieu" khi nguoi dung dang nhap nhieu lan).
    private static final int LOGIN_HISTORY_LIMIT_PER_USER = 5;

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

        if ("LOGIN".equals(actionType) && userId != null) {
            pruneOldLoginEntries(userId);
        }
    }

    private void pruneOldLoginEntries(Integer userId) {
        List<ActivityLog> loginEntries =
                activityLogRepository.findAllByUser_UserIdAndActionTypeOrderByCreatedAtDesc(userId, "LOGIN");
        if (loginEntries.size() > LOGIN_HISTORY_LIMIT_PER_USER) {
            List<ActivityLog> stale = loginEntries.subList(LOGIN_HISTORY_LIMIT_PER_USER, loginEntries.size());
            activityLogRepository.deleteAll(stale);
        }
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

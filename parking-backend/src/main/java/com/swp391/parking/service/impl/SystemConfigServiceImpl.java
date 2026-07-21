package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.SystemConfigRequest;
import com.swp391.parking.dto.response.SystemConfigResponse;
import com.swp391.parking.entity.SystemConfig;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.SystemConfigRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.ActivityLogService;
import com.swp391.parking.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl implements SystemConfigService {

    private final SystemConfigRepository systemConfigRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;

    @Override
    public SystemConfigResponse create(SystemConfigRequest request, int updatedBy) {
        if (systemConfigRepository.existsByConfigKey(request.getConfigKey())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Config key already exists");
        }
        User user = userRepository.findById(updatedBy)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        SystemConfig config = SystemConfig.builder()
                .configKey(request.getConfigKey())
                .configValue(request.getConfigValue())
                .description(request.getDescription())
                .updatedBy(user)
                .updatedAt(LocalDateTime.now())
                .build();
        SystemConfig saved = systemConfigRepository.save(config);
        activityLogService.log(user.getUserId(), "SYSTEM_CONFIG_CHANGE",
                user.getUsername() + " da tao cau hinh " + saved.getConfigKey());
        return toResponse(saved);
    }

    @Override
    public SystemConfigResponse update(Long configId, SystemConfigRequest request, int updatedBy) {
        SystemConfig config = systemConfigRepository.findById(configId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Config not found"));
        User user = userRepository.findById(updatedBy)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        config.setConfigValue(request.getConfigValue());
        config.setDescription(request.getDescription());
        config.setUpdatedBy(user);
        config.setUpdatedAt(LocalDateTime.now());
        SystemConfig saved = systemConfigRepository.save(config);
        activityLogService.log(user.getUserId(), "SYSTEM_CONFIG_CHANGE",
                user.getUsername() + " da cap nhat cau hinh " + saved.getConfigKey() + " = " + saved.getConfigValue());
        return toResponse(saved);
    }

    @Override
    public SystemConfigResponse getById(Long configId) {
        return toResponse(systemConfigRepository.findById(configId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Config not found")));
    }

    @Override
    public SystemConfigResponse getByKey(String configKey) {
        return toResponse(systemConfigRepository.findByConfigKey(configKey)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Config not found")));
    }

    @Override
    public List<SystemConfigResponse> getAll() {
        return systemConfigRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void delete(Long configId) {
        if (!systemConfigRepository.existsById(configId)) {
            throw new AppException(HttpStatus.NOT_FOUND, "Config not found");
        }
        systemConfigRepository.deleteById(configId);
    }

    @Override
    public long getLongValue(String key, long defaultValue) {
        return systemConfigRepository.findByConfigKey(key)
                .map(cfg -> {
                    try {
                        return Long.parseLong(cfg.getConfigValue().trim());
                    } catch (Exception e) {
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    private SystemConfigResponse toResponse(SystemConfig config) {
        return SystemConfigResponse.builder()
                .configId(config.getConfigId())
                .configKey(config.getConfigKey())
                .configValue(config.getConfigValue())
                .description(config.getDescription())
                .updatedBy(config.getUpdatedBy() != null ? config.getUpdatedBy().getUserId() : null)
                .updatedAt(config.getUpdatedAt())
                .build();
    }
}
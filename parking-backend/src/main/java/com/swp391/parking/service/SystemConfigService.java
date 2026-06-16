package com.swp391.parking.service;

import com.swp391.parking.dto.request.SystemConfigRequest;
import com.swp391.parking.dto.response.SystemConfigResponse;

import java.util.List;

public interface SystemConfigService {
    SystemConfigResponse create(SystemConfigRequest request, int updatedBy);
    SystemConfigResponse update(Long configId, SystemConfigRequest request, int updatedBy);
    SystemConfigResponse getById(Long configId);
    SystemConfigResponse getByKey(String configKey);
    List<SystemConfigResponse> getAll();
    void delete(Long configId);
}
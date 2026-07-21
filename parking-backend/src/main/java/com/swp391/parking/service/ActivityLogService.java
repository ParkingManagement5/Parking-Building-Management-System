package com.swp391.parking.service;

import com.swp391.parking.dto.response.ActivityLogResponse;

import java.util.List;

public interface ActivityLogService {

    void log(Integer userId, String actionType, String action);

    List<ActivityLogResponse> getAll();

    List<ActivityLogResponse> getByUser(Integer userId);
}

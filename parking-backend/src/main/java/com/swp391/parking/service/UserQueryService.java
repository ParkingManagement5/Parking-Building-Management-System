package com.swp391.parking.service;

import com.swp391.parking.dto.response.UserSummaryResponse;

import java.util.List;

public interface UserQueryService {
    List<UserSummaryResponse> getUsers(String role);
    List<UserSummaryResponse> getUsers(String role, Long buildingId);
}

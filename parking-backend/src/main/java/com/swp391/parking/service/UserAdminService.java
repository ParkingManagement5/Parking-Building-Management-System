package com.swp391.parking.service;

import com.swp391.parking.dto.request.ChangeUserRoleRequest;
import com.swp391.parking.dto.response.UserSummaryResponse;

public interface UserAdminService {

    UserSummaryResponse changeUserRole(Integer userId, ChangeUserRoleRequest request, String actorUsername);

    UserSummaryResponse assignBuilding(Integer userId, Long buildingId);
}

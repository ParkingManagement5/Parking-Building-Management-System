package com.swp391.parking.service;

import com.swp391.parking.dto.request.ChangeUserRoleRequest;
import com.swp391.parking.dto.request.CreateStaffRequest;
import com.swp391.parking.dto.response.UserSummaryResponse;

public interface UserAdminService {

    UserSummaryResponse changeUserRole(Integer userId, ChangeUserRoleRequest request, String actorUsername);

    UserSummaryResponse changeUserStatus(Integer userId, String status, String actorUsername);

    /** buildingId == null nghĩa là gỡ khỏi toà nhà (unassign). */
    UserSummaryResponse assignBuilding(Integer userId, Long buildingId);

    /** forcedBuildingId != null (Manager) sẽ ghi đè request.getBuildingId() (dùng cho Admin). */
    UserSummaryResponse createStaff(CreateStaffRequest request, Long forcedBuildingId);
}

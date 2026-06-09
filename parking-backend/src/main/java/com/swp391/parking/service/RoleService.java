package com.swp391.parking.service;

import com.swp391.parking.dto.request.AssignRoleRequest;
import java.util.List;

public interface RoleService {
    List<String> getAllRoles();

    void assignRole(AssignRoleRequest request);

    void removeRole(AssignRoleRequest request);
}
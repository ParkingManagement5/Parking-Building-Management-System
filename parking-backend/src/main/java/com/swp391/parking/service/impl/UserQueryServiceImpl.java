package com.swp391.parking.service.impl;

import com.swp391.parking.dto.response.UserSummaryResponse;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.UserQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserQueryServiceImpl implements UserQueryService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsers(String role) {
        return getUsers(role, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsers(String role, Long buildingId) {
        List<User> users;
        if (buildingId != null) {
            // Scope by building — used by MANAGER
            Role.RoleName roleName = (role == null || role.isBlank()) ? null : parseRole(role);
            users = (roleName != null)
                    ? userRepository.findByRolesRoleNameAndAssignedBuilding_Id(roleName, buildingId)
                    : userRepository.findAll().stream()
                        .filter(u -> u.getAssignedBuilding() != null
                                && buildingId.equals(u.getAssignedBuilding().getId()))
                        .toList();
        } else {
            users = (role == null || role.isBlank())
                    ? userRepository.findAll()
                    : userRepository.findByRolesRoleName(parseRole(role));
        }

        return users.stream()
            .sorted(Comparator.comparing(User::getUserId))
            .map(this::toResponse)
            .toList();
    }

    private Role.RoleName parseRole(String role) {
        try {
            return Role.RoleName.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Role khong hop le: " + role);
        }
    }

    private UserSummaryResponse toResponse(User user) {
        String primaryRole = user.getRoles().stream()
            .findFirst()
            .map(r -> r.getRoleName().name())
            .orElse("UNKNOWN");

        UserSummaryResponse.UserSummaryResponseBuilder builder = UserSummaryResponse.builder()
            .userId(user.getUserId())
            .username(user.getUsername())
            .fullName(user.getFullName())
            .email(user.getEmail())
            .phone(user.getPhone())
            .role(primaryRole)
            .status(user.getStatus().name());

        if (user.getAssignedBuilding() != null) {
            builder.assignedBuildingId(user.getAssignedBuilding().getId().intValue())
                   .assignedBuildingName(user.getAssignedBuilding().getName());
        }

        return builder.build();
    }
}

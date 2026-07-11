package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.ChangeUserRoleRequest;
import com.swp391.parking.dto.response.UserSummaryResponse;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.RoleRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.ActivityLogService;
import com.swp391.parking.service.UserAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserAdminServiceImpl implements UserAdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ParkingBuildingRepository buildingRepository;
    private final ActivityLogService activityLogService;

    @Override
    @Transactional
    public UserSummaryResponse changeUserRole(Integer userId, ChangeUserRoleRequest request, String actorUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy user với id: " + userId));

        if (user.getUsername().equalsIgnoreCase(actorUsername)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể tự thay đổi role của chính mình");
        }

        Role.RoleName roleName = parseRole(request.getRoleName());
        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Role không tồn tại: " + roleName.name()));

        user.getRoles().clear();
        user.getRoles().add(role);

        User savedUser = userRepository.save(user);
        activityLogService.log(savedUser.getUserId(), "USER_ROLE_CHANGE",
                actorUsername + " đã đổi role của " + savedUser.getUsername() + " thành " + roleName.name());
        return toResponse(savedUser);
    }

    @Override
    @Transactional
    public UserSummaryResponse changeUserStatus(Integer userId, String status, String actorUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy user với id: " + userId));

        if (user.getUsername().equalsIgnoreCase(actorUsername)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Không thể tự khoá/mở khoá chính mình");
        }

        User.UserStatus newStatus = parseStatus(status);
        user.setStatus(newStatus);

        User savedUser = userRepository.save(user);
        activityLogService.log(savedUser.getUserId(), "USER_STATUS_CHANGE",
                actorUsername + " đã đổi trạng thái của " + savedUser.getUsername() + " thành " + newStatus.name());
        return toResponse(savedUser);
    }

    private User.UserStatus parseStatus(String status) {
        try {
            return User.UserStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Trạng thái không hợp lệ: " + status);
        }
    }

    @Override
    @Transactional
    public UserSummaryResponse assignBuilding(Integer userId, Long buildingId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy user"));

        ParkingBuilding building = buildingRepository.findById(buildingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy building"));

        user.setAssignedBuilding(building);
        return toResponse(userRepository.save(user));
    }

    private Role.RoleName parseRole(String role) {
        try {
            return Role.RoleName.valueOf(role.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Role không hợp lệ: " + role);
        }
    }

    private UserSummaryResponse toResponse(User user) {
        String primaryRole = user.getRoles().stream()
                .findFirst()
                .map(item -> item.getRoleName().name())
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

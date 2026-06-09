package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.AssignRoleRequest;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.RoleRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @Override
    public List<String> getAllRoles() {
        return roleRepository.findAll()
                .stream()
                .map(role -> role.getRoleName().name())
                .collect(Collectors.toList());
    }

    @Override
    public void assignRole(AssignRoleRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User không tồn tại"));
        Role role = roleRepository.findByRoleName(
                com.swp391.parking.entity.Role.RoleName.valueOf(request.getRoleName()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        user.getRoles().add(role);
        userRepository.save(user);
    }

    @Override
    public void removeRole(AssignRoleRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User không tồn tại"));
        Role role = roleRepository.findByRoleName(
                com.swp391.parking.entity.Role.RoleName.valueOf(request.getRoleName()))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Role không tồn tại"));
        user.getRoles().remove(role);
        userRepository.save(user);
    }
}
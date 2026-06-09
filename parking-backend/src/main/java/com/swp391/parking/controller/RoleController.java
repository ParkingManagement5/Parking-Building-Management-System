package com.swp391.parking.controller;

import com.swp391.parking.dto.request.AssignRoleRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    // GET /api/v1/roles — lấy danh sách tất cả role (chỉ ADMIN)
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<String>>> getAllRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.getAllRoles()));
    }

    // POST /api/v1/roles/assign — gán role cho user (chỉ ADMIN)
    @PostMapping("/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> assignRole(
            @RequestBody AssignRoleRequest request) {
        roleService.assignRole(request);
        return ResponseEntity.ok(ApiResponse.success("Gán role thành công"));
    }

    // DELETE /api/v1/roles/remove — xóa role khỏi user (chỉ ADMIN)
    @DeleteMapping("/remove")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> removeRole(
            @RequestBody AssignRoleRequest request) {
        roleService.removeRole(request);
        return ResponseEntity.ok(ApiResponse.success("Xóa role thành công"));
    }
}
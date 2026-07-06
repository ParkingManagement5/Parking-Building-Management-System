package com.swp391.parking.controller;

import com.swp391.parking.dto.response.ActivityLogResponse;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/activity-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ActivityLogResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(activityLogService.getAll()));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<ActivityLogResponse>>> getByUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(ApiResponse.success(activityLogService.getByUser(userId)));
    }
}

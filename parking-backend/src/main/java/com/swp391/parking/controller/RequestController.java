package com.swp391.parking.controller;

import com.swp391.parking.dto.request.CreateRequestRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.RequestResponse;
import com.swp391.parking.entity.Request.RequestStatus;
import com.swp391.parking.entity.Request.RequestType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.RequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/requests")
@RequiredArgsConstructor
@Tag(name = "Request", description = "Request management APIs")
public class RequestController {

    private final RequestService requestService;
    private final UserRepository userRepository;

    @Operation(summary = "Create a new request")
    @PostMapping
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RequestResponse>> createRequest(
            Authentication authentication,
            @Valid @RequestBody CreateRequestRequest request) {
        RequestResponse response = requestService.createRequest(resolveUserId(authentication), request);
        return ResponseEntity.ok(
            ApiResponse.success("Request created successfully", response));
    }

    @Operation(summary = "Get current user's requests")
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<RequestResponse>>> getMyRequests(Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(requestService.getByUserId(currentUserId, currentUserId, false)));
    }

    @Operation(summary = "Get request by ID")
    @GetMapping("/{requestId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RequestResponse>> getById(
            @PathVariable Integer requestId,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        RequestResponse response = requestService.getById(requestId, currentUserId, isStaff(authentication));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Get requests by user ID")
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<RequestResponse>>> getByUserId(
            @PathVariable Integer userId,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        List<RequestResponse> response = requestService.getByUserId(userId, currentUserId, isStaff(authentication));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Get requests by status")
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<RequestResponse>>> getByStatus(
            @PathVariable RequestStatus status,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        List<RequestResponse> response = requestService.getByStatus(status, currentUserId, isStaff(authentication));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Get requests by type")
    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<RequestResponse>>> getByType(
            @PathVariable RequestType type,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        List<RequestResponse> response = requestService.getByType(type, currentUserId, isStaff(authentication));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Assign staff to request")
    @PutMapping("/{requestId}/assign")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RequestResponse>> assignStaff(
            @PathVariable Integer requestId,
            @RequestParam Integer staffId,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        boolean staffScoped = isStaff(authentication);
        if (staffScoped && !currentUserId.equals(staffId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Staff chỉ được nhận request cho chính mình");
        }
        RequestResponse response = requestService.assignStaff(requestId, staffId, currentUserId, staffScoped);
        return ResponseEntity.ok(
            ApiResponse.success("Staff assigned successfully", response));
    }

    @Operation(summary = "Resolve request")
    @PutMapping("/{requestId}/resolve")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RequestResponse>> resolveRequest(
            @PathVariable Integer requestId,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        RequestResponse response = requestService.resolveRequest(requestId, currentUserId, isStaff(authentication));
        return ResponseEntity.ok(
            ApiResponse.success("Request resolved successfully", response));
    }

    @Operation(summary = "Close request")
    @PutMapping("/{requestId}/close")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RequestResponse>> closeRequest(
            @PathVariable Integer requestId,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        RequestResponse response = requestService.closeRequest(requestId, currentUserId, isStaff(authentication));
        return ResponseEntity.ok(
            ApiResponse.success("Request closed successfully", response));
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"));
    }

    private Integer resolveUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new AppException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        return userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User not found"))
            .getUserId();
    }
}

package com.swp391.parking.controller;

import com.swp391.parking.dto.request.CreateExceptionCaseRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.ExceptionCaseResponse;
import com.swp391.parking.entity.ExceptionCase.ExceptionStatus;
import com.swp391.parking.entity.ExceptionCase.ExceptionType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.ExceptionCaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/exceptions")
@RequiredArgsConstructor
public class ExceptionCaseController {

    private final ExceptionCaseService exceptionCaseService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> create(
            @Valid @RequestBody CreateExceptionCaseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Exception case created", exceptionCaseService.createExceptionCase(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> getById(
            @PathVariable Integer id,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                exceptionCaseService.getById(id, currentUserId, isStaff(authentication))));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExceptionCaseResponse>>> getByStatus(
            @PathVariable ExceptionStatus status,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                exceptionCaseService.getByStatus(status, currentUserId, isStaff(authentication))));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExceptionCaseResponse>>> getByType(
            @PathVariable ExceptionType type,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                exceptionCaseService.getByType(type, currentUserId, isStaff(authentication))));
    }

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExceptionCaseResponse>>> getBySession(
            @PathVariable Integer sessionId,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                exceptionCaseService.getBySessionId(sessionId, currentUserId, isStaff(authentication))));
    }

    @GetMapping("/request/{requestId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExceptionCaseResponse>>> getByRequest(
            @PathVariable Integer requestId,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success(
                exceptionCaseService.getByRequestId(requestId, currentUserId, isStaff(authentication))));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> assign(
            @PathVariable Integer id,
            @RequestParam Integer staffId,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        boolean staffScoped = isStaff(authentication);
        if (staffScoped && !currentUserId.equals(staffId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Staff chi duoc nhan exception cho chinh minh");
        }
        return ResponseEntity.ok(ApiResponse.success("Exception assigned",
                exceptionCaseService.assignToStaff(id, staffId, currentUserId, staffScoped)));
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> resolve(
            @PathVariable Integer id,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success("Exception resolved",
                exceptionCaseService.resolveExceptionCase(id, currentUserId, isStaff(authentication))));
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> close(
            @PathVariable Integer id,
            Authentication authentication) {
        Integer currentUserId = resolveUserId(authentication);
        return ResponseEntity.ok(ApiResponse.success("Exception closed",
                exceptionCaseService.closeExceptionCase(id, currentUserId, isStaff(authentication))));
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

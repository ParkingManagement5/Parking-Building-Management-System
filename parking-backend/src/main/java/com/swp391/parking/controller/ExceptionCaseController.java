package com.swp391.parking.controller;

import com.swp391.parking.dto.request.CreateExceptionCaseRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.ExceptionCaseResponse;
import com.swp391.parking.entity.ExceptionCase.ExceptionStatus;
import com.swp391.parking.entity.ExceptionCase.ExceptionType;
import com.swp391.parking.service.ExceptionCaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/exceptions")
@RequiredArgsConstructor
public class ExceptionCaseController {

    private final ExceptionCaseService exceptionCaseService;

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> create(
            @Valid @RequestBody CreateExceptionCaseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Exception case created", exceptionCaseService.createExceptionCase(request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(exceptionCaseService.getById(id)));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExceptionCaseResponse>>> getByStatus(@PathVariable ExceptionStatus status) {
        return ResponseEntity.ok(ApiResponse.success(exceptionCaseService.getByStatus(status)));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExceptionCaseResponse>>> getByType(@PathVariable ExceptionType type) {
        return ResponseEntity.ok(ApiResponse.success(exceptionCaseService.getByType(type)));
    }

    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExceptionCaseResponse>>> getBySession(@PathVariable Integer sessionId) {
        return ResponseEntity.ok(ApiResponse.success(exceptionCaseService.getBySessionId(sessionId)));
    }

    @GetMapping("/request/{requestId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ExceptionCaseResponse>>> getByRequest(@PathVariable Integer requestId) {
        return ResponseEntity.ok(ApiResponse.success(exceptionCaseService.getByRequestId(requestId)));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> assign(
            @PathVariable Integer id,
            @RequestParam Integer staffId) {
        return ResponseEntity.ok(ApiResponse.success("Exception assigned", exceptionCaseService.assignToStaff(id, staffId)));
    }

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> resolve(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Exception resolved", exceptionCaseService.resolveExceptionCase(id)));
    }

    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ExceptionCaseResponse>> close(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success("Exception closed", exceptionCaseService.closeExceptionCase(id)));
    }
}

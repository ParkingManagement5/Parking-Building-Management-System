package com.swp391.parking.controller;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.SessionResponse;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.ParkingSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
@Tag(name = "Parking Session", description = "Check-in / Check-out")
@SecurityRequirement(name = "bearerAuth")
public class ParkingSessionController {

    private final ParkingSessionService sessionService;
    private final UserRepository userRepository;

    @PostMapping("/entry")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Xe vào cổng",
            description = "entryMode: BOOKING (truyền qrToken) | WALK_IN_AUTO | WALK_IN_MANUAL (truyền licensePlate + slotId)")
    public ResponseEntity<ApiResponse<SessionResponse>> entry(
            @Valid @RequestBody SessionEntryRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Xe đã vào bãi",
                sessionService.processEntry(request)));
    }

    @PostMapping("/{id}/exit")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Xe ra cổng — chờ thanh toán",
            description = "Session → WAITING_PAYMENT. BE4 xử lý payment sau.")
    public ResponseEntity<ApiResponse<SessionResponse>> exit(
            @PathVariable Long id,
            @Valid @RequestBody SessionExitRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Xe đang chờ thanh toán",
                sessionService.processExit(id, request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Xem chi tiết session")
    public ResponseEntity<ApiResponse<SessionResponse>> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(sessionService.getSession(id)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Lịch sử đỗ xe của tôi")
    public ResponseEntity<ApiResponse<List<SessionResponse>>> getMy(
            @AuthenticationPrincipal UserDetails ud) {
        Long userId = userRepository.findByUsername(ud.getUsername())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User không tồn tại"))
                .getId();
        return ResponseEntity.ok(ApiResponse.success(sessionService.getMySessions(userId)));
    }
}

package com.swp391.parking.controller;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.BookingResponse;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.BookingService;
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
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Booking", description = "Quản lý đặt chỗ")
@SecurityRequirement(name = "bearerAuth")
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Tạo booking mới",
            description = "Driver đặt chỗ trước ≥10 phút. Trả về depositAmount — cần thanh toán để lấy QR.")
    public ResponseEntity<ApiResponse<BookingResponse>> create(
            @AuthenticationPrincipal UserDetails ud,
            @Valid @RequestBody CreateBookingRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Đặt chỗ thành công, vui lòng thanh toán cọc để nhận QR",
                bookingService.createBooking(getCurrentUserId(ud), request)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Xem chi tiết booking")
    public ResponseEntity<ApiResponse<BookingResponse>> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(bookingService.getBooking(id)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Lấy danh sách booking của tôi")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMy(
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success(bookingService.getMyBookings(getCurrentUserId(ud))));
    }

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Hủy booking", description = "Chỉ hủy được PENDING_PAYMENT hoặc CONFIRMED.")
    public ResponseEntity<ApiResponse<BookingResponse>> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(ApiResponse.success("Hủy thành công",
                bookingService.cancelBooking(id, getCurrentUserId(ud))));
    }

    @PutMapping("/{id}/confirm-payment")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "[Internal] Xác nhận thanh toán deposit → sinh QR",
            description = "BE4 gọi sau khi payment deposit PAID.")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmPayment(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("QR đã được tạo",
                bookingService.confirmBookingAfterPayment(id)));
    }

    private Long getCurrentUserId(UserDetails ud) {
        return userRepository.findByUsername(ud.getUsername())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User không tồn tại"))
                .getUserId().longValue();
    }
}

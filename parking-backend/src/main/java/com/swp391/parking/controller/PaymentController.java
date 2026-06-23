package com.swp391.parking.controller;

import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.PaymentResponse;
import com.swp391.parking.entity.Payment.PaymentMethod;
import com.swp391.parking.entity.Payment.PaymentStatus;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "Payment management APIs")
public class PaymentController {

    private final PaymentService paymentService;
    private final UserRepository userRepository;

    @Operation(summary = "Create deposit for booking")
    @PostMapping("/deposit")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> createDeposit(
            @RequestParam Integer bookingId,
            @RequestParam BigDecimal depositAmount,
            @RequestParam PaymentMethod paymentMethod) {
        PaymentResponse response = paymentService.createDeposit(
            bookingId, depositAmount, paymentMethod);
        return ResponseEntity.ok(
            ApiResponse.success("Deposit created successfully", response));
    }

    @Operation(summary = "Confirm deposit payment")
    @PutMapping("/deposit/{paymentId}/confirm")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmDeposit(
            @PathVariable Integer paymentId) {
        PaymentResponse response = paymentService.confirmDeposit(paymentId);
        return ResponseEntity.ok(
            ApiResponse.success("Deposit confirmed successfully", response));
    }

    @Operation(summary = "Create parking fee for session")
    @PostMapping("/parking-fee")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> createParkingFee(
            @RequestParam Integer sessionId,
            @RequestParam(required = false) Integer bookingId,
            @RequestParam(required = false) Integer policyId,
            @RequestParam(required = false) BigDecimal appliedRate,
            @RequestParam(required = false) BigDecimal baseFee,
            @RequestParam(required = false) BigDecimal overtimeFee,
            @RequestParam(required = false) BigDecimal penaltyFee,
            @RequestParam(required = false) BigDecimal discount,
            @RequestParam(required = false) BigDecimal depositDeducted,
            @RequestParam BigDecimal totalAmount,
            @RequestParam PaymentMethod paymentMethod) {
        PaymentResponse response = paymentService.createParkingFee(
                sessionId,
                bookingId,
                policyId,
                appliedRate,
                baseFee,
                overtimeFee,
                penaltyFee,
                discount,
                depositDeducted,
                totalAmount,
                paymentMethod);
        return ResponseEntity.ok(ApiResponse.success("Parking fee created successfully", response));
    }

    @Operation(summary = "Confirm parking fee payment")
    @PutMapping("/parking-fee/{paymentId}/confirm")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmParkingFee(
            @PathVariable Integer paymentId,
            @RequestParam(required = false) String transactionRef) {
        PaymentResponse response = paymentService.confirmParkingFee(
            paymentId, transactionRef);
        return ResponseEntity.ok(
            ApiResponse.success("Payment confirmed successfully", response));
    }

    @Operation(summary = "Get payment by ID")
    @GetMapping("/{paymentId}")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> getById(
            @PathVariable Integer paymentId) {
        PaymentResponse response = paymentService.getById(paymentId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Get current user's payments")
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getMyPayments(
            Authentication authentication) {
        Long userId = userRepository.findByUsername(authentication.getName())
            .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Khong tim thay user"))
            .getUserId().longValue();
        return ResponseEntity.ok(ApiResponse.success(paymentService.getMyPayments(userId)));
    }

    @Operation(summary = "Get payments by status")
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getByStatus(
            @PathVariable PaymentStatus status) {
        return ResponseEntity.ok(ApiResponse.success(paymentService.getByStatus(status)));
    }

    @Operation(summary = "Get payments by booking ID")
    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getByBookingId(
            @PathVariable Integer bookingId) {
        List<PaymentResponse> response = paymentService.getByBookingId(bookingId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Get payments by session ID")
    @GetMapping("/session/{sessionId}")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getBySessionId(
            @PathVariable Integer sessionId) {
        List<PaymentResponse> response = paymentService.getBySessionId(sessionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

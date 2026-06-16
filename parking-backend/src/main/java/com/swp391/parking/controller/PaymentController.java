package com.swp391.parking.controller;

import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.PaymentResponse;
import com.swp391.parking.entity.Payment.PaymentMethod;
import com.swp391.parking.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment", description = "Payment management APIs")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Create deposit for booking")
    @PostMapping("/deposit")
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
    public ResponseEntity<ApiResponse<PaymentResponse>> confirmDeposit(
            @PathVariable Integer paymentId) {
        PaymentResponse response = paymentService.confirmDeposit(paymentId);
        return ResponseEntity.ok(
            ApiResponse.success("Deposit confirmed successfully", response));
    }

    @Operation(summary = "Confirm parking fee payment")
    @PutMapping("/parking-fee/{paymentId}/confirm")
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
    public ResponseEntity<ApiResponse<PaymentResponse>> getById(
            @PathVariable Integer paymentId) {
        PaymentResponse response = paymentService.getById(paymentId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Get payments by booking ID")
    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getByBookingId(
            @PathVariable Integer bookingId) {
        List<PaymentResponse> response = paymentService.getByBookingId(bookingId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(summary = "Get payments by session ID")
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getBySessionId(
            @PathVariable Integer sessionId) {
        List<PaymentResponse> response = paymentService.getBySessionId(sessionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
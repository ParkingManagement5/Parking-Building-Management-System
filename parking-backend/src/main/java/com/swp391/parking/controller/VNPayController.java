package com.swp391.parking.controller;

import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.PaymentResponse;
import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.Payment.PaymentMethod;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.PaymentRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.PaymentService;
import com.swp391.parking.service.VNPayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments/vnpay")
@RequiredArgsConstructor
@Tag(name = "VNPay", description = "Tich hop thanh toan VNPay")
public class VNPayController {

    private final VNPayService vnPayService;
    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    @Operation(summary = "Tao URL thanh toan coc qua VNPay")
    @PostMapping("/create-deposit/{bookingId}")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createDepositUrl(
            @PathVariable Integer bookingId,
            HttpServletRequest request,
            Authentication authentication) {
        boolean isDriver = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DRIVER"));
        if (isDriver) {
            Long userId = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User not found"))
                    .getUserId().longValue();
            paymentService.enforceBookingOwnership(bookingId, userId);
        }

        var booking = bookingRepository.findById(bookingId.longValue())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Booking khong ton tai"));

        if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking da duoc xac nhan (da thanh toan coc)");
        }
        if (booking.getStatus() == Booking.BookingStatus.EXPIRED
                || booking.getStatus() == Booking.BookingStatus.CANCELLED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking da het han hoac bi huy, khong the thanh toan");
        }
        if (booking.getStatus() != Booking.BookingStatus.PENDING_PAYMENT) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking khong o trang thai cho thanh toan");
        }

        BigDecimal depositAmount = booking.getDepositAmount();
        if (depositAmount == null || depositAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Booking nay khong yeu cau coc (depositAmount = 0). Xac nhan mien phi.");
        }

        // Extend expiredAt 30 min to give user time to complete VNPay payment
        booking.setExpiredAt(LocalDateTime.now().plusMinutes(30));
        bookingRepository.save(booking);

        PaymentResponse payment = paymentService.createDeposit(bookingId, depositAmount, PaymentMethod.VNPAY);
        String orderInfo = "Coc booking #" + bookingId;
        String paymentUrl = vnPayService.createPaymentUrl(
                payment.getPaymentId(),
                depositAmount,
                orderInfo,
                getClientIp(request)
        );

        Map<String, Object> result = new HashMap<>();
        result.put("paymentUrl", paymentUrl);
        result.put("paymentId", payment.getPaymentId());
        result.put("amount", depositAmount);
        return ResponseEntity.ok(ApiResponse.success("Tao URL thanh toan thanh cong", result));
    }

    @Operation(summary = "Tao URL thanh toan phi do xe qua VNPay")
    @PostMapping("/create-parking-fee/{sessionId}")
    @PreAuthorize("hasAnyRole('DRIVER','STAFF','MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createParkingFeeUrl(
            @PathVariable Integer sessionId,
            HttpServletRequest request,
            Authentication authentication) {
        boolean isDriver = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_DRIVER"));
        if (isDriver) {
            Long userId = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User not found"))
                    .getUserId().longValue();
            paymentService.enforceSessionOwnership(sessionId, userId);
        }

        PaymentResponse payment = paymentService.createParkingFee(
                sessionId,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                BigDecimal.ZERO,
                PaymentMethod.VNPAY
        );

        BigDecimal total = payment.getTotalAmount();
        Map<String, Object> result = new HashMap<>();

        if (total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            paymentService.confirmParkingFee(payment.getPaymentId(), "FREE-GRACE");
            result.put("paymentUrl", null);
            result.put("paymentId", payment.getPaymentId());
            result.put("amount", BigDecimal.ZERO);
            result.put("autoConfirmed", true);
            return ResponseEntity.ok(ApiResponse.success("Phi = 0, da xac nhan tu dong", result));
        }

        String paymentUrl = vnPayService.createPaymentUrl(
                payment.getPaymentId(),
                total,
                "Phi do xe session #" + sessionId,
                getClientIp(request)
        );
        result.put("paymentUrl", paymentUrl);
        result.put("paymentId", payment.getPaymentId());
        result.put("amount", total);
        result.put("autoConfirmed", false);
        return ResponseEntity.ok(ApiResponse.success("Tao URL thanh toan thanh cong", result));
    }

    @Operation(summary = "IPN callback tu VNPay")
    @GetMapping("/ipn")
    public ResponseEntity<Map<String, String>> handleIpn(@RequestParam Map<String, String> params) {
        log.info("VNPay IPN received: txnRef={}, responseCode={}", params.get("vnp_TxnRef"), params.get("vnp_ResponseCode"));
        return ResponseEntity.ok(processCallback(params, "IPN"));
    }

    @Operation(summary = "Return callback fallback tu frontend sau khi redirect tu VNPay")
    @GetMapping("/return")
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleReturn(@RequestParam Map<String, String> params) {
        log.info("VNPay RETURN fallback received: txnRef={}, responseCode={}", params.get("vnp_TxnRef"), params.get("vnp_ResponseCode"));

        Map<String, String> callback = processCallback(params, "RETURN");
        Map<String, Object> result = new HashMap<>();
        result.put("rspCode", callback.get("RspCode"));
        result.put("message", callback.get("Message"));
        result.put("txnRef", params.get("vnp_TxnRef"));
        result.put("responseCode", params.get("vnp_ResponseCode"));

        boolean success = "00".equals(callback.get("RspCode")) || "02".equals(callback.get("RspCode"));
        if (success) {
            return ResponseEntity.ok(ApiResponse.success("VNPay callback da duoc xu ly", result));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Map<String, Object>>builder()
                        .success(false)
                        .message("VNPay callback chua duoc xac nhan")
                        .data(result)
                        .build());
    }

    private Map<String, String> processCallback(Map<String, String> params, String source) {
        Map<String, String> response = new HashMap<>();
        Map<String, String> mutableParams = new HashMap<>(params);

        if (!vnPayService.verifyIpn(mutableParams)) {
            log.warn("VNPay {}: checksum khong hop le", source);
            response.put("RspCode", "97");
            response.put("Message", "Invalid Checksum");
            return response;
        }

        String txnRef = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");
        String transactionNo = params.get("vnp_TransactionNo");

        Integer paymentId;
        try {
            paymentId = vnPayService.parsePaymentId(txnRef);
        } catch (Exception e) {
            log.error("VNPay {}: khong parse duoc paymentId tu txnRef={}", source, txnRef);
            response.put("RspCode", "01");
            response.put("Message", "Order Not Found");
            return response;
        }

        Payment payment = paymentRepository.findById(paymentId).orElse(null);
        if (payment == null) {
            response.put("RspCode", "01");
            response.put("Message", "Order Not Found");
            return response;
        }

        if (payment.getPaymentStatus() == Payment.PaymentStatus.PAID) {
            response.put("RspCode", "02");
            response.put("Message", "Order Already Confirmed");
            return response;
        }

        if (!"00".equals(responseCode)) {
            log.info("VNPay {}: payment failed, responseCode={}, paymentId={}", source, responseCode, paymentId);
            try {
                paymentService.markFailed(paymentId, transactionNo);
            } catch (Exception ignored) {
            }
            response.put("RspCode", "00");
            response.put("Message", "Confirm Success");
            return response;
        }

        try {
            if (payment.getPaymentType() == Payment.PaymentType.DEPOSIT) {
                paymentService.confirmDeposit(paymentId, transactionNo);
                log.info("VNPay {}: DEPOSIT #{} confirmed, booking -> CONFIRMED", source, paymentId);
            } else if (payment.getPaymentType() == Payment.PaymentType.PARKING_FEE) {
                paymentService.confirmParkingFee(paymentId, transactionNo);
                log.info("VNPay {}: PARKING_FEE #{} confirmed, session -> COMPLETED", source, paymentId);
            }
            response.put("RspCode", "00");
            response.put("Message", "Confirm Success");
        } catch (Exception e) {
            log.error("VNPay {}: error when confirming payment #{}: {}", source, paymentId, e.getMessage());
            response.put("RspCode", "99");
            response.put("Message", "Unknown Error");
        }

        return response;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}

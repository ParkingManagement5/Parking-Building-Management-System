package com.swp391.parking.service;

import com.swp391.parking.dto.response.PaymentResponse;
import com.swp391.parking.entity.Payment.PaymentMethod;
import com.swp391.parking.entity.Payment.PaymentStatus;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentService {

    PaymentResponse createDeposit(Integer bookingId,
                                   BigDecimal depositAmount,
                                   PaymentMethod paymentMethod);

    PaymentResponse confirmDeposit(Integer paymentId, String transactionRef);

    default PaymentResponse confirmDeposit(Integer paymentId) {
        return confirmDeposit(paymentId, null);
    }

    PaymentResponse markFailed(Integer paymentId, String transactionRef);

    PaymentResponse createParkingFee(Integer sessionId,
                                      Integer bookingId,
                                      Integer policyId,
                                      BigDecimal appliedRate,
                                      BigDecimal baseFee,
                                      BigDecimal overtimeFee,
                                      BigDecimal penaltyFee,
                                      BigDecimal discount,
                                      BigDecimal depositDeducted,
                                      BigDecimal totalAmount,
                                      PaymentMethod paymentMethod);

    PaymentResponse confirmParkingFee(Integer paymentId, String transactionRef);

    PaymentResponse refundPayment(Integer paymentId, String transactionRef);

    PaymentResponse getById(Integer paymentId);

    List<PaymentResponse> getByBookingId(Integer bookingId);

    List<PaymentResponse> getBySessionId(Integer sessionId);

    List<PaymentResponse> getByStatus(PaymentStatus status, Long currentUserId, boolean staffScoped);

    List<PaymentResponse> getMyPayments(Long userId);

    void enforcePaymentOwnership(Integer paymentId, Long userId);

    void enforceBookingOwnership(Integer bookingId, Long userId);

    void enforceSessionOwnership(Integer sessionId, Long userId);

    void enforcePaymentBuildingScope(Integer paymentId, Long currentUserId, boolean staffScoped);

    void enforceBookingBuildingScope(Integer bookingId, Long currentUserId, boolean staffScoped);

    void enforceSessionBuildingScope(Integer sessionId, Long currentUserId, boolean staffScoped);
}

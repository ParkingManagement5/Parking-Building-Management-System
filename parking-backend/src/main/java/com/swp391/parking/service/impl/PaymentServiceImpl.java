package com.swp391.parking.service.impl;

import com.swp391.parking.dto.response.PaymentResponse;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.Payment.PaymentMethod;
import com.swp391.parking.entity.Payment.PaymentStatus;
import com.swp391.parking.entity.Payment.PaymentType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.PaymentRepository;
import com.swp391.parking.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;

    @Override
    @Transactional
    public PaymentResponse createDeposit(Integer bookingId,
                                          BigDecimal depositAmount,
                                          PaymentMethod paymentMethod) {
        paymentRepository.findByBookingIdAndPaymentType(bookingId, PaymentType.DEPOSIT)
            .ifPresent(p -> {
                throw new AppException(HttpStatus.CONFLICT,
                    "Deposit already exists for this booking");
            });

        Payment payment = Payment.builder()
            .bookingId(bookingId)
            .paymentType(PaymentType.DEPOSIT)
            .paymentMethod(paymentMethod)
            .paymentStatus(PaymentStatus.PENDING)
            .totalAmount(depositAmount)
            .build();

        return toResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse confirmDeposit(Integer paymentId) {
        Payment payment = findById(paymentId);

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(HttpStatus.CONFLICT, "Payment already paid");
        }

        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());

        return toResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse createParkingFee(Integer sessionId,
                                             Integer bookingId,
                                             Integer policyId,
                                             BigDecimal appliedRate,
                                             BigDecimal baseFee,
                                             BigDecimal overtimeFee,
                                             BigDecimal penaltyFee,
                                             BigDecimal discount,
                                             BigDecimal depositDeducted,
                                             BigDecimal totalAmount,
                                             PaymentMethod paymentMethod) {
        Payment payment = Payment.builder()
            .sessionId(sessionId)
            .bookingId(bookingId)
            .policyId(policyId)
            .paymentType(PaymentType.PARKING_FEE)
            .paymentMethod(paymentMethod)
            .paymentStatus(PaymentStatus.PENDING)
            .appliedRate(appliedRate)
            .baseFee(baseFee)
            .overtimeFee(overtimeFee)
            .penaltyFee(penaltyFee)
            .discount(discount)
            .depositDeducted(depositDeducted)
            .totalAmount(totalAmount)
            .build();

        return toResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse confirmParkingFee(Integer paymentId,
                                              String transactionRef) {
        Payment payment = findById(paymentId);

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(HttpStatus.CONFLICT, "Payment already paid");
        }

        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        payment.setTransactionRef(transactionRef);

        return toResponse(paymentRepository.save(payment));
    }

    @Override
    public PaymentResponse getById(Integer paymentId) {
        return toResponse(findById(paymentId));
    }

    @Override
    public List<PaymentResponse> getByBookingId(Integer bookingId) {
        return paymentRepository.findByBookingId(bookingId)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    public List<PaymentResponse> getBySessionId(Integer sessionId) {
        return paymentRepository.findBySessionId(sessionId)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    // ── Helper ───────────────────────────────────────────────

    private Payment findById(Integer paymentId) {
        return paymentRepository.findById(paymentId)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Payment not found"));
    }

    private PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
            .paymentId(payment.getPaymentId())
            .bookingId(payment.getBookingId())
            .sessionId(payment.getSessionId())
            .policyId(payment.getPolicyId())
            .paymentType(payment.getPaymentType())
            .appliedRate(payment.getAppliedRate())
            .baseFee(payment.getBaseFee())
            .overtimeFee(payment.getOvertimeFee())
            .penaltyFee(payment.getPenaltyFee())
            .discount(payment.getDiscount())
            .depositDeducted(payment.getDepositDeducted())
            .totalAmount(payment.getTotalAmount())
            .transactionRef(payment.getTransactionRef())
            .paymentMethod(payment.getPaymentMethod())
            .paymentStatus(payment.getPaymentStatus())
            .paidAt(payment.getPaidAt())
            .createdAt(payment.getCreatedAt())
            .build();
    }
}
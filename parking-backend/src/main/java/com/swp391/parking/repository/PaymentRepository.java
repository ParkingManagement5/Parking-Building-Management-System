package com.swp391.parking.repository;

import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.Payment.PaymentStatus;
import com.swp391.parking.entity.Payment.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    // Tìm payment theo bookingId
    List<Payment> findByBookingId(Integer bookingId);

    // Tìm payment theo sessionId
    List<Payment> findBySessionId(Integer sessionId);

    // Tìm deposit của 1 booking cụ thể
    Optional<Payment> findByBookingIdAndPaymentType(
        Integer bookingId, PaymentType paymentType
    );

    // Tìm theo mã giao dịch VNPAY
    Optional<Payment> findByTransactionRef(String transactionRef);

    // Lấy tất cả payment đã PAID (dùng cho report)
    List<Payment> findByPaymentStatus(PaymentStatus status);
}
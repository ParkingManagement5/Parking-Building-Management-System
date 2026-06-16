package com.swp391.parking.repository;

import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.Payment.PaymentStatus;
import com.swp391.parking.entity.Payment.PaymentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    List<Payment> findByBookingId(Integer bookingId);

    List<Payment> findBySessionId(Integer sessionId);

    Optional<Payment> findByBookingIdAndPaymentType(
        Integer bookingId, PaymentType paymentType
    );

    Optional<Payment> findByTransactionRef(String transactionRef);

    List<Payment> findByPaymentStatus(PaymentStatus status);

    @Query(
        value = """
            SELECT p.*
            FROM payment p
            LEFT JOIN booking b ON p.booking_id = b.booking_id
            LEFT JOIN parking_session s ON p.session_id = s.session_id
            WHERE b.user_id = :userId OR s.user_id = :userId
            ORDER BY p.created_at DESC
            """,
        nativeQuery = true
    )
    List<Payment> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);
}

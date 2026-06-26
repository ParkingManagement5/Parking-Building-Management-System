package com.swp391.parking.repository;

import com.swp391.parking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    // Tất cả booking của 1 user
    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Kiểm tra xe có booking active không [BR-06]
    Optional<Booking> findByVehicle_IdAndStatusIn(Long vehicleId, List<Booking.BookingStatus> statuses);

    // Kiểm tra double-book slot [BR-01]
    @Query("""
        SELECT b FROM Booking b
        WHERE b.slot.id = :slotId
          AND b.status IN ('CONFIRMED','PENDING_PAYMENT','CHECKED_IN')
          AND b.bookingStartTime < :endTime
          AND b.bookingEndTime   > :startTime
    """)
    List<Booking> findConflictingBookings(@Param("slotId") Long slotId,
                                          @Param("startTime") LocalDateTime startTime,
                                          @Param("endTime") LocalDateTime endTime);

    // Scheduler: PENDING_PAYMENT hết expired_at
    List<Booking> findByStatusAndExpiredAtBefore(Booking.BookingStatus status, LocalDateTime now);

    // Session-based: CONFIRMED quá hạn expiredAt
    @Query("SELECT b FROM Booking b WHERE b.status = 'CONFIRMED' AND b.expiredAt < :now")
    List<Booking> findConfirmedExpired(@Param("now") LocalDateTime now);

    // Verify QR khi check-in
    Optional<Booking> findByQrToken(String qrToken);

    // Kiểm tra slot đã có booking active chưa (session-based, không cần time range)
    Optional<Booking> findBySlot_IdAndStatusIn(Long slotId, List<Booking.BookingStatus> statuses);
}

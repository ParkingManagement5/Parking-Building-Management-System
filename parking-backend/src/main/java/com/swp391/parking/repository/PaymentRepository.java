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

    List<Payment> findByPaymentStatusOrderByCreatedAtDesc(PaymentStatus status);

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

    // Thống kê doanh thu theo tháng trong năm, scoped by building (null = tất cả)
    // Join 2 path: session→slot (PARKING_FEE) và booking→slot (DEPOSIT)
    @Query(value = """
        SELECT
            MONTH(p.paid_at)                 AS month,
            COALESCE(SUM(p.total_amount), 0) AS revenue,
            COUNT(p.payment_id)              AS transactions
        FROM payment p
        LEFT JOIN parking_session s    ON p.session_id = s.session_id
        LEFT JOIN parking_slot    sl_s ON s.slot_id    = sl_s.slot_id
        LEFT JOIN zone            z_s  ON sl_s.zone_id = z_s.zone_id
        LEFT JOIN floor           f_s  ON z_s.floor_id = f_s.floor_id
        LEFT JOIN booking         bk   ON p.booking_id = bk.booking_id
        LEFT JOIN parking_slot    sl_b ON bk.slot_id   = sl_b.slot_id
        LEFT JOIN zone            z_b  ON sl_b.zone_id = z_b.zone_id
        LEFT JOIN floor           f_b  ON z_b.floor_id = f_b.floor_id
        WHERE p.payment_status = 'PAID'
          AND YEAR(p.paid_at) = :year
          AND (:buildingId IS NULL
               OR f_s.building_id = :buildingId
               OR f_b.building_id = :buildingId)
        GROUP BY MONTH(p.paid_at)
        ORDER BY MONTH(p.paid_at)
        """, nativeQuery = true)
    List<Object[]> getMonthlyRevenue(@Param("year") int year,
                                     @Param("buildingId") Long buildingId);

    // Thống kê doanh thu theo ngày trong tháng, scoped by building
    @Query(value = """
        SELECT
            DAY(p.paid_at)                   AS day,
            COALESCE(SUM(p.total_amount), 0) AS revenue,
            COUNT(p.payment_id)              AS transactions
        FROM payment p
        LEFT JOIN parking_session s    ON p.session_id = s.session_id
        LEFT JOIN parking_slot    sl_s ON s.slot_id    = sl_s.slot_id
        LEFT JOIN zone            z_s  ON sl_s.zone_id = z_s.zone_id
        LEFT JOIN floor           f_s  ON z_s.floor_id = f_s.floor_id
        LEFT JOIN booking         bk   ON p.booking_id = bk.booking_id
        LEFT JOIN parking_slot    sl_b ON bk.slot_id   = sl_b.slot_id
        LEFT JOIN zone            z_b  ON sl_b.zone_id = z_b.zone_id
        LEFT JOIN floor           f_b  ON z_b.floor_id = f_b.floor_id
        WHERE p.payment_status = 'PAID'
          AND YEAR(p.paid_at)  = :year
          AND MONTH(p.paid_at) = :month
          AND (:buildingId IS NULL
               OR f_s.building_id = :buildingId
               OR f_b.building_id = :buildingId)
        GROUP BY DAY(p.paid_at)
        ORDER BY DAY(p.paid_at)
        """, nativeQuery = true)
    List<Object[]> getDailyRevenue(@Param("year") int year,
                                   @Param("month") int month,
                                   @Param("buildingId") Long buildingId);

    // Thống kê doanh thu theo loại xe trong năm, scoped by building
    @Query(value = """
        SELECT
            COALESCE(vt_s.name, vt_b.name, 'Unknown') AS vehicleType,
            COALESCE(SUM(p.total_amount), 0)           AS revenue,
            COUNT(p.payment_id)                        AS transactions
        FROM payment p
        LEFT JOIN parking_session s    ON p.session_id        = s.session_id
        LEFT JOIN vehicle         v_s  ON s.vehicle_id        = v_s.vehicle_id
        LEFT JOIN vehicle_type    vt_s ON v_s.vehicle_type_id = vt_s.vehicle_type_id
        LEFT JOIN parking_slot    sl_s ON s.slot_id           = sl_s.slot_id
        LEFT JOIN zone            z_s  ON sl_s.zone_id        = z_s.zone_id
        LEFT JOIN floor           f_s  ON z_s.floor_id        = f_s.floor_id
        LEFT JOIN booking         bk   ON p.booking_id        = bk.booking_id
        LEFT JOIN vehicle         v_b  ON bk.vehicle_id       = v_b.vehicle_id
        LEFT JOIN vehicle_type    vt_b ON v_b.vehicle_type_id = vt_b.vehicle_type_id
        LEFT JOIN parking_slot    sl_b ON bk.slot_id          = sl_b.slot_id
        LEFT JOIN zone            z_b  ON sl_b.zone_id        = z_b.zone_id
        LEFT JOIN floor           f_b  ON z_b.floor_id        = f_b.floor_id
        WHERE p.payment_status = 'PAID'
          AND YEAR(p.paid_at) = :year
          AND (:buildingId IS NULL
               OR f_s.building_id = :buildingId
               OR f_b.building_id = :buildingId)
        GROUP BY COALESCE(vt_s.name, vt_b.name, 'Unknown')
        ORDER BY revenue DESC
        """, nativeQuery = true)
    List<Object[]> getVehicleTypeRevenue(@Param("year") int year,
                                         @Param("buildingId") Long buildingId);
}

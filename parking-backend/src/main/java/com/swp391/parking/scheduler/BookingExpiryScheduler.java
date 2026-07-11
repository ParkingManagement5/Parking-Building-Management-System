package com.swp391.parking.scheduler;

import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.service.NotificationService;
import com.swp391.parking.service.PaymentService;
import com.swp391.parking.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Chạy mỗi 5 phút để tự động cancel các booking hết hạn.
 *
 * Các loại booking bị xử lý:
 * 1. PENDING_PAYMENT đã qua expiredAt → EXPIRED
 * 2. CONFIRMED no-show (bookingStartTime + N phút) → EXPIRED + giải phóng slot
 *    (WEEKLY/MONTHLY loại trừ khỏi no-show; chúng có bookingEndTime làm deadline)
 * 3. WEEKLY/MONTHLY CONFIRMED đã qua bookingEndTime:
 *    - Có ít nhất 1 session (đã dùng) → tạo phí cuối kỳ, chuyển WAITING_PAYMENT
 *    - Chưa có session nào (no-show suốt kỳ) → EXPIRED, giải phóng slot
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingExpiryScheduler {

    private final BookingRepository bookingRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingSessionRepository sessionRepository;
    private final SystemConfigService systemConfigService;
    private final PaymentService paymentService;
    private final NotificationService notificationService;

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void expireStaleBookings() {
        LocalDateTime now = LocalDateTime.now();

        // 1. PENDING_PAYMENT đã qua expiredAt
        List<Booking> stalePending = bookingRepository.findByStatusAndExpiredAtBefore(
                Booking.BookingStatus.PENDING_PAYMENT, now);
        if (!stalePending.isEmpty()) {
            stalePending.forEach(b -> b.setStatus(Booking.BookingStatus.EXPIRED));
            bookingRepository.saveAll(stalePending);
            log.info("[BookingExpiry] Auto-expired {} PENDING_PAYMENT bookings", stalePending.size());
        }

        // 2. CONFIRMED no-show (WEEKLY/MONTHLY đã loại trừ trong query)
        long expireAfterStart = systemConfigService.getLongValue("BOOKING_EXPIRE_AFTER_START", 30);
        List<Booking> staleConfirmed = bookingRepository.findConfirmedNoShow(
                now.minusMinutes(expireAfterStart));
        if (!staleConfirmed.isEmpty()) {
            staleConfirmed.forEach(b -> {
                b.setStatus(Booking.BookingStatus.EXPIRED);
                ParkingSlot slot = b.getSlot();
                if (slot != null && slot.getStatus() == ParkingSlot.Status.RESERVED) {
                    slot.setStatus(ParkingSlot.Status.AVAILABLE);
                    parkingSlotRepository.save(slot);
                }
            });
            bookingRepository.saveAll(staleConfirmed);
            log.info("[BookingExpiry] Auto-expired {} CONFIRMED no-show bookings, slots released", staleConfirmed.size());
        }

        // 3. WEEKLY/MONTHLY đã qua bookingEndTime, vẫn CONFIRMED (xe đã ra giữa chừng)
        List<Booking> expiredPass = bookingRepository.findExpiredPassBookings(now);
        if (!expiredPass.isEmpty()) {
            log.info("[BookingExpiry] Processing {} expired WEEKLY/MONTHLY bookings", expiredPass.size());
            expiredPass.forEach(b -> {
                boolean hadSessions = sessionRepository.existsByBooking_Id(b.getId());
                if (hadSessions) {
                    // Xe đã vào ít nhất 1 lần → tạo phí cuối kỳ, chờ thanh toán
                    try {
                        paymentService.createPassBookingFinalFee(b.getId());
                        log.info("[BookingExpiry] Final fee created for pass booking #{}", b.getId());
                    } catch (Exception e) {
                        log.warn("[BookingExpiry] Could not create final fee for booking #{}: {}", b.getId(), e.getMessage());
                    }
                } else {
                    // Chưa vào lần nào trong suốt kỳ hạn → expire, giải phóng slot
                    b.setStatus(Booking.BookingStatus.EXPIRED);
                    ParkingSlot slot = b.getSlot();
                    if (slot != null && slot.getStatus() == ParkingSlot.Status.RESERVED) {
                        slot.setStatus(ParkingSlot.Status.AVAILABLE);
                        parkingSlotRepository.save(slot);
                    }
                    bookingRepository.save(b);
                    try {
                        notificationService.notify(b.getUserId(), "Booking hết hạn",
                                "Booking #" + b.getId() + " (" + b.getBookingType()
                                        + ") hết hạn mà không có lần vào nào. Slot đã được giải phóng.",
                                "warning", "BOOKING", b.getId().intValue());
                    } catch (Exception ignored) {}
                    log.info("[BookingExpiry] Expired no-entry pass booking #{}", b.getId());
                }
            });
        }
    }
}

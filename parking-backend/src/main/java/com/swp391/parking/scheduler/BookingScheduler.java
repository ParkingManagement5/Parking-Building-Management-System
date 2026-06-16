package com.swp391.parking.scheduler;

import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduler để tự động expire booking theo các rule:
 * - PENDING_PAYMENT quá expired_at → EXPIRED (slot vẫn AVAILABLE)
 * - CONFIRMED quá 30p sau booking_start_time → EXPIRED + giải phóng slot
 *
 * Chạy mỗi phút 1 lần (fixedDelay = 60_000) để đảm bảo timely expire.
 * Dùng @Transactional để đảm bảo atomicity khi update booking + slot.
    **/

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingRepository bookingRepository;
    private final ParkingSlotRepository parkingSlotRepository;

    /** Expire PENDING_PAYMENT quá expired_at — slot vẫn AVAILABLE, không cần giải phóng */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expirePendingPayment() {
        List<Booking> list = bookingRepository.findByStatusAndExpiredAtBefore(
                Booking.BookingStatus.PENDING_PAYMENT, LocalDateTime.now());
        if (!list.isEmpty()) {
            log.info("Scheduler: expire {} PENDING_PAYMENT bookings", list.size());
            list.forEach(b -> b.setStatus(Booking.BookingStatus.EXPIRED));
            bookingRepository.saveAll(list);
        }
    }

    /** Expire CONFIRMED quá 30p sau booking_start_time [BR-03c] → giải phóng slot */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireConfirmedNoShow() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);
        List<Booking> list = bookingRepository.findConfirmedExpired(threshold);
        if (!list.isEmpty()) {
            log.info("Scheduler: expire {} CONFIRMED no-show bookings", list.size());
            list.forEach(b -> {
                b.setStatus(Booking.BookingStatus.EXPIRED);
                ParkingSlot slot = b.getSlot();
                if (slot.getStatus() == ParkingSlot.Status.RESERVED) {
                    slot.setStatus(ParkingSlot.Status.AVAILABLE);
                    parkingSlotRepository.save(slot);
                }
            });
            bookingRepository.saveAll(list);
        }
    }
}

package com.swp391.parking.scheduler;

import com.swp391.parking.service.StaffShiftService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chạy mỗi 5 phút để tự động đánh dấu ABSENT cho ca làm đã qua giờ kết thúc
 * mà staff chưa từng check-in.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StaffShiftAttendanceScheduler {

    private final StaffShiftService staffShiftService;

    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void markAbsentShifts() {
        staffShiftService.markAbsentForPastShifts();
    }
}

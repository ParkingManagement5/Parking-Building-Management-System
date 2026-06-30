package com.swp391.parking.util;

import com.swp391.parking.entity.PricingPolicy;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class FeeCalculatorUtil {

    private static final BigDecimal DEFAULT_RATE = new BigDecimal("20000");
    public static final long GRACE_PERIOD_MINUTES = 10;
    public static final long BILLING_BLOCK_MINUTES = 30;

    /**
     * Chọn hourlyRate đúng theo BR-12:
     * PricingPolicy × vehicle_type × day_type × time_range
     */
    public static BigDecimal resolveHourlyRate(List<PricingPolicy> policies, LocalDateTime referenceTime) {
        if (policies == null || policies.isEmpty()) return DEFAULT_RATE;
        if (referenceTime == null) referenceTime = LocalDateTime.now();

        String dayType = isWeekend(referenceTime) ? "WEEKEND" : "WEEKDAY";
        int hour = referenceTime.getHour();

        // Ưu tiên 1: match cả dayType + timeRange
        for (PricingPolicy p : policies) {
            if (dayType.equalsIgnoreCase(p.getDayType()) && isInTimeRange(hour, p.getStartHour(), p.getEndHour())) {
                return p.getPricePerHour();
            }
        }

        // Ưu tiên 2: match dayType (bỏ qua timeRange)
        for (PricingPolicy p : policies) {
            if (dayType.equalsIgnoreCase(p.getDayType())) {
                return p.getPricePerHour();
            }
        }

        // Ưu tiên 3: match timeRange (bỏ qua dayType)
        for (PricingPolicy p : policies) {
            if (isInTimeRange(hour, p.getStartHour(), p.getEndHour())) {
                return p.getPricePerHour();
            }
        }

        // Fallback: policy đầu tiên
        return policies.get(0).getPricePerHour();
    }

    public static BigDecimal calculateSessionFee(LocalDateTime entryTime,
                                                 LocalDateTime exitTime,
                                                 List<PricingPolicy> policies,
                                                 BigDecimal fallbackRate) {
        if (entryTime == null || exitTime == null) {
            return BigDecimal.ZERO;
        }

        if (!exitTime.isAfter(entryTime.plusMinutes(GRACE_PERIOD_MINUTES))) {
            return BigDecimal.ZERO;
        }

        BigDecimal defaultRate = fallbackRate != null ? fallbackRate : DEFAULT_RATE;
        if (policies == null || policies.isEmpty()) {
            return calculateWindowFee(entryTime.plusMinutes(GRACE_PERIOD_MINUTES), exitTime, defaultRate);
        }

        BigDecimal total = BigDecimal.ZERO;
        LocalDateTime cursor = entryTime.plusMinutes(GRACE_PERIOD_MINUTES);
        while (cursor.isBefore(exitTime)) {
            BigDecimal blockRate = resolveHourlyRate(policies, cursor);
            LocalDateTime nextBoundary = findNextPolicyBoundary(cursor, policies);
            LocalDateTime segmentEnd = min(exitTime, nextBoundary);

            total = total.add(calculateWindowFee(cursor, segmentEnd, blockRate != null ? blockRate : defaultRate));
            cursor = segmentEnd;
        }

        return total;
    }

    private static boolean isWeekend(LocalDateTime dt) {
        DayOfWeek day = dt.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }

    private static boolean isInTimeRange(int hour, Integer startHour, Integer endHour) {
        if (startHour == null || endHour == null) return true;
        if (startHour < endHour) {
            return hour >= startHour && hour < endHour;
        }
        // Night range: e.g. 22→6 means 22,23,0,1,2,3,4,5
        return hour >= startHour || hour < endHour;
    }

    /**
     * Tính tổng phí thanh toán khi checkout
     * total = base_fee + overtime_fee + penalty_fee - discount - deposit_deducted
     */
    public static BigDecimal calculateTotal(BigDecimal baseFee,
                                             BigDecimal overtimeFee,
                                             BigDecimal penaltyFee,
                                             BigDecimal discount,
                                             BigDecimal depositDeducted) {

        BigDecimal base     = baseFee           != null ? baseFee           : BigDecimal.ZERO;
        BigDecimal overtime = overtimeFee       != null ? overtimeFee       : BigDecimal.ZERO;
        BigDecimal penalty  = penaltyFee        != null ? penaltyFee        : BigDecimal.ZERO;
        BigDecimal disc     = discount          != null ? discount          : BigDecimal.ZERO;
        BigDecimal deposit  = depositDeducted   != null ? depositDeducted   : BigDecimal.ZERO;

        BigDecimal total = base.add(overtime)
                              .add(penalty)
                              .subtract(disc)
                              .subtract(deposit);

        // Không để âm
        return total.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : total;
    }

    /**
     * Tính phí đỗ xe dựa trên thời gian thực tế (entryTime → exitTime).
     * Tối thiểu 1 giờ, làm tròn lên.
     */
    public static BigDecimal calculateSessionFee(LocalDateTime entryTime,
                                                  LocalDateTime exitTime,
                                                  BigDecimal hourlyRate) {
        if (entryTime == null || exitTime == null || hourlyRate == null) {
            return BigDecimal.ZERO;
        }

        long totalMinutes = Duration.between(entryTime, exitTime).toMinutes();
        if (totalMinutes < 0) totalMinutes = 0;

        long hours = Math.max(1, (long) Math.ceil(totalMinutes / 60.0));

        return hourlyRate.multiply(BigDecimal.valueOf(hours));
    }

    private static BigDecimal calculateWindowFee(LocalDateTime start,
                                                 LocalDateTime end,
                                                 BigDecimal blockRate) {
        if (start == null || end == null || blockRate == null || !end.isAfter(start)) {
            return BigDecimal.ZERO;
        }

        long totalSeconds = Duration.between(start, end).getSeconds();
        long blockSeconds = BILLING_BLOCK_MINUTES * 60;
        long blocks = Math.max(1, (long) Math.ceil(totalSeconds / (double) blockSeconds));
        return blockRate.multiply(BigDecimal.valueOf(blocks));
    }

    private static LocalDateTime findNextPolicyBoundary(LocalDateTime current, List<PricingPolicy> policies) {
        List<LocalDateTime> boundaries = new ArrayList<>();
        LocalDate today = current.toLocalDate();
        LocalDate tomorrow = today.plusDays(1);

        for (PricingPolicy policy : policies) {
            addBoundary(boundaries, today, policy.getStartHour());
            addBoundary(boundaries, today, policy.getEndHour());
            addBoundary(boundaries, tomorrow, policy.getStartHour());
            addBoundary(boundaries, tomorrow, policy.getEndHour());
        }

        return boundaries.stream()
                .filter(boundary -> boundary.isAfter(current))
                .min(Comparator.naturalOrder())
                .orElse(current.plusMinutes(BILLING_BLOCK_MINUTES));
    }

    private static void addBoundary(List<LocalDateTime> boundaries, LocalDate date, Integer hour) {
        if (hour == null) return;
        boundaries.add(LocalDateTime.of(date, LocalTime.of(hour, 0)));
    }

    private static LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }
}

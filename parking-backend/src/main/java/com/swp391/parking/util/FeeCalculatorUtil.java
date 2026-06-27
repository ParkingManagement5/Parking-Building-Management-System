package com.swp391.parking.util;

import com.swp391.parking.entity.PricingPolicy;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

public class FeeCalculatorUtil {

    private static final BigDecimal DEFAULT_RATE = new BigDecimal("20000");

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
}
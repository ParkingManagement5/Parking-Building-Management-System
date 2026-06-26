package com.swp391.parking.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;

public class FeeCalculatorUtil {

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
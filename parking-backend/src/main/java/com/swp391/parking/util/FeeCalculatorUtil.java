package com.swp391.parking.util;

import java.math.BigDecimal;

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
}
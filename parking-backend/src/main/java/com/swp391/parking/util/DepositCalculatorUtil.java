package com.swp391.parking.util;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;

public class DepositCalculatorUtil {

    public static BigDecimal calculate(String vehicleTypeName,
                                       LocalDateTime now,
                                       LocalDateTime bookingStartTime) {
        if (!isDepositApplicable(vehicleTypeName)) {
            return BigDecimal.ZERO;
        }

        long minutes = Duration.between(now, bookingStartTime).toMinutes();

        if (minutes < 30) {
            return BigDecimal.ZERO;
        } else if (minutes < 120) {
            return new BigDecimal("10000");
        } else if (minutes < 240) {
            return new BigDecimal("15000");
        } else if (minutes < 360) {
            return new BigDecimal("20000");
        } else {
            return new BigDecimal("30000");
        }
    }

    private static boolean isDepositApplicable(String vehicleTypeName) {
        return "CAR".equalsIgnoreCase(vehicleTypeName)
            || "ELECTRIC_CAR".equalsIgnoreCase(vehicleTypeName);
    }
}
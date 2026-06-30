package com.swp391.parking.util;

import com.swp391.parking.entity.PricingPolicy;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FeeCalculatorUtilTest {

    @Test
    void shouldApplyGracePeriodForFirstTenMinutes() {
        BigDecimal fee = FeeCalculatorUtil.calculateSessionFee(
                LocalDateTime.of(2026, 6, 30, 9, 0),
                LocalDateTime.of(2026, 6, 30, 9, 10),
                List.of(),
                new BigDecimal("15000"));

        assertThat(fee).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void shouldRoundUpToThirtyMinuteBlocksAfterGracePeriod() {
        BigDecimal fee = FeeCalculatorUtil.calculateSessionFee(
                LocalDateTime.of(2026, 6, 30, 9, 0),
                LocalDateTime.of(2026, 6, 30, 9, 41),
                List.of(),
                new BigDecimal("15000"));

        assertThat(fee).isEqualByComparingTo(new BigDecimal("30000"));
    }

    @Test
    void shouldSplitAcrossPolicyWindowsAndChargeEachSegmentWithMatchingRate() {
        List<PricingPolicy> policies = List.of(
                policy("WEEKDAY", 6, 22, "15000"),
                policy("WEEKDAY", 22, 6, "12000")
        );

        BigDecimal fee = FeeCalculatorUtil.calculateSessionFee(
                LocalDateTime.of(2026, 6, 30, 21, 35),
                LocalDateTime.of(2026, 6, 30, 22, 20),
                policies,
                new BigDecimal("15000"));

        assertThat(fee).isEqualByComparingTo(new BigDecimal("27000"));
    }

    @Test
    void shouldUseWeekendNightPolicyWhenDefined() {
        List<PricingPolicy> policies = List.of(
                policy("WEEKEND", 6, 22, "20000"),
                policy("WEEKEND", 22, 6, "15000")
        );

        BigDecimal fee = FeeCalculatorUtil.calculateSessionFee(
                LocalDateTime.of(2026, 7, 5, 22, 5),
                LocalDateTime.of(2026, 7, 5, 22, 50),
                policies,
                new BigDecimal("20000"));

        assertThat(fee).isEqualByComparingTo(new BigDecimal("30000"));
    }

    private PricingPolicy policy(String dayType, Integer startHour, Integer endHour, String pricePerHour) {
        return PricingPolicy.builder()
                .dayType(dayType)
                .timeType("CUSTOM")
                .startHour(startHour)
                .endHour(endHour)
                .pricePerHour(new BigDecimal(pricePerHour))
                .isActive(true)
                .build();
    }
}

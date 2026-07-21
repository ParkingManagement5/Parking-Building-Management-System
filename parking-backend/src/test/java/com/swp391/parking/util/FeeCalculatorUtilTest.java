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

    @Test
    void shouldUseOldRateBeforeManagerEditAndNewRateAfter() {
        // Xe vao luc 8:00, Manager sua gia luc 12:00 (tu 15000 -> 20000), xe ra luc 14:00.
        // 4 tieng dau (8:10-12:00, sau grace period) phai tinh theo gia CU (15000/h),
        // 2 tieng sau (12:00-14:00) phai tinh theo gia MOI (20000/h).
        PricingPolicy oldVersion = PricingPolicy.builder()
                .dayType("WEEKDAY").timeType("NORMAL").startHour(6).endHour(22)
                .pricePerHour(new BigDecimal("15000"))
                .effectiveFrom(LocalDateTime.of(2026, 6, 1, 0, 0))
                .isActive(false)
                .build();
        PricingPolicy newVersion = PricingPolicy.builder()
                .dayType("WEEKDAY").timeType("NORMAL").startHour(6).endHour(22)
                .pricePerHour(new BigDecimal("20000"))
                .effectiveFrom(LocalDateTime.of(2026, 6, 30, 12, 0))
                .isActive(true)
                .build();
        List<PricingPolicy> policies = List.of(oldVersion, newVersion);

        BigDecimal fee = FeeCalculatorUtil.calculateSessionFee(
                LocalDateTime.of(2026, 6, 30, 8, 0),
                LocalDateTime.of(2026, 6, 30, 14, 0),
                policies,
                new BigDecimal("20000"));

        // 3h50 (8:10->12:00) o gia cu 15000/h = ceil(230/30)=8 block x 7500 = 60000
        // 2h (12:00->14:00) o gia moi 20000/h = 4 block x 10000 = 40000
        assertThat(fee).isEqualByComparingTo(new BigDecimal("100000"));
    }

    private PricingPolicy policy(String dayType, Integer startHour, Integer endHour, String pricePerHour) {
        return PricingPolicy.builder()
                .dayType(dayType)
                .timeType("CUSTOM")
                .startHour(startHour)
                .endHour(endHour)
                .pricePerHour(new BigDecimal(pricePerHour))
                .effectiveFrom(LocalDateTime.of(2020, 1, 1, 0, 0))
                .isActive(true)
                .build();
    }
}

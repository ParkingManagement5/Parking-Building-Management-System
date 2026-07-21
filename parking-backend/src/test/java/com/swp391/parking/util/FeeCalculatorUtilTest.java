package com.swp391.parking.util;

import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.service.SystemConfigService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FeeCalculatorUtilTest {

    private FeeCalculatorUtil util;

    @BeforeEach
    void setUp() {
        SystemConfigService configService = Mockito.mock(SystemConfigService.class);
        Mockito.when(configService.getLongValue("GRACE_PERIOD_MINUTES", 10L)).thenReturn(10L);
        Mockito.when(configService.getLongValue("BILLING_BLOCK_MINUTES", 30L)).thenReturn(30L);
        util = new FeeCalculatorUtil(configService);
    }

    @Test
    void shouldApplyGracePeriodForFirstTenMinutes() {
        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 6, 30, 9, 0),
                LocalDateTime.of(2026, 6, 30, 9, 10),
                List.of(),
                new BigDecimal("15000"));

        assertThat(fee).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void shouldRoundUpToThirtyMinuteBlocksAfterGracePeriod() {
        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 6, 30, 9, 0),
                LocalDateTime.of(2026, 6, 30, 9, 41),
                List.of(),
                new BigDecimal("15000"));

        // 31 phut sau grace period = ceil(31/30)=2 block x (15000*30/60=7500) = 15000
        assertThat(fee).isEqualByComparingTo(new BigDecimal("15000"));
    }

    @Test
    void shouldSplitAcrossPolicyWindowsAndChargeEachSegmentWithMatchingRate() {
        List<PricingPolicy> policies = List.of(
                policy("WEEKDAY", 6, 22, "15000"),
                policy("WEEKDAY", 22, 6, "12000")
        );

        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 6, 30, 21, 35),
                LocalDateTime.of(2026, 6, 30, 22, 20),
                policies,
                new BigDecimal("15000"));

        // 21:45->22:00 (15 phut, gia 15000/h) = 1 block x 7500 = 7500
        // 22:00->22:20 (20 phut, gia 12000/h) = 1 block x 6000 = 6000
        assertThat(fee).isEqualByComparingTo(new BigDecimal("13500"));
    }

    @Test
    void shouldUseWeekendNightPolicyWhenDefined() {
        List<PricingPolicy> policies = List.of(
                policy("WEEKEND", 6, 22, "20000"),
                policy("WEEKEND", 22, 6, "15000")
        );

        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 7, 5, 22, 5),
                LocalDateTime.of(2026, 7, 5, 22, 50),
                policies,
                new BigDecimal("20000"));

        // 22:15->22:50 (35 phut, gia cuoi tuan dem 15000/h) = ceil(35/30)=2 block x 7500 = 15000
        assertThat(fee).isEqualByComparingTo(new BigDecimal("15000"));
    }

    @Test
    void shouldUseOldRateBeforeManagerEditAndNewRateAfter() {
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

        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 6, 30, 8, 0),
                LocalDateTime.of(2026, 6, 30, 14, 0),
                policies,
                new BigDecimal("20000"));

        // 3h50 (8:10->12:00) o gia cu 15000/h = ceil(230/30)=8 block x 7500 = 60000
        // 2h (12:00->14:00) o gia moi 20000/h = 4 block x 10000 = 40000
        assertThat(fee).isEqualByComparingTo(new BigDecimal("100000"));
    }

    // ── Flat-rate booking tests ──────────────────────────────────────────────

    @Test
    void shouldChargeFlatDailyRateForOneDayBooking() {
        // Thứ 2 (WEEKDAY): 1 ngày đỗ đúng 24h → 1 đơn vị × 100,000đ
        List<PricingPolicy> policies = List.of(
                flatPolicy("DAILY", "WEEKDAY", "100000"),
                flatPolicy("DAILY", "WEEKEND", "120000")
        );
        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 7, 6, 8, 0),   // thứ 2
                LocalDateTime.of(2026, 7, 7, 8, 0),
                policies, new BigDecimal("100000"), "DAILY");
        assertThat(fee).isEqualByComparingTo(new BigDecimal("100000"));
    }

    @Test
    void shouldPickWeekendRateForDailyBookingStartingOnWeekend() {
        // Thứ 7 (WEEKEND): 1 ngày → áp dụng giá cuối tuần 120,000đ
        List<PricingPolicy> policies = List.of(
                flatPolicy("DAILY", "WEEKDAY", "100000"),
                flatPolicy("DAILY", "WEEKEND", "120000")
        );
        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 7, 4, 8, 0),   // thứ 7
                LocalDateTime.of(2026, 7, 5, 8, 0),
                policies, new BigDecimal("100000"), "DAILY");
        assertThat(fee).isEqualByComparingTo(new BigDecimal("120000"));
    }

    @Test
    void shouldChargeHourlyOvertimeBeyondBookingEndTime() {
        // Đặt 1 ngày (bookingEndTime = +24h), thực đỗ 25h
        // → flat 1 ngày = 100,000đ + overtime 1h block = 1 block × (15000×30/60) = 7,500đ
        // grace period 10p → 25h-10p=24h50m sau grace → ceil(50/30)=2 block overtime?
        // Không: overtime từ bookingEndTime (giây thứ 24h) đến exit (giây thứ 25h) = 60 phút
        // 60 phút sau grace period 10 phút = 50 phút còn lại → ceil(50/30)=2 block × 7500 = 15000
        List<PricingPolicy> normalPolicies = List.of(
                flatPolicy("DAILY", "WEEKDAY", "100000"),
                policy("WEEKDAY", 6, 22, "15000")       // giá giờ ban ngày
        );
        LocalDateTime entry       = LocalDateTime.of(2026, 7, 6, 8, 0);   // thứ 2
        LocalDateTime bookingEnd  = LocalDateTime.of(2026, 7, 7, 8, 0);   // +24h
        LocalDateTime exit        = LocalDateTime.of(2026, 7, 7, 9, 0);   // +25h (1h overstay)
        BigDecimal fee = util.calculateSessionFee(entry, exit, normalPolicies,
                new BigDecimal("15000"), "DAILY", bookingEnd);
        // Flat: 100,000đ + Overtime: 50 phút (sau grace 10p) = ceil(50/30)=2 block × 7500 = 15,000đ
        assertThat(fee).isEqualByComparingTo(new BigDecimal("115000"));
    }

    @Test
    void shouldChargeMinimumBookedPeriodWhenExitEarly() {
        // Đặt 3 ngày, ra sau 1 ngày → vẫn tính 3 ngày
        List<PricingPolicy> policies = List.of(flatPolicy("DAILY", "WEEKDAY", "100000"));
        LocalDateTime entry      = LocalDateTime.of(2026, 7, 6, 8, 0);
        LocalDateTime bookingEnd = LocalDateTime.of(2026, 7, 9, 8, 0);  // +72h (3 ngày)
        LocalDateTime exit       = LocalDateTime.of(2026, 7, 7, 8, 0);  // chỉ đỗ 1 ngày
        BigDecimal fee = util.calculateSessionFee(entry, exit, policies,
                new BigDecimal("100000"), "DAILY", bookingEnd);
        assertThat(fee).isEqualByComparingTo(new BigDecimal("300000")); // 3 ngày
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

    private PricingPolicy flatPolicy(String timeType, String dayType, String price) {
        return PricingPolicy.builder()
                .timeType(timeType)
                .dayType(dayType)
                .pricePerHour(new BigDecimal(price))
                .effectiveFrom(LocalDateTime.of(2025, 1, 1, 0, 0))
                .isActive(true)
                .build();
    }
}

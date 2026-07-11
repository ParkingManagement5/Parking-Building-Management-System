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

    // ── Rieng: gia that manager dang cau hinh cho O TO (vehicle_type_id=2) ───
    // WEEKDAY 06-22h=15000, WEEKEND 06-22h=20000, WEEKDAY 22-06h=12000, WEEKEND 22-06h=15000
    private List<PricingPolicy> realCarPolicies() {
        return List.of(
                policy("WEEKDAY", 6, 22, "15000"),
                policy("WEEKEND", 6, 22, "20000"),
                policy("WEEKDAY", 22, 6, "12000"),
                policy("WEEKEND", 22, 6, "15000")
        );
    }

    @Test
    void shouldResolveEachRealCarRateAtItsOwnHourAndDayType() {
        List<PricingPolicy> policies = realCarPolicies();
        // Thu Sau (WEEKDAY) 10h sang -> gia ngay thuong ban ngay
        assertThat(util.resolveHourlyRate(policies, LocalDateTime.of(2026, 7, 10, 10, 0)))
                .isEqualByComparingTo("15000");
        // Thu Sau (WEEKDAY) 23h -> gia ngay thuong ban dem
        assertThat(util.resolveHourlyRate(policies, LocalDateTime.of(2026, 7, 10, 23, 0)))
                .isEqualByComparingTo("12000");
        // Thu Bay (WEEKEND) 10h sang -> gia cuoi tuan ban ngay
        assertThat(util.resolveHourlyRate(policies, LocalDateTime.of(2026, 7, 11, 10, 0)))
                .isEqualByComparingTo("20000");
        // Chu Nhat (WEEKEND) 23h -> gia cuoi tuan ban dem
        assertThat(util.resolveHourlyRate(policies, LocalDateTime.of(2026, 7, 12, 23, 0)))
                .isEqualByComparingTo("15000");
        // Chu Nhat (WEEKEND) 0h30 sang (van thuoc khung dem 22h-6h) -> gia cuoi tuan ban dem
        assertThat(util.resolveHourlyRate(policies, LocalDateTime.of(2026, 7, 12, 0, 30)))
                .isEqualByComparingTo("15000");
    }

    @Test
    void shouldSwitchFromWeekdayToWeekendRateAtMidnightFridayToSaturday() {
        // Xe do 23:00 thu Sau, ra 01:00 thu Bay — phai tach dung 2 doan qua nua dem:
        // 23:10->24:00 (50p, gia dem ngay thuong 12000/h) + 00:00->01:00 (60p, gia dem cuoi tuan 15000/h)
        List<PricingPolicy> policies = realCarPolicies();
        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 7, 10, 23, 0),   // thu Sau 23h
                LocalDateTime.of(2026, 7, 11, 1, 0),    // thu Bay 1h
                policies, new BigDecimal("15000"));

        // 23:10-24:00 (50p) = ceil(50/30)=2 block x (12000*30/60=6000) = 12000
        // 00:00-01:00 (60p) = 2 block x (15000*30/60=7500) = 15000
        assertThat(fee).isEqualByComparingTo(new BigDecimal("27000"));
    }

    @Test
    void shouldSwitchFromWeekendToWeekdayRateAtMidnightSundayToMonday() {
        // Xe do 23:00 Chu Nhat, ra 01:00 thu Hai — phai tach dung 2 doan qua nua dem:
        // 23:10->24:00 (50p, gia dem cuoi tuan 15000/h) + 00:00->01:00 (60p, gia dem ngay thuong 12000/h)
        List<PricingPolicy> policies = realCarPolicies();
        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 7, 12, 23, 0),   // Chu Nhat 23h
                LocalDateTime.of(2026, 7, 13, 1, 0),    // thu Hai 1h
                policies, new BigDecimal("15000"));

        // 23:10-24:00 (50p) = 2 block x (15000*30/60=7500) = 15000
        // 00:00-01:00 (60p) = 2 block x (12000*30/60=6000) = 12000
        assertThat(fee).isEqualByComparingTo(new BigDecimal("27000"));
    }

    @Test
    void shouldSplitAcrossDayAndNightWithinSameWeekendDay() {
        // Thu Bay: do 21:00, ra 23:00 — cat dung tai moc 22h giua gia ngay/dem cuoi tuan
        List<PricingPolicy> policies = realCarPolicies();
        BigDecimal fee = util.calculateSessionFee(
                LocalDateTime.of(2026, 7, 11, 21, 0),
                LocalDateTime.of(2026, 7, 11, 23, 0),
                policies, new BigDecimal("15000"));

        // 21:10-22:00 (50p, gia ngay cuoi tuan 20000/h) = 2 block x (20000*30/60=10000) = 20000
        // 22:00-23:00 (60p, gia dem cuoi tuan 15000/h) = 2 block x (15000*30/60=7500) = 15000
        assertThat(fee).isEqualByComparingTo(new BigDecimal("35000"));
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

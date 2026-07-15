package com.swp391.parking.util;

import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.function.Predicate;

@Component
@RequiredArgsConstructor
public class FeeCalculatorUtil {

    private static final BigDecimal DEFAULT_RATE = new BigDecimal("20000");
    private static final long DEFAULT_GRACE_PERIOD  = 10;
    private static final long DEFAULT_BILLING_BLOCK = 30;

    // Các timeType áp dụng flat-rate — không được dùng để resolve giá giờ
    private static final Set<String> FLAT_RATE_TYPES = Set.of("DAILY", "WEEKLY", "MONTHLY");

    private final SystemConfigService systemConfigService;

    /**
     * Grace period (phút) đọc từ DB, fallback = 10.
     * Admin có thể đổi qua SystemConfig key "GRACE_PERIOD_MINUTES".
     */
    public long gracePeriodMinutes() {
        return systemConfigService.getLongValue("GRACE_PERIOD_MINUTES", DEFAULT_GRACE_PERIOD);
    }

    /**
     * Billing block (phút) đọc từ DB, fallback = 30.
     * Admin có thể đổi qua SystemConfig key "BILLING_BLOCK_MINUTES".
     */
    public long billingBlockMinutes() {
        return systemConfigService.getLongValue("BILLING_BLOCK_MINUTES", DEFAULT_BILLING_BLOCK);
    }

    /**
     * Chọn hourlyRate đúng theo BR-12.
     * Tự động loại bỏ các policy flat-rate (DAILY/WEEKLY/MONTHLY) — chỉ dùng policy tính theo giờ.
     */
    public BigDecimal resolveHourlyRate(List<PricingPolicy> policies, LocalDateTime referenceTime) {
        if (policies == null || policies.isEmpty()) return DEFAULT_RATE;
        LocalDateTime refTime = referenceTime != null ? referenceTime : LocalDateTime.now();

        List<PricingPolicy> hourly = filterHourlyPolicies(policies);
        if (hourly.isEmpty()) return DEFAULT_RATE;

        String dayType = isWeekend(refTime) ? "WEEKEND" : "WEEKDAY";
        int hour = refTime.getHour();

        BigDecimal rate;

        // Ưu tiên 1: match cả dayType + timeRange
        rate = latestEffectiveRate(hourly, refTime,
                p -> dayType.equalsIgnoreCase(p.getDayType()) && isInTimeRange(hour, p.getStartHour(), p.getEndHour()));
        if (rate != null) return rate;

        // Ưu tiên 2: match dayType (bỏ qua timeRange)
        rate = latestEffectiveRate(hourly, refTime, p -> dayType.equalsIgnoreCase(p.getDayType()));
        if (rate != null) return rate;

        // Ưu tiên 3: match timeRange cụ thể (bỏ qua dayType) — chỉ áp dụng cho policy
        // CÓ khai báo khung giờ. Policy không khai báo giờ (start/end = null) không được
        // xét ở bước này, vì isInTimeRange(null,null) luôn trả true — nếu để lọt qua sẽ
        // khiến 1 policy chỉ dành cho 1 dayType (vd WEEKEND) áp dụng nhầm sang dayType
        // khác (vd WEEKDAY), ghi đè giá đúng của khung giờ đó.
        rate = latestEffectiveRate(hourly, refTime,
                p -> p.getStartHour() != null && p.getEndHour() != null && isInTimeRange(hour, p.getStartHour(), p.getEndHour()));
        if (rate != null) return rate;

        rate = latestEffectiveRate(hourly, refTime, p -> true);
        return rate != null ? rate : hourly.get(0).getPricePerHour();
    }

    public BigDecimal calculateSessionFee(LocalDateTime entryTime,
                                          LocalDateTime exitTime,
                                          List<PricingPolicy> policies,
                                          BigDecimal fallbackRate) {
        if (entryTime == null || exitTime == null) {
            return BigDecimal.ZERO;
        }

        long grace = gracePeriodMinutes();
        if (!exitTime.isAfter(entryTime.plusMinutes(grace))) {
            return BigDecimal.ZERO;
        }

        BigDecimal defaultRate = fallbackRate != null ? fallbackRate : DEFAULT_RATE;
        List<PricingPolicy> hourly = filterHourlyPolicies(policies);
        if (hourly.isEmpty()) {
            return calculateWindowFee(entryTime.plusMinutes(grace), exitTime, defaultRate);
        }

        BigDecimal total = BigDecimal.ZERO;
        LocalDateTime cursor = entryTime.plusMinutes(grace);
        while (cursor.isBefore(exitTime)) {
            BigDecimal blockRate = resolveHourlyRate(hourly, cursor);
            LocalDateTime nextBoundary = findNextPolicyBoundary(cursor, hourly);
            LocalDateTime segmentEnd = min(exitTime, nextBoundary);
            total = total.add(calculateWindowFee(cursor, segmentEnd, blockRate != null ? blockRate : defaultRate));
            cursor = segmentEnd;
        }

        return total;
    }

    /** Lọc ra chỉ các policy tính theo giờ (loại trừ DAILY/WEEKLY/MONTHLY flat-rate). */
    private static List<PricingPolicy> filterHourlyPolicies(List<PricingPolicy> policies) {
        if (policies == null) return List.of();
        return policies.stream()
                .filter(p -> p.getTimeType() == null
                        || !FLAT_RATE_TYPES.contains(p.getTimeType().toUpperCase()))
                .toList();
    }

    /** Booking dài hạn (DAILY/WEEKLY/MONTHLY) tính phí flat-rate, không tích lũy theo block 30 phút. */
    public BigDecimal calculateSessionFee(LocalDateTime entryTime,
                                          LocalDateTime exitTime,
                                          List<PricingPolicy> policies,
                                          BigDecimal fallbackRate,
                                          String bookingType) {
        return calculateSessionFee(entryTime, exitTime, policies, fallbackRate, bookingType, null);
    }

    /**
     * Tính phí booking dài hạn với bookingEndTime.
     * - Phần trong hợp đồng (entry → contractEnd): flat rate × số đơn vị đặt
     * - Phần overstay (contractEnd → exit): tính theo giờ block như walk-in, không thêm đơn vị trọn gói
     * - Nếu ra sớm hơn contractEnd: vẫn tính đủ kỳ đặt (minimum = số đơn vị đã booking)
     */
    public BigDecimal calculateSessionFee(LocalDateTime entryTime,
                                          LocalDateTime exitTime,
                                          List<PricingPolicy> policies,
                                          BigDecimal fallbackRate,
                                          String bookingType,
                                          LocalDateTime bookingEndTime) {
        if (bookingType == null || "HOURLY".equalsIgnoreCase(bookingType)) {
            return calculateSessionFee(entryTime, exitTime, policies, fallbackRate);
        }
        return calculateFlatFee(entryTime, exitTime, policies, fallbackRate, bookingType.toUpperCase(), bookingEndTime);
    }

    /**
     * Tach rieng phan phi phu troi (qua han bookingEndTime) khoi tong phi -
     * dung de hien thi/thong bao rieng cho driver thay vi gop chung vao 1 con
     * so "baseFee" khong ro trong do co bao nhieu la phi goi, bao nhieu la
     * phat sinh do do qua han. Chi ap dung cho booking dai han (DAILY/WEEKLY/
     * MONTHLY) va khi exitTime thuc su vuot bookingEndTime - HOURLY hoac
     * khong vuot han luon tra ve ZERO.
     */
    public BigDecimal calculateOvertimeFee(String bookingType,
                                           LocalDateTime exitTime,
                                           LocalDateTime bookingEndTime,
                                           List<PricingPolicy> policies,
                                           BigDecimal fallbackRate) {
        if (bookingType == null || "HOURLY".equalsIgnoreCase(bookingType)) return BigDecimal.ZERO;
        if (bookingEndTime == null || exitTime == null || !exitTime.isAfter(bookingEndTime)) return BigDecimal.ZERO;
        return calculateSessionFee(bookingEndTime, exitTime, policies, fallbackRate);
    }

    private static final long DAILY_UNIT_HOURS   = 24;
    private static final long WEEKLY_UNIT_HOURS  = 7 * 24;
    private static final long MONTHLY_UNIT_HOURS = 30 * 24;

    private BigDecimal calculateFlatFee(LocalDateTime entryTime,
                                        LocalDateTime exitTime,
                                        List<PricingPolicy> policies,
                                        BigDecimal fallbackRate,
                                        String bookingType,
                                        LocalDateTime bookingEndTime) {
        if (entryTime == null || exitTime == null || !exitTime.isAfter(entryTime)) {
            return BigDecimal.ZERO;
        }
        long unitHours = switch (bookingType) {
            case "DAILY"   -> DAILY_UNIT_HOURS;
            case "WEEKLY"  -> WEEKLY_UNIT_HOURS;
            case "MONTHLY" -> MONTHLY_UNIT_HOURS;
            default        -> DAILY_UNIT_HOURS;
        };
        BigDecimal rate = resolveFlatRate(policies, bookingType, entryTime);
        if (rate == null) rate = fallbackRate != null ? fallbackRate : DEFAULT_RATE;

        // Tính flat fee cho kỳ hợp đồng: entry → contractEnd (tối thiểu = kỳ đặt)
        LocalDateTime contractEnd = (bookingEndTime != null && bookingEndTime.isAfter(entryTime))
                ? bookingEndTime : exitTime;
        long contractMinutes = Duration.between(entryTime, contractEnd).toMinutes();
        long units = Math.max(1, (long) Math.ceil(contractMinutes / (double) (unitHours * 60)));
        BigDecimal flatFee = rate.multiply(BigDecimal.valueOf(units));

        // Overstay: thời gian vượt bookingEndTime → tính theo giờ block, không thêm đơn vị trọn gói
        if (bookingEndTime != null && exitTime.isAfter(bookingEndTime)) {
            BigDecimal overtimeFee = calculateSessionFee(bookingEndTime, exitTime, policies, fallbackRate);
            return flatFee.add(overtimeFee);
        }
        return flatFee;
    }

    private static BigDecimal resolveFlatRate(List<PricingPolicy> policies, String bookingType, LocalDateTime referenceTime) {
        if (policies == null || policies.isEmpty()) return null;
        String dayType = isWeekend(referenceTime) ? "WEEKEND" : "WEEKDAY";
        // Ưu tiên: đúng bookingType + đúng dayType
        BigDecimal rate = latestEffectiveRate(policies, referenceTime,
                p -> bookingType.equalsIgnoreCase(p.getTimeType()) && dayType.equalsIgnoreCase(p.getDayType()));
        if (rate != null) return rate;
        // Fallback: đúng bookingType, bất kỳ dayType
        return latestEffectiveRate(policies, referenceTime, p -> bookingType.equalsIgnoreCase(p.getTimeType()));
    }

    private static boolean isWeekend(LocalDateTime dt) {
        DayOfWeek day = dt.getDayOfWeek();
        return day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
    }

    private static boolean isInTimeRange(int hour, Integer startHour, Integer endHour) {
        if (startHour == null || endHour == null) return true;
        if (startHour < endHour) return hour >= startHour && hour < endHour;
        return hour >= startHour || hour < endHour;
    }

    /** Tính tổng phí: base + overtime + penalty - discount - deposit. Không để âm. */
    public static BigDecimal calculateTotal(BigDecimal baseFee,
                                            BigDecimal overtimeFee,
                                            BigDecimal penaltyFee,
                                            BigDecimal discount,
                                            BigDecimal depositDeducted) {
        BigDecimal base     = baseFee        != null ? baseFee        : BigDecimal.ZERO;
        BigDecimal overtime = overtimeFee    != null ? overtimeFee    : BigDecimal.ZERO;
        BigDecimal penalty  = penaltyFee     != null ? penaltyFee     : BigDecimal.ZERO;
        BigDecimal disc     = discount       != null ? discount       : BigDecimal.ZERO;
        BigDecimal deposit  = depositDeducted!= null ? depositDeducted: BigDecimal.ZERO;

        BigDecimal total = base.add(overtime).add(penalty).subtract(disc).subtract(deposit);
        return total.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : total;
    }

    /** Overload đơn giản: tính phí theo hourly rate cố định, tối thiểu 1 giờ. */
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

    // ── Private helpers ──────────────────────────────────────────────────────

    private BigDecimal calculateWindowFee(LocalDateTime start, LocalDateTime end, BigDecimal blockRate) {
        if (start == null || end == null || blockRate == null || !end.isAfter(start)) {
            return BigDecimal.ZERO;
        }
        long billingBlock = billingBlockMinutes();
        long totalSeconds = Duration.between(start, end).getSeconds();
        long blockSeconds = billingBlock * 60;
        long blocks = Math.max(1, (long) Math.ceil(totalSeconds / (double) blockSeconds));

        BigDecimal perBlockRate = blockRate
                .multiply(BigDecimal.valueOf(billingBlock))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        return perBlockRate.multiply(BigDecimal.valueOf(blocks));
    }

    private LocalDateTime findNextPolicyBoundary(LocalDateTime current, List<PricingPolicy> policies) {
        List<LocalDateTime> boundaries = new ArrayList<>();
        LocalDate today = current.toLocalDate();
        LocalDate tomorrow = today.plusDays(1);

        for (PricingPolicy policy : policies) {
            addBoundary(boundaries, today, policy.getStartHour());
            addBoundary(boundaries, today, policy.getEndHour());
            addBoundary(boundaries, tomorrow, policy.getStartHour());
            addBoundary(boundaries, tomorrow, policy.getEndHour());
        }
        boundaries.add(LocalDateTime.of(tomorrow, LocalTime.MIDNIGHT));
        for (PricingPolicy policy : policies) {
            if (policy.getEffectiveFrom() != null) {
                boundaries.add(policy.getEffectiveFrom());
            }
        }
        return boundaries.stream()
                .filter(b -> b.isAfter(current))
                .min(Comparator.naturalOrder())
                .orElse(current.plusMinutes(billingBlockMinutes()));
    }

    private static BigDecimal latestEffectiveRate(List<PricingPolicy> policies,
                                                  LocalDateTime referenceTime,
                                                  Predicate<PricingPolicy> matcher) {
        return policies.stream()
                .filter(matcher)
                .filter(p -> p.getEffectiveFrom() == null || !p.getEffectiveFrom().isAfter(referenceTime))
                .max(Comparator.comparing(p -> p.getEffectiveFrom() == null ? LocalDateTime.MIN : p.getEffectiveFrom()))
                .map(p -> p.getPricePerHour())
                .orElse(null);
    }

    private static void addBoundary(List<LocalDateTime> boundaries, LocalDate date, Integer hour) {
        if (hour == null) return;
        boundaries.add(LocalDateTime.of(date, LocalTime.of(hour, 0)));
    }

    private static LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }
}

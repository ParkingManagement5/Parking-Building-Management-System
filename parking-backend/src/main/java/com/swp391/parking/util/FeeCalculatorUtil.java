package com.swp391.parking.util;

import com.swp391.parking.entity.PricingPolicy;

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
import java.util.function.Predicate;

public class FeeCalculatorUtil {

    private static final BigDecimal DEFAULT_RATE = new BigDecimal("20000");
    public static final long GRACE_PERIOD_MINUTES = 10;
    public static final long BILLING_BLOCK_MINUTES = 30;

    /**
     * Chọn hourlyRate đúng theo BR-12:
     * PricingPolicy × vehicle_type × day_type × time_range
     *
     * "policies" có thể chứa NHIỀU PHIÊN BẢN của cùng 1 policy (do Manager sửa giá
     * nhiều lần, mỗi lần sửa tạo 1 dòng mới với effectiveFrom mới). Với mỗi mức ưu
     * tiên, ta chỉ xét các phiên bản đã "có hiệu lực" tại referenceTime
     * (effectiveFrom <= referenceTime) và chọn phiên bản MỚI NHẤT trong số đó — để
     * tính đúng giá đã áp dụng tại thời điểm đó, không bị ảnh hưởng bởi lần sửa giá
     * sau này.
     */
    public static BigDecimal resolveHourlyRate(List<PricingPolicy> policies, LocalDateTime referenceTime) {
        if (policies == null || policies.isEmpty()) return DEFAULT_RATE;
        LocalDateTime refTime = referenceTime != null ? referenceTime : LocalDateTime.now();

        String dayType = isWeekend(refTime) ? "WEEKEND" : "WEEKDAY";
        int hour = refTime.getHour();

        BigDecimal rate;

        // Ưu tiên 1: match cả dayType + timeRange
        rate = latestEffectiveRate(policies, refTime,
                p -> dayType.equalsIgnoreCase(p.getDayType()) && isInTimeRange(hour, p.getStartHour(), p.getEndHour()));
        if (rate != null) return rate;

        // Ưu tiên 2: match dayType (bỏ qua timeRange)
        rate = latestEffectiveRate(policies, refTime, p -> dayType.equalsIgnoreCase(p.getDayType()));
        if (rate != null) return rate;

        // Ưu tiên 3: match timeRange (bỏ qua dayType)
        rate = latestEffectiveRate(policies, refTime, p -> isInTimeRange(hour, p.getStartHour(), p.getEndHour()));
        if (rate != null) return rate;

        // Fallback: phiên bản mới nhất (tại referenceTime) trong toàn bộ danh sách,
        // hoặc policy đầu tiên nếu không có phiên bản nào đã hiệu lực.
        rate = latestEffectiveRate(policies, refTime, p -> true);
        return rate != null ? rate : policies.get(0).getPricePerHour();
    }

    private static BigDecimal latestEffectiveRate(List<PricingPolicy> policies,
                                                   LocalDateTime referenceTime,
                                                   Predicate<PricingPolicy> matcher) {
        return policies.stream()
                .filter(matcher)
                .filter(p -> p.getEffectiveFrom() == null || !p.getEffectiveFrom().isAfter(referenceTime))
                .max(Comparator.comparing(p -> p.getEffectiveFrom() == null ? LocalDateTime.MIN : p.getEffectiveFrom()))
                .map(PricingPolicy::getPricePerHour)
                .orElse(null);
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

    /**
     * Booking dai han (DAILY/WEEKLY/MONTHLY) tinh phi flat-rate theo so don vi,
     * khong cong don theo block 30 phut nhu HOURLY — tranh hoa don phi thuc te
     * khi xe gui nhieu ngay/tuan/thang.
     */
    public static BigDecimal calculateSessionFee(LocalDateTime entryTime,
                                                  LocalDateTime exitTime,
                                                  List<PricingPolicy> policies,
                                                  BigDecimal fallbackRate,
                                                  String bookingType) {
        if (bookingType == null || "HOURLY".equalsIgnoreCase(bookingType)) {
            return calculateSessionFee(entryTime, exitTime, policies, fallbackRate);
        }
        return calculateFlatFee(entryTime, exitTime, policies, fallbackRate, bookingType.toUpperCase());
    }

    private static final long DAILY_UNIT_HOURS = 24;
    private static final long WEEKLY_UNIT_HOURS = 7 * 24;
    private static final long MONTHLY_UNIT_HOURS = 30 * 24;

    private static BigDecimal calculateFlatFee(LocalDateTime entryTime,
                                                LocalDateTime exitTime,
                                                List<PricingPolicy> policies,
                                                BigDecimal fallbackRate,
                                                String bookingType) {
        if (entryTime == null || exitTime == null || !exitTime.isAfter(entryTime)) {
            return BigDecimal.ZERO;
        }

        long unitHours = switch (bookingType) {
            case "DAILY" -> DAILY_UNIT_HOURS;
            case "WEEKLY" -> WEEKLY_UNIT_HOURS;
            case "MONTHLY" -> MONTHLY_UNIT_HOURS;
            default -> DAILY_UNIT_HOURS;
        };

        BigDecimal rate = resolveFlatRate(policies, bookingType, entryTime);
        if (rate == null) rate = fallbackRate != null ? fallbackRate : DEFAULT_RATE;

        long totalMinutes = Duration.between(entryTime, exitTime).toMinutes();
        long units = Math.max(1, (long) Math.ceil(totalMinutes / (double) (unitHours * 60)));

        return rate.multiply(BigDecimal.valueOf(units));
    }

    private static BigDecimal resolveFlatRate(List<PricingPolicy> policies, String bookingType, LocalDateTime referenceTime) {
        if (policies == null || policies.isEmpty()) return null;
        return latestEffectiveRate(policies, referenceTime, p -> bookingType.equalsIgnoreCase(p.getTimeType()));
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

        // Moi block la 30 phut = nua gio — truoc day nhan thang blockRate (gia ca GIO)
        // cho moi block 30 phut, khien phi bi tinh gap doi thuc te (vd 1h31p bi tinh
        // thanh 4 block x gia/gio = 4 gio, trong khi dung ra chi ~1.5-2 gio).
        BigDecimal perBlockRate = blockRate
                .multiply(BigDecimal.valueOf(BILLING_BLOCK_MINUTES))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        return perBlockRate.multiply(BigDecimal.valueOf(blocks));
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

        // Ranh gioi nua dem - luon can thiet de phat hien doi ngay thuong/cuoi tuan,
        // ke ca khi khong trung gio bat dau/ket thuc cua policy nao (VD: khung dem
        // 22h-6h vat qua Chu nhat -> Thu 2 phai tach thanh 2 doan gia khac nhau).
        boundaries.add(LocalDateTime.of(tomorrow, LocalTime.MIDNIGHT));

        // Ranh gioi tai moi moc Manager doi gia (effectiveFrom cua tung phien ban
        // policy) - dam bao khi dang tinh phi cho mot phien do da qua ma giua chung
        // Manager sua gia, doan truoc/sau moc sua se duoc tach rieng va tinh dung
        // theo gia da ap dung tai tung thoi diem.
        for (PricingPolicy policy : policies) {
            if (policy.getEffectiveFrom() != null) {
                boundaries.add(policy.getEffectiveFrom());
            }
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

package com.swp391.parking.controller;

import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.RevenueReportResponse;
import com.swp391.parking.dto.response.TimeSeriesReportResponse;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

/**
 * Bao cao doanh thu + luot xe (turnover) theo toa nha va theo loai xe.
 * Doanh thu = tong Payment (PARKING_FEE, PAID) cua cac session co entryTime
 * trong khoang [from, to]. Neu khong truyen from/to thi lay toan bo.
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ParkingSessionRepository sessionRepository;
    private final PaymentRepository paymentRepository;

    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<RevenueReportResponse>> getRevenueReport(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        LocalDateTime fromDt = from != null && !from.isBlank() ? LocalDate.parse(from).atStartOfDay() : null;
        LocalDateTime toDt = to != null && !to.isBlank() ? LocalDate.parse(to).atTime(23, 59, 59) : null;

        List<ParkingSession> sessions = sessionRepository.findAllWithBuildingOrderByCreatedAtDesc().stream()
                .filter(s -> s.getEntryTime() != null)
                .filter(s -> fromDt == null || !s.getEntryTime().isBefore(fromDt))
                .filter(s -> toDt == null || !s.getEntryTime().isAfter(toDt))
                .toList();

        Map<Long, ParkingSession> sessionById = new LinkedHashMap<>();
        for (ParkingSession s : sessions) {
            sessionById.put(s.getId(), s);
        }

        // ── Luot xe + thoi gian do trung binh theo toa nha ──
        Map<Long, String> buildingNames = new LinkedHashMap<>();
        Map<Long, Integer> sessionCountByBuilding = new LinkedHashMap<>();
        Map<Long, Long> totalDurationMinutesByBuilding = new LinkedHashMap<>();
        Map<Long, Integer> completedCountByBuilding = new LinkedHashMap<>();

        for (ParkingSession s : sessions) {
            var building = s.getSlot().getZone().getFloor().getBuilding();
            Long buildingId = building.getId();
            buildingNames.put(buildingId, building.getName());
            sessionCountByBuilding.merge(buildingId, 1, Integer::sum);

            if (s.getExitTime() != null) {
                long minutes = Duration.between(s.getEntryTime(), s.getExitTime()).toMinutes();
                totalDurationMinutesByBuilding.merge(buildingId, minutes, Long::sum);
                completedCountByBuilding.merge(buildingId, 1, Integer::sum);
            }
        }

        // ── Doanh thu theo toa nha + theo loai xe ──
        List<Payment> revenuePayments = paymentRepository.findByPaymentStatus(Payment.PaymentStatus.PAID).stream()
                .filter(p -> p.getPaymentType() == Payment.PaymentType.PARKING_FEE)
                .filter(p -> p.getSessionId() != null && sessionById.containsKey(p.getSessionId().longValue()))
                .toList();

        Map<Long, BigDecimal> revenueByBuilding = new LinkedHashMap<>();
        Map<String, BigDecimal> revenueByVehicleType = new LinkedHashMap<>();
        Map<String, Integer> sessionCountByVehicleType = new LinkedHashMap<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;

        for (Payment p : revenuePayments) {
            ParkingSession s = sessionById.get(p.getSessionId().longValue());
            BigDecimal amount = p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO;
            totalRevenue = totalRevenue.add(amount);

            Long buildingId = s.getSlot().getZone().getFloor().getBuilding().getId();
            revenueByBuilding.merge(buildingId, amount, BigDecimal::add);

            String vtName = s.getVehicle() != null && s.getVehicle().getVehicleType() != null
                    ? s.getVehicle().getVehicleType().getName()
                    : "Không xác định";
            revenueByVehicleType.merge(vtName, amount, BigDecimal::add);
            sessionCountByVehicleType.merge(vtName, 1, Integer::sum);
        }

        List<RevenueReportResponse.BuildingRevenueStat> byBuilding = new ArrayList<>();
        for (Long buildingId : buildingNames.keySet()) {
            int completed = completedCountByBuilding.getOrDefault(buildingId, 0);
            Double avgDuration = completed > 0
                    ? (double) totalDurationMinutesByBuilding.getOrDefault(buildingId, 0L) / completed
                    : null;
            byBuilding.add(RevenueReportResponse.BuildingRevenueStat.builder()
                    .buildingId(buildingId)
                    .buildingName(buildingNames.get(buildingId))
                    .revenue(revenueByBuilding.getOrDefault(buildingId, BigDecimal.ZERO))
                    .sessionCount(sessionCountByBuilding.getOrDefault(buildingId, 0))
                    .avgDurationMinutes(avgDuration)
                    .build());
        }
        byBuilding.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));

        List<RevenueReportResponse.VehicleTypeRevenueStat> byVehicleType = new ArrayList<>();
        for (String vtName : revenueByVehicleType.keySet()) {
            byVehicleType.add(RevenueReportResponse.VehicleTypeRevenueStat.builder()
                    .vehicleTypeName(vtName)
                    .revenue(revenueByVehicleType.get(vtName))
                    .sessionCount(sessionCountByVehicleType.getOrDefault(vtName, 0))
                    .build());
        }
        byVehicleType.sort((a, b) -> b.getRevenue().compareTo(a.getRevenue()));

        RevenueReportResponse response = RevenueReportResponse.builder()
                .totalRevenue(totalRevenue)
                .totalSessions(sessions.size())
                .byBuilding(byBuilding)
                .byVehicleType(byVehicleType)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Báo cáo doanh thu / lượt xe theo chuỗi thời gian.
     *
     * GET /api/v1/reports/revenue/time-series?from=2026-01-01&to=2026-07-09&groupBy=DAY
     *
     * groupBy: DAY (mặc định) | WEEK | MONTH
     *
     * Cách hoạt động:
     *  - Lọc các Payment(PARKING_FEE, PAID) mà session.entryTime nằm trong [from, to]
     *  - Nhóm theo ngày/tuần/tháng của entryTime
     *  - Mỗi điểm trả về: period (nhãn thời gian), revenue (tổng tiền), sessions (lượt xe),
     *    avgFeePerSession (phí trung bình / lượt)
     *  - Series được sắp xếp từ sớm đến muộn (chronological) để frontend dễ vẽ chart
     */
    @GetMapping("/revenue/time-series")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<TimeSeriesReportResponse>> getTimeSeries(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "DAY") String groupBy) {

        LocalDateTime fromDt = from != null && !from.isBlank() ? LocalDate.parse(from).atStartOfDay() : null;
        LocalDateTime toDt   = to   != null && !to.isBlank()   ? LocalDate.parse(to).atTime(23, 59, 59) : null;

        // 1. Load sessions trong khoảng thời gian
        List<ParkingSession> sessions = sessionRepository.findAllWithBuildingOrderByCreatedAtDesc().stream()
                .filter(s -> s.getEntryTime() != null)
                .filter(s -> fromDt == null || !s.getEntryTime().isBefore(fromDt))
                .filter(s -> toDt   == null || !s.getEntryTime().isAfter(toDt))
                .toList();

        Map<Long, ParkingSession> sessionById = new LinkedHashMap<>();
        sessions.forEach(s -> sessionById.put(s.getId(), s));

        // 2. Load payments liên quan
        List<Payment> revenuePayments = paymentRepository.findByPaymentStatus(Payment.PaymentStatus.PAID).stream()
                .filter(p -> p.getPaymentType() == Payment.PaymentType.PARKING_FEE)
                .filter(p -> p.getSessionId() != null && sessionById.containsKey(p.getSessionId().longValue()))
                .toList();

        // 3. Nhóm theo period key
        Map<String, BigDecimal> revenueByPeriod  = new TreeMap<>();
        Map<String, Integer>    sessionsByPeriod = new TreeMap<>();

        for (Payment p : revenuePayments) {
            ParkingSession s = sessionById.get(p.getSessionId().longValue());
            String periodKey = toPeriodKey(s.getEntryTime(), groupBy);
            BigDecimal amount = p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO;
            revenueByPeriod.merge(periodKey, amount, BigDecimal::add);
            sessionsByPeriod.merge(periodKey, 1, Integer::sum);
        }

        // 4. Build series
        BigDecimal totalRevenue = BigDecimal.ZERO;
        List<TimeSeriesReportResponse.DataPoint> series = new ArrayList<>();

        for (String period : revenueByPeriod.keySet()) {
            BigDecimal rev = revenueByPeriod.get(period);
            int cnt        = sessionsByPeriod.getOrDefault(period, 0);
            BigDecimal avg = cnt > 0
                    ? rev.divide(BigDecimal.valueOf(cnt), 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            totalRevenue = totalRevenue.add(rev);
            series.add(TimeSeriesReportResponse.DataPoint.builder()
                    .period(period)
                    .revenue(rev)
                    .sessions(cnt)
                    .avgFeePerSession(avg)
                    .build());
        }

        TimeSeriesReportResponse response = TimeSeriesReportResponse.builder()
                .from(from)
                .to(to)
                .groupBy(groupBy.toUpperCase())
                .totalRevenue(totalRevenue)
                .totalSessions(sessions.size())
                .series(series)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Chuyển LocalDateTime thành period key tuỳ theo groupBy.
     * DAY   → "2026-07-09"
     * WEEK  → "2026-W27"   (ISO week)
     * MONTH → "2026-07"
     */
    private String toPeriodKey(LocalDateTime dt, String groupBy) {
        return switch (groupBy.toUpperCase()) {
            case "WEEK" -> {
                int week = dt.get(WeekFields.of(Locale.getDefault()).weekOfWeekBasedYear());
                yield dt.getYear() + "-W" + String.format("%02d", week);
            }
            case "MONTH" -> dt.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            default      -> dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        };
    }
}

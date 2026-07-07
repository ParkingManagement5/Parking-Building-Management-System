package com.swp391.parking.controller;

import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.ManagerDashboardResponse;
import com.swp391.parking.dto.response.RevenueStatsResponse;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.PaymentRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.PricingPolicyRepository;
import com.swp391.parking.repository.StaffShiftRepository;
import com.swp391.parking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final ParkingSlotRepository slotRepository;
    private final PricingPolicyRepository pricingPolicyRepository;
    private final StaffShiftRepository staffShiftRepository;
    private final GateRepository gateRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    @GetMapping("/manager")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<ManagerDashboardResponse>> getManagerDashboard() {
        List<ParkingSlot> slots = slotRepository.findAll();

        int totalSlots = slots.size();
        int availableSlots = (int) slots.stream()
                .filter(s -> s.getStatus() == ParkingSlot.Status.AVAILABLE)
                .count();
        int occupancyRate = totalSlots > 0
                ? Math.round(((float) (totalSlots - availableSlots) / totalSlots) * 100)
                : 0;

        Map<Long, int[]> buildingTotals = new LinkedHashMap<>();
        Map<Long, String> buildingNames = new LinkedHashMap<>();
        Map<Long, Zone> uniqueZones = new LinkedHashMap<>();

        for (ParkingSlot slot : slots) {
            Zone zone = slot.getZone();
            Long buildingId = zone.getFloor().getBuilding().getId();
            String buildingName = zone.getFloor().getBuilding().getName();

            buildingNames.put(buildingId, buildingName);
            buildingTotals.computeIfAbsent(buildingId, id -> new int[]{0, 0});
            buildingTotals.get(buildingId)[0]++;
            if (slot.getStatus() == ParkingSlot.Status.AVAILABLE) {
                buildingTotals.get(buildingId)[1]++;
            }
            uniqueZones.put(zone.getId(), zone);
        }

        List<ManagerDashboardResponse.BuildingSlotStat> slotsByBuilding = new ArrayList<>();
        for (Map.Entry<Long, int[]> entry : buildingTotals.entrySet()) {
            Long buildingId = entry.getKey();
            int total = entry.getValue()[0];
            int available = entry.getValue()[1];
            int rate = total > 0 ? Math.round(((float) available / total) * 100) : 0;
            slotsByBuilding.add(ManagerDashboardResponse.BuildingSlotStat.builder()
                    .buildingId(buildingId)
                    .buildingName(buildingNames.get(buildingId))
                    .totalSlots(total)
                    .availableSlots(available)
                    .availabilityRatePercent(rate)
                    .build());
        }

        Map<String, Integer> vtCounts = new LinkedHashMap<>();
        for (Zone zone : uniqueZones.values()) {
            String vtName = zone.getVehicleType() != null ? zone.getVehicleType().getName() : "Unknown";
            vtCounts.merge(vtName, 1, Integer::sum);
        }
        List<ManagerDashboardResponse.VehicleTypeStat> vehicleTypeMix = new ArrayList<>();
        vtCounts.forEach((name, count) ->
                vehicleTypeMix.add(ManagerDashboardResponse.VehicleTypeStat.builder()
                        .name(name).zoneCount(count).build()));

        int activePricingCount = pricingPolicyRepository.findByIsActiveTrue().size();
        int staffShiftCount = (int) staffShiftRepository.count();
        int activeGateCount = (int) gateRepository.findAll().stream()
                .filter(g -> Boolean.TRUE.equals(g.getIsActive()))
                .count();

        ManagerDashboardResponse response = ManagerDashboardResponse.builder()
                .totalBuildings(buildingTotals.size())
                .totalSlots(totalSlots)
                .availableSlots(availableSlots)
                .occupancyRatePercent(occupancyRate)
                .activePricingCount(activePricingCount)
                .staffShiftCount(staffShiftCount)
                .activeGateCount(activeGateCount)
                .slotsByBuilding(slotsByBuilding)
                .vehicleTypeMix(vehicleTypeMix)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // -----------------------------------------------------------------------
    // Thống kê doanh thu theo tháng/năm — MANAGER (scoped by building) / ADMIN
    // GET /api/v1/dashboard/revenue?year=2026
    // -----------------------------------------------------------------------
    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<RevenueStatsResponse>> getRevenue(
            @RequestParam(defaultValue = "#{T(java.time.LocalDate).now().getYear()}") int year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal UserDetails ud) {

        // MANAGER → scoped by assignedBuilding; ADMIN → all buildings
        Long buildingId = null;
        boolean isManager = ud.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        if (isManager) {
            var user = userRepository.findByUsername(ud.getUsername())
                    .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "User không tồn tại"));
            if (user.getAssignedBuilding() != null) {
                buildingId = user.getAssignedBuilding().getId();
            }
        }

        // Vehicle type breakdown (dùng cả yearly và monthly view)
        List<Object[]> vtRaw = paymentRepository.getVehicleTypeRevenue(year, buildingId);
        List<RevenueStatsResponse.VehicleTypeRevenue> vtBreakdown = new ArrayList<>();
        for (Object[] row : vtRaw) {
            vtBreakdown.add(RevenueStatsResponse.VehicleTypeRevenue.builder()
                    .vehicleType(row[0] != null ? row[0].toString() : "Unknown")
                    .revenue(new BigDecimal(row[1].toString()))
                    .transactions(((Number) row[2]).longValue())
                    .build());
        }

        RevenueStatsResponse.RevenueStatsResponseBuilder builder = RevenueStatsResponse.builder()
                .year(year)
                .month(month)
                .vehicleTypeBreakdown(vtBreakdown);

        if (month != null) {
            // DAILY VIEW: breakdown theo ngày trong tháng
            List<Object[]> dailyRaw = paymentRepository.getDailyRevenue(year, month, buildingId);
            List<RevenueStatsResponse.DailyRevenue> daily = new ArrayList<>();
            for (Object[] row : dailyRaw) {
                daily.add(RevenueStatsResponse.DailyRevenue.builder()
                        .day(((Number) row[0]).intValue())
                        .revenue(new BigDecimal(row[1].toString()))
                        .transactions(((Number) row[2]).longValue())
                        .build());
            }
            BigDecimal totalRevenue = daily.stream()
                    .map(RevenueStatsResponse.DailyRevenue::getRevenue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long totalTxn = daily.stream().mapToLong(RevenueStatsResponse.DailyRevenue::getTransactions).sum();

            builder.dailyBreakdown(daily)
                    .totalRevenue(totalRevenue)
                    .totalTransactions(totalTxn);
        } else {
            // YEARLY VIEW: breakdown theo tháng
            List<Object[]> monthlyRaw = paymentRepository.getMonthlyRevenue(year, buildingId);
            List<RevenueStatsResponse.MonthlyRevenue> monthly = new ArrayList<>();
            for (Object[] row : monthlyRaw) {
                monthly.add(RevenueStatsResponse.MonthlyRevenue.builder()
                        .month(((Number) row[0]).intValue())
                        .revenue(new BigDecimal(row[1].toString()))
                        .transactions(((Number) row[2]).longValue())
                        .build());
            }
            BigDecimal totalRevenue = monthly.stream()
                    .map(RevenueStatsResponse.MonthlyRevenue::getRevenue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long totalTxn = monthly.stream().mapToLong(RevenueStatsResponse.MonthlyRevenue::getTransactions).sum();

            builder.monthlyBreakdown(monthly)
                    .totalRevenue(totalRevenue)
                    .totalTransactions(totalTxn);
        }

        return ResponseEntity.ok(ApiResponse.success(builder.build()));
    }
}

package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RevenueStatsResponse {

    private Integer year;
    private Integer month;          // null = yearly view, non-null = monthly view
    private BigDecimal totalRevenue;
    private Long totalTransactions;
    private List<MonthlyRevenue> monthlyBreakdown;
    private List<DailyRevenue> dailyBreakdown;
    private List<VehicleTypeRevenue> vehicleTypeBreakdown;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MonthlyRevenue {
        private Integer month;
        private BigDecimal revenue;
        private Long transactions;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DailyRevenue {
        private Integer day;
        private BigDecimal revenue;
        private Long transactions;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class VehicleTypeRevenue {
        private String vehicleType;
        private BigDecimal revenue;
        private Long transactions;
    }
}

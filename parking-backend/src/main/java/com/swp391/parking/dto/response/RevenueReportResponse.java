package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueReportResponse {
    private BigDecimal totalRevenue;
    private int totalSessions;
    private List<BuildingRevenueStat> byBuilding;
    private List<VehicleTypeRevenueStat> byVehicleType;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BuildingRevenueStat {
        private Long buildingId;
        private String buildingName;
        private BigDecimal revenue;
        private int sessionCount;
        private Double avgDurationMinutes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleTypeRevenueStat {
        private String vehicleTypeName;
        private BigDecimal revenue;
        private int sessionCount;
    }
}

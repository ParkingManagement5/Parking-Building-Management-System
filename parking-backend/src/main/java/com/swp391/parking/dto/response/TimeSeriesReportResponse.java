package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Doanh thu / lượt xe theo từng mốc thời gian (ngày / tuần / tháng).
 *
 * groupBy: "DAY" | "WEEK" | "MONTH"
 * period: tên của mốc — "2026-07-09" / "2026-W27" / "2026-07"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeSeriesReportResponse {

    private String from;
    private String to;
    private String groupBy;
    private BigDecimal totalRevenue;
    private int totalSessions;
    private List<DataPoint> series;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataPoint {
        private String period;
        private BigDecimal revenue;
        private int sessions;
        private BigDecimal avgFeePerSession;
    }
}

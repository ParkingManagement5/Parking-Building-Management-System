package com.swp391.parking.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StaffDailyRevenueResponse {

    /** Tổng doanh thu PARKING_FEE đã thu hôm nay tại bãi */
    private BigDecimal totalRevenue;

    /** Số phiên đóng góp vào doanh thu hôm nay */
    private int sessionCount;

    /** Tổng số giao dịch PAID hôm nay */
    private int transactionCount;

    /** Danh sách chi tiết từng giao dịch */
    private List<TransactionItem> transactions;

    @Getter
    @Builder
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class TransactionItem {
        private Integer paymentId;
        private String vehiclePlate;
        private String vehicleType;
        private LocalDateTime paidAt;
        private BigDecimal amount;
        private String paymentType;
        private String paymentMethod;
    }
}

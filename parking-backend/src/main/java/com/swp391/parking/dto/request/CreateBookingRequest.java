package com.swp391.parking.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CreateBookingRequest {
    @NotNull(message = "vehicleId không được để trống")
    private Long vehicleId;

    @NotNull(message = "slotId không được để trống")
    private Long slotId;

    @NotNull(message = "bookingStartTime không được để trống")
    @Future(message = "bookingStartTime phải là thời gian tương lai")
    private LocalDateTime bookingStartTime;

    private LocalDateTime bookingEndTime;

    // HOURLY | DAILY | WEEKLY | MONTHLY — mac dinh HOURLY neu khong truyen
    private String bookingType;

    // So don vi (ngay/tuan/thang) khi bookingType khac HOURLY
    private Integer durationUnits;
}

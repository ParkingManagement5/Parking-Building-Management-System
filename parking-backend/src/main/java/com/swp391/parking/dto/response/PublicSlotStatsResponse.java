package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicSlotStatsResponse {
    private long buildingCount;
    private long total;
    private long available;
    private long occupied;
}

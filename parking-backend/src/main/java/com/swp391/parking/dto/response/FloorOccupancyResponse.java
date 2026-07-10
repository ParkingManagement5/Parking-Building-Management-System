package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FloorOccupancyResponse {

    private List<FloorStat> floors;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FloorStat {
        private Long buildingId;
        private String buildingName;
        private Long floorId;
        private Integer floorNumber;
        private String floorName;
        private int totalSlots;
        private int occupiedSlots;
        private int availableSlots;
        private int reservedSlots;
        private int maintenanceSlots;
        private int occupancyPercent; // occupiedSlots / totalSlots * 100
    }
}

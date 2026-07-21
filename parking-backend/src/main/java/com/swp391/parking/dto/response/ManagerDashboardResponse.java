package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerDashboardResponse {

    private int totalBuildings;
    private int totalSlots;
    private int availableSlots;
    private int occupancyRatePercent;
    private int activePricingCount;
    private int staffShiftCount;
    private int activeGateCount;
    private List<BuildingSlotStat> slotsByBuilding;
    private List<VehicleTypeStat> vehicleTypeMix;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BuildingSlotStat {
        private Long buildingId;
        private String buildingName;
        private int totalSlots;
        private int availableSlots;
        private int availabilityRatePercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VehicleTypeStat {
        private String name;
        private int zoneCount;
    }
}

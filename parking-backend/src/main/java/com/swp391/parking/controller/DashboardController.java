package com.swp391.parking.controller;

import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.ManagerDashboardResponse;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Zone;
import com.swp391.parking.repository.GateRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.PricingPolicyRepository;
import com.swp391.parking.repository.StaffShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

        // Per-building stats — keyed by buildingId
        Map<Long, int[]> buildingTotals = new LinkedHashMap<>();
        Map<Long, String> buildingNames = new LinkedHashMap<>();
        // Unique zones for vehicle type mix
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

        // Vehicle type mix by unique zone count
        Map<String, Integer> vtCounts = new LinkedHashMap<>();
        for (Zone zone : uniqueZones.values()) {
            String vtName = zone.getVehicleType() != null ? zone.getVehicleType().getName() : "Unknown";
            vtCounts.merge(vtName, 1, (a, b) -> a + b);
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
}

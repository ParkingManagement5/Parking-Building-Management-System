package com.swp391.parking.service.impl;

import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

/**
 * Auto-assign slot cho walk-in và booking không chỉ định slot.
 * Ưu tiên: tầng thấp → slotCode nhỏ (gần cổng).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SlotAssignmentService {

    private final ParkingSlotRepository parkingSlotRepository;

    /**
     * Tìm slot AVAILABLE phù hợp với slotSize của loại xe [BR-02].
     *
     * @param buildingId null = bất kỳ tòa nhà
     * @param slotSize   VehicleType.SlotSize (SMALL/MEDIUM/LARGE)
     */
    public ParkingSlot assignBestSlot(Long buildingId, VehicleType.SlotSize slotSize) {
        String targetSize = slotSize.name();

        List<ParkingSlot> candidates;
        if (buildingId != null) {
            candidates = parkingSlotRepository
                    .findAvailableByBuildingAndSlotSize(buildingId, targetSize);
        } else {
            candidates = parkingSlotRepository
                    .findAvailableBySlotSize(targetSize);
        }

        if (candidates.isEmpty()) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Không còn slot trống cho kích cỡ " + slotSize
                            + (buildingId != null ? " tại tòa nhà #" + buildingId : ""));
        }

        // Sort: tầng thấp → slotCode nhỏ
        ParkingSlot best = candidates.stream()
                .sorted(Comparator
                        .comparingInt((ParkingSlot s) ->
                                s.getZone().getFloor().getFloorNumber())
                        .thenComparing(ParkingSlot::getSlotCode))
                .findFirst()
                .orElseThrow();

        log.info("Auto-assigned slot {} (floor {}) size={}",
                best.getSlotCode(),
                best.getZone().getFloor().getFloorNumber(),
                targetSize);
        return best;
    }

    /**
     * Assign slot cụ thể — kiểm tra còn AVAILABLE không.
     */
    public ParkingSlot assignSpecificSlot(Long slotId) {
        ParkingSlot slot = parkingSlotRepository.findById(slotId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy slot #" + slotId));

        if (slot.getStatus() != ParkingSlot.Status.AVAILABLE) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Slot " + slot.getSlotCode() + " không trống (status: " + slot.getStatus() + ")");
        }
        // [BR-11]
        if (slot.getStatus() == ParkingSlot.Status.MAINTENANCE) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Slot đang bảo trì");
        }
        return slot;
    }
}

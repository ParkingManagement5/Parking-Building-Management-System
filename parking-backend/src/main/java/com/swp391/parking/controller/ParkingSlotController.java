package com.swp391.parking.controller;

import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.service.ParkingSlotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/slots")
@RequiredArgsConstructor
public class ParkingSlotController {

    private final ParkingSlotService slotService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> searchAvailable(
            @RequestParam Long buildingId,
            @RequestParam Long vehicleTypeId,
            @RequestParam(required = false) Long floorId) {
        return ResponseEntity.ok(ApiResponse.success(
            slotService.searchAvailableSlots(buildingId, vehicleTypeId, floorId)));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getAvailable(@RequestParam Long vehicleTypeId) {
        return ResponseEntity.ok(ApiResponse.success(
            slotService.getAvailableByVehicleType(vehicleTypeId)));
    }

    @GetMapping("/zone/{zoneId}")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getByZone(@PathVariable Long zoneId) {
        return ResponseEntity.ok(ApiResponse.success(slotService.getByZone(zoneId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(slotService.getById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> create(@Valid @RequestBody SlotRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tao slot thanh cong",
            slotService.create(req)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> update(
            @PathVariable Long id,
            @Valid @RequestBody SlotRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cap nhat slot thanh cong",
            slotService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        slotService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Da xoa slot khoi DB"));
    }
}

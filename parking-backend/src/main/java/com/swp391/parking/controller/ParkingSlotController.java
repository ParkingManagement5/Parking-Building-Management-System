package com.swp391.parking.controller;

import com.swp391.parking.dto.request.SlotRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.ParkingSlot.Status;
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

    /**
     * GET /api/v1/slots/search?buildingId=1&vehicleTypeId=2&floorId=3
     * Row 13: Tìm slot phù hợp theo building + loại xe + tầng (floorId optional)
     * Trả về danh sách slot AVAILABLE, sắp xếp theo slotCode.
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> searchAvailable(
            @RequestParam Long buildingId,
            @RequestParam Long vehicleTypeId,
            @RequestParam(required = false) Long floorId) {
        return ResponseEntity.ok(ApiResponse.success(
            slotService.searchAvailableSlots(buildingId, vehicleTypeId, floorId)));
    }

    /**
     * GET /api/v1/slots/available?vehicleTypeId=1
     * FR-5: Driver xem slot trống khi đặt chỗ.
     * Lưu ý: để endpoint này public, Quang cần thêm "/api/v1/slots/available" vào PUBLIC_URLS
     * trong SecurityConfig. Hiện tại yêu cầu đăng nhập.
     */
    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getAvailable(
            @RequestParam Long vehicleTypeId) {
        return ResponseEntity.ok(ApiResponse.success(
            slotService.getAvailableByVehicleType(vehicleTypeId)));
    }

    /** GET /api/v1/slots/zone/{zoneId} */
    @GetMapping("/zone/{zoneId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<ParkingSlot>>> getByZone(@PathVariable Long zoneId) {
        return ResponseEntity.ok(ApiResponse.success(slotService.getByZone(zoneId)));
    }

    /** GET /api/v1/slots/{id} */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(slotService.getById(id)));
    }

    /** POST /api/v1/slots */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> create(@Valid @RequestBody SlotRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tạo slot thành công",
            slotService.create(req)));
    }

    /** PUT /api/v1/slots/{id} */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> update(
            @PathVariable Long id,
            @Valid @RequestBody SlotRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật slot thành công",
            slotService.update(id, req)));
    }

    /**
     * PATCH /api/v1/slots/{id}/status?status=MAINTENANCE
     * FR-3: đổi trạng thái slot (AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE)
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<ParkingSlot>> updateStatus(
            @PathVariable Long id,
            @RequestParam Status status) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái slot thành công",
            slotService.updateStatus(id, status)));
    }
}

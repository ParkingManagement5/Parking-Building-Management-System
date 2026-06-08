package com.swp391.parking.controller;

import com.swp391.parking.dto.request.FloorRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.service.FloorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/floors")
@RequiredArgsConstructor
public class FloorController {

    private final FloorService floorService;

    /** GET /api/v1/floors/building/{buildingId} */
    @GetMapping("/building/{buildingId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<Floor>>> getByBuilding(@PathVariable Long buildingId) {
        return ResponseEntity.ok(ApiResponse.success(floorService.getByBuilding(buildingId)));
    }

    /** GET /api/v1/floors/{id} */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(floorService.getById(id)));
    }

    /** POST /api/v1/floors */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> create(@Valid @RequestBody FloorRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Tạo tầng thành công",
            floorService.create(req)));
    }

    /** PUT /api/v1/floors/{id} */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Floor>> update(
            @PathVariable Long id,
            @Valid @RequestBody FloorRequest req) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tầng thành công",
            floorService.update(id, req)));
    }

    /** DELETE /api/v1/floors/{id} — soft delete */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivate(@PathVariable Long id) {
        floorService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hóa tầng"));
    }
}

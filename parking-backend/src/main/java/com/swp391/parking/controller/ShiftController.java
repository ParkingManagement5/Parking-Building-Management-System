package com.swp391.parking.controller;

import com.swp391.parking.dto.request.ShiftRequest;
import com.swp391.parking.dto.response.ShiftResponse;
import com.swp391.parking.service.ShiftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shifts")
@RequiredArgsConstructor
@Tag(name = "Shift", description = "Manage shifts")
public class ShiftController {

    private final ShiftService shiftService;

    @PostMapping
    @Operation(summary = "Create shift")
    public ResponseEntity<ShiftResponse> create(@Valid @RequestBody ShiftRequest request) {
        return ResponseEntity.ok(shiftService.createShift(request));
    }

    @GetMapping
    @Operation(summary = "Get all shifts")
    public ResponseEntity<List<ShiftResponse>> getAll() {
        return ResponseEntity.ok(shiftService.getAllShifts());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get shift by ID")
    public ResponseEntity<ShiftResponse> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(shiftService.getShift(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update shift")
    public ResponseEntity<ShiftResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ShiftRequest request) {
        return ResponseEntity.ok(shiftService.updateShift(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete shift")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        shiftService.deleteShift(id);
        return ResponseEntity.noContent().build();
    }
}
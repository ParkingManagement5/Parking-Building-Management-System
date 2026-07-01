package com.swp391.parking.controller;

import com.swp391.parking.dto.request.AssignStaffShiftRequest;
import com.swp391.parking.dto.response.StaffShiftResponse;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.StaffShiftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/staff-shifts")
@RequiredArgsConstructor
@Tag(name = "Staff Shift", description = "Manage staff shifts")
public class StaffShiftController {

    private final StaffShiftService staffShiftService;
    private final UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Assign shift to staff")
    public ResponseEntity<StaffShiftResponse> assign(@Valid @RequestBody AssignStaffShiftRequest request) {
        return ResponseEntity.ok(staffShiftService.assignShift(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Get all staff shifts")
    public ResponseEntity<List<StaffShiftResponse>> getAll(Authentication authentication) {
        if (isStaff(authentication)) {
            return ResponseEntity.ok(staffShiftService.getByUser(resolveCurrentUserId(authentication)));
        }
        return ResponseEntity.ok(staffShiftService.getAllStaffShifts());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Get staff shift by ID")
    public ResponseEntity<StaffShiftResponse> getOne(@PathVariable Long id, Authentication authentication) {
        StaffShiftResponse response = staffShiftService.getStaffShift(id);
        if (isStaff(authentication) && !response.getUserId().equals(resolveCurrentUserId(authentication))) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem ca lam cua nguoi khac");
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Get shifts by user")
    public ResponseEntity<List<StaffShiftResponse>> getByUser(@PathVariable Long userId, Authentication authentication) {
        if (isStaff(authentication) && !userId.equals(resolveCurrentUserId(authentication))) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem ca lam cua nguoi khac");
        }
        return ResponseEntity.ok(staffShiftService.getByUser(userId));
    }

    @GetMapping("/date/{workingDate}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Get shifts by working date")
public ResponseEntity<List<StaffShiftResponse>> getByDate(
        @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workingDate,
        Authentication authentication) {
    List<StaffShiftResponse> shifts = staffShiftService.getByWorkingDate(workingDate);
    if (isStaff(authentication)) {
        Long currentUserId = resolveCurrentUserId(authentication);
        shifts = shifts.stream()
                .filter(shift -> currentUserId.equals(shift.getUserId()))
                .toList();
    }
    return ResponseEntity.ok(shifts);
}

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Update staff shift")
    public ResponseEntity<StaffShiftResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody AssignStaffShiftRequest request) {
        return ResponseEntity.ok(staffShiftService.updateStaffShift(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    @Operation(summary = "Delete staff shift")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        staffShiftService.deleteStaffShift(id);
        return ResponseEntity.noContent().build();
    }

    private boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STAFF"));
    }

    private Long resolveCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Khong tim thay user hien tai"));
        return user.getUserId().longValue();
    }
}

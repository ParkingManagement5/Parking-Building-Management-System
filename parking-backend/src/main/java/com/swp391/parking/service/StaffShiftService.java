package com.swp391.parking.service;

import com.swp391.parking.dto.request.AssignStaffShiftRequest;
import com.swp391.parking.dto.response.StaffShiftResponse;

import java.time.LocalDate;
import java.util.List;

public interface StaffShiftService {
    StaffShiftResponse assignShift(AssignStaffShiftRequest request);
    StaffShiftResponse getStaffShift(Long id);
    List<StaffShiftResponse> getAllStaffShifts();
    List<StaffShiftResponse> getAllStaffShiftsByBuilding(Long buildingId);
    List<StaffShiftResponse> getByUser(Long userId);
    List<StaffShiftResponse> getByWorkingDate(LocalDate workingDate);
    List<StaffShiftResponse> getByWorkingDateAndBuilding(LocalDate workingDate, Long buildingId);
    StaffShiftResponse updateStaffShift(Long id, AssignStaffShiftRequest request);
    void deleteStaffShift(Long id);
    StaffShiftResponse checkIn(Long id, Long currentUserId);
    StaffShiftResponse checkOut(Long id, Long currentUserId);
    void markAbsentForPastShifts();
}
package com.swp391.parking.service;

import com.swp391.parking.dto.request.AssignStaffShiftRequest;
import com.swp391.parking.dto.response.StaffShiftResponse;

import java.util.List;

public interface StaffShiftService {
    StaffShiftResponse assignShift(AssignStaffShiftRequest request);
    StaffShiftResponse getStaffShift(Long id);
    List<StaffShiftResponse> getAllStaffShifts();
    List<StaffShiftResponse> getByUser(Long userId);
    List<StaffShiftResponse> getByWorkingDate(String workingDate);
    StaffShiftResponse updateStaffShift(Long id, AssignStaffShiftRequest request);
    void deleteStaffShift(Long id);
}
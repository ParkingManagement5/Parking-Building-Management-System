package com.swp391.parking.service;

import com.swp391.parking.dto.request.ShiftRequest;
import com.swp391.parking.dto.response.ShiftResponse;

import java.util.List;

public interface ShiftService {
    ShiftResponse createShift(ShiftRequest request);
    ShiftResponse getShift(Long id);
    List<ShiftResponse> getAllShifts();
    ShiftResponse updateShift(Long id, ShiftRequest request);
    void deleteShift(Long id);
}
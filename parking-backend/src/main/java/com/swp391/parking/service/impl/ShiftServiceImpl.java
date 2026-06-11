package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.ShiftRequest;
import com.swp391.parking.dto.response.ShiftResponse;
import com.swp391.parking.entity.Shift;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ShiftRepository;
import com.swp391.parking.service.ShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShiftServiceImpl implements ShiftService {

    private final ShiftRepository shiftRepository;

    @Override
    public ShiftResponse createShift(ShiftRequest request) {
        Shift shift = Shift.builder()
                .shiftName(request.getShiftName())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status("ACTIVE")
                .build();
        shift = shiftRepository.save(shift);
        return toResponse(shift);
    }

    @Override
    public ShiftResponse getShift(Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Shift not found"));
        return toResponse(shift);
    }

    @Override
    public List<ShiftResponse> getAllShifts() {
        return shiftRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ShiftResponse updateShift(Long id, ShiftRequest request) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Shift not found"));
        shift.setShiftName(request.getShiftName());
        shift.setStartTime(request.getStartTime());
        shift.setEndTime(request.getEndTime());
        if (request.getStatus() != null) shift.setStatus(request.getStatus());
        shift = shiftRepository.save(shift);
        return toResponse(shift);
    }

    @Override
    public void deleteShift(Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Shift not found"));
        shiftRepository.delete(shift);
    }

   private ShiftResponse toResponse(Shift shift) {
    return ShiftResponse.builder()
            .shiftId(shift.getShiftId())
            .shiftName(shift.getShiftName())
            .startTime(shift.getStartTime())
            .endTime(shift.getEndTime())
            .status(shift.getStatus())
            .build();
}
}
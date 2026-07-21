package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.AssignStaffShiftRequest;
import com.swp391.parking.dto.response.StaffShiftResponse;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.Shift;
import com.swp391.parking.entity.StaffShift;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ShiftRepository;
import com.swp391.parking.repository.StaffShiftRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.StaffShiftService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffShiftServiceImpl implements StaffShiftService {

    private final StaffShiftRepository staffShiftRepository;
    private final ShiftRepository shiftRepository;
    private final UserRepository userRepository;

    @Override
    public StaffShiftResponse assignShift(AssignStaffShiftRequest request) {
        User user = userRepository.findById((int)(long) request.getUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        ensureStaffUser(user);
        Shift shift = shiftRepository.findById(request.getShiftId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Shift not found"));
        StaffShift staffShift = StaffShift.builder()
                .user(user)
                .shift(shift)
                .workingDate(request.getWorkingDate())
                .build();
        staffShift = staffShiftRepository.save(staffShift);
        return toResponse(staffShift);
    }

    @Override
    public StaffShiftResponse getStaffShift(Long id) {
        StaffShift staffShift = staffShiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "StaffShift not found"));
        return toResponse(staffShift);
    }

    @Override
    public List<StaffShiftResponse> getAllStaffShifts() {
        return staffShiftRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    
    @Override
public List<StaffShiftResponse> getByUser(Long userId) {
    return staffShiftRepository.findByUserUserId((int)(long) userId)
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
}

    @Override
    public List<StaffShiftResponse> getByWorkingDate(LocalDate workingDate) {
        return staffShiftRepository.findByWorkingDate(workingDate)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public StaffShiftResponse updateStaffShift(Long id, AssignStaffShiftRequest request) {
        StaffShift staffShift = staffShiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "StaffShift not found"));
        User user = userRepository.findById((int)(long) request.getUserId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "User not found"));
        ensureStaffUser(user);
        Shift shift = shiftRepository.findById(request.getShiftId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Shift not found"));
        staffShift.setUser(user);
        staffShift.setShift(shift);
        staffShift.setWorkingDate(request.getWorkingDate());
        staffShift = staffShiftRepository.save(staffShift);
        return toResponse(staffShift);
    }

    @Override
    public void deleteStaffShift(Long id) {
        StaffShift staffShift = staffShiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "StaffShift not found"));
        staffShiftRepository.delete(staffShift);
    }

    private void ensureStaffUser(User user) {
        boolean isStaff = user.getRoles() != null
                && user.getRoles().stream().anyMatch(role -> role.getRoleName() == Role.RoleName.STAFF);
        if (!isStaff) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chi co the gan ca lam cho tai khoan STAFF");
        }
    }

    private StaffShiftResponse toResponse(StaffShift staffShift) {
        return StaffShiftResponse.builder()
                .staffShiftId(staffShift.getStaffShiftId())
                .userId((long)(int) staffShift.getUser().getUserId())
                .userName(staffShift.getUser().getFullName())
                .shiftId(staffShift.getShift().getShiftId())
                .shiftName(staffShift.getShift().getShiftName())
                .workingDate(staffShift.getWorkingDate())
                .startTime(staffShift.getShift().getStartTime())
                .endTime(staffShift.getShift().getEndTime())
                .build();
    }
}

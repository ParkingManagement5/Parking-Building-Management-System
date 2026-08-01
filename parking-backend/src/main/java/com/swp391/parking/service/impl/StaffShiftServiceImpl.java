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
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StaffShiftServiceImpl implements StaffShiftService {

    // Duoc phep check-in som toi da bao nhieu phut truoc gio bat dau ca.
    private static final long EARLY_CHECKIN_WINDOW_MINUTES = 30;
    // Check-in trong khoang nay tinh tu gio bat dau ca van la ON_TIME, qua thi LATE.
    private static final long LATE_THRESHOLD_MINUTES = 15;

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
                .filter(this::isActive)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<StaffShiftResponse> getAllStaffShiftsByBuilding(Long buildingId) {
        return staffShiftRepository.findAll()
                .stream()
                .filter(this::isActive)
                .filter(ss -> matchesBuilding(ss, buildingId))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }


    @Override
public List<StaffShiftResponse> getByUser(Long userId) {
    return staffShiftRepository.findByUserUserId((int)(long) userId)
            .stream()
            .filter(this::isActive)
            .map(this::toResponse)
            .collect(Collectors.toList());
}

    @Override
    public List<StaffShiftResponse> getByWorkingDate(LocalDate workingDate) {
        return staffShiftRepository.findByWorkingDate(workingDate)
                .stream()
                .filter(this::isActive)
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<StaffShiftResponse> getByWorkingDateAndBuilding(LocalDate workingDate, Long buildingId) {
        return staffShiftRepository.findByWorkingDate(workingDate)
                .stream()
                .filter(this::isActive)
                .filter(ss -> matchesBuilding(ss, buildingId))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private boolean isActive(StaffShift ss) {
        return ss.getIsActive() == null || ss.getIsActive();
    }

    private boolean matchesBuilding(StaffShift ss, Long buildingId) {
        return ss.getUser() != null
                && ss.getUser().getAssignedBuilding() != null
                && buildingId.equals(ss.getUser().getAssignedBuilding().getId());
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

    // Doi tu xoa cung sang vo hieu hoa mem — giu lai lich su check-in/check-out
    // neu ca da dien ra, chi an khoi cac danh sach dang hoat dong.
    @Override
    public void deleteStaffShift(Long id) {
        StaffShift staffShift = staffShiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "StaffShift not found"));
        staffShift.setIsActive(false);
        staffShiftRepository.save(staffShift);
    }

    @Override
    public StaffShiftResponse checkIn(Long id, Long currentUserId) {
        StaffShift staffShift = staffShiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "StaffShift not found"));
        ensureOwnShift(staffShift, currentUserId);

        if (staffShift.getCheckInTime() != null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ca này đã check-in rồi");
        }
        LocalDate today = LocalDate.now();
        if (!staffShift.getWorkingDate().equals(today)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ có thể check-in cho ca làm việc của ngày hôm nay");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime shiftStart = LocalDateTime.of(staffShift.getWorkingDate(), staffShift.getShift().getStartTime());
        LocalDateTime earliestAllowed = shiftStart.minusMinutes(EARLY_CHECKIN_WINDOW_MINUTES);
        if (now.isBefore(earliestAllowed)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chưa đến giờ check-in. Chỉ được check-in sớm nhất " + EARLY_CHECKIN_WINDOW_MINUTES + " phút trước giờ bắt đầu ca");
        }

        staffShift.setCheckInTime(now);
        staffShift.setAttendanceStatus(
                now.isAfter(shiftStart.plusMinutes(LATE_THRESHOLD_MINUTES))
                        ? StaffShift.AttendanceStatus.LATE
                        : StaffShift.AttendanceStatus.ON_TIME);
        staffShift = staffShiftRepository.save(staffShift);
        return toResponse(staffShift);
    }

    @Override
    public StaffShiftResponse checkOut(Long id, Long currentUserId) {
        StaffShift staffShift = staffShiftRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "StaffShift not found"));
        ensureOwnShift(staffShift, currentUserId);

        if (staffShift.getCheckInTime() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chưa check-in thì không thể check-out");
        }
        if (staffShift.getCheckOutTime() != null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Ca này đã check-out rồi");
        }

        staffShift.setCheckOutTime(LocalDateTime.now());
        staffShift.setAttendanceStatus(StaffShift.AttendanceStatus.COMPLETED);
        staffShift = staffShiftRepository.save(staffShift);
        return toResponse(staffShift);
    }

    @Override
    public void markAbsentForPastShifts() {
        LocalDate today = LocalDate.now();

        // Ca cua nhung ngay truoc, chua tung check-in -> chac chan ABSENT.
        List<StaffShift> pastDays = staffShiftRepository
                .findByCheckInTimeIsNullAndAttendanceStatusAndWorkingDateBefore(StaffShift.AttendanceStatus.NOT_STARTED, today);

        // Ca hom nay nhung da qua gio ket thuc ma chua check-in -> ABSENT.
        LocalDateTime now = LocalDateTime.now();
        List<StaffShift> todayShifts = staffShiftRepository
                .findByCheckInTimeIsNullAndAttendanceStatusAndWorkingDate(StaffShift.AttendanceStatus.NOT_STARTED, today)
                .stream()
                .filter(ss -> now.isAfter(LocalDateTime.of(ss.getWorkingDate(), ss.getShift().getEndTime())))
                .toList();

        pastDays.forEach(ss -> ss.setAttendanceStatus(StaffShift.AttendanceStatus.ABSENT));
        todayShifts.forEach(ss -> ss.setAttendanceStatus(StaffShift.AttendanceStatus.ABSENT));
        staffShiftRepository.saveAll(pastDays);
        staffShiftRepository.saveAll(todayShifts);
    }

    private void ensureOwnShift(StaffShift staffShift, Long currentUserId) {
        if (!staffShift.getUser().getUserId().equals(currentUserId.intValue())) {
            throw new AppException(HttpStatus.FORBIDDEN, "Chỉ có thể tự check-in/check-out ca làm của chính mình");
        }
    }

    private void ensureStaffUser(User user) {
        boolean isStaff = user.getRoles() != null
                && user.getRoles().stream().anyMatch(role -> role.getRoleName() == Role.RoleName.STAFF);
        if (!isStaff) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Chỉ có thể gán ca làm cho tài khoản STAFF");
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
                .checkInTime(staffShift.getCheckInTime())
                .checkOutTime(staffShift.getCheckOutTime())
                .attendanceStatus(staffShift.getAttendanceStatus().name())
                .build();
    }
}

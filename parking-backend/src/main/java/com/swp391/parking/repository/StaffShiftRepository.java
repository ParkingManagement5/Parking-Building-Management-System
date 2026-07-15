package com.swp391.parking.repository;

import com.swp391.parking.entity.StaffShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface StaffShiftRepository extends JpaRepository<StaffShift, Long> {
    List<StaffShift> findByUserUserId(int userId);
    List<StaffShift> findByWorkingDate(LocalDate workingDate);

    /** Ca chua check-in va da qua ngay lam viec - ung vien de danh dau ABSENT. */
    List<StaffShift> findByCheckInTimeIsNullAndAttendanceStatusAndWorkingDateBefore(
            StaffShift.AttendanceStatus attendanceStatus, LocalDate workingDate);

    /** Ca hom nay chua check-in - can loc them theo gio ket thuc ca o service layer. */
    List<StaffShift> findByCheckInTimeIsNullAndAttendanceStatusAndWorkingDate(
            StaffShift.AttendanceStatus attendanceStatus, LocalDate workingDate);
}
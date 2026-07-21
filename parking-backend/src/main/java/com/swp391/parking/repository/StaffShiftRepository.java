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
}
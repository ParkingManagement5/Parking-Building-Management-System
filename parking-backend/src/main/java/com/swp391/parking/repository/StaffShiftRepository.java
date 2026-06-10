package com.swp391.parking.repository;

import com.swp391.parking.entity.StaffShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StaffShiftRepository extends JpaRepository<StaffShift, Long> {
    List<StaffShift> findByUserId(Long userId);
    List<StaffShift> findByWorkingDate(String workingDate);
}
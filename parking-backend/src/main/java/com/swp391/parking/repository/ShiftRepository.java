package com.swp391.parking.repository;

import com.swp391.parking.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {
}
package com.swp391.parking.repository;

import com.swp391.parking.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ActivityLogRepository
        extends JpaRepository<ActivityLog, Integer> {
}
package com.swp391.parking.repository;

import com.swp391.parking.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findAllByOrderByCreatedAtDesc();
    List<ActivityLog> findAllByUser_UserIdOrderByCreatedAtDesc(Integer userId);
    List<ActivityLog> findAllByUser_UserIdAndActionTypeOrderByCreatedAtDesc(Integer userId, String actionType);
}

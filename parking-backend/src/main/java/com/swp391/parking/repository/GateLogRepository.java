package com.swp391.parking.repository;

import com.swp391.parking.entity.GateLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GateLogRepository extends JpaRepository<GateLog, Long> {
    List<GateLog> findBySession_IdOrderByEventTimeDesc(Long sessionId);
    List<GateLog> findByGate_IdOrderByEventTimeDesc(Long gateId);
}

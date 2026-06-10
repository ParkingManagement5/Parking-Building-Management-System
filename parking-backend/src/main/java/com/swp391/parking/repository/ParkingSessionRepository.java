package com.swp391.parking.repository;

import com.swp391.parking.entity.ParkingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, Long> {
    List<ParkingSession> findByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<ParkingSession> findBySlot_IdAndStatus(Long slotId, ParkingSession.SessionStatus status);
    Optional<ParkingSession> findByBooking_Id(Long bookingId);
}

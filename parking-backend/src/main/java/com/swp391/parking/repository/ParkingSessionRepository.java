package com.swp391.parking.repository;

import com.swp391.parking.entity.ParkingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, Long> {
    List<ParkingSession> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<ParkingSession> findByStatusOrderByCreatedAtDesc(ParkingSession.SessionStatus status);
    List<ParkingSession> findAllByOrderByCreatedAtDesc();
    Optional<ParkingSession> findBySlot_IdAndStatus(Long slotId, ParkingSession.SessionStatus status);
    Optional<ParkingSession> findByBooking_Id(Long bookingId);

    boolean existsByVehicle_IdAndStatusIn(Long vehicleId, List<ParkingSession.SessionStatus> statuses);

    @Query("""
        select s
        from ParkingSession s
        join s.vehicle v
        where lower(v.licensePlate) like lower(concat('%', :keyword, '%'))
           or cast(s.id as string) like concat('%', :keyword, '%')
        order by s.createdAt desc
        """)
    List<ParkingSession> searchByPlateOrId(@Param("keyword") String keyword);

    @Query("""
        select s
        from ParkingSession s
        join s.vehicle v
        where s.status = :status
          and (lower(v.licensePlate) like lower(concat('%', :keyword, '%'))
               or cast(s.id as string) like concat('%', :keyword, '%'))
        order by s.createdAt desc
        """)
    List<ParkingSession> searchByPlateOrIdAndStatus(@Param("keyword") String keyword,
                                                     @Param("status") ParkingSession.SessionStatus status);
}

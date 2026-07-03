package com.swp391.parking.service;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
import com.swp391.parking.dto.request.SessionQrScanRequest;
import com.swp391.parking.dto.response.QrTokenResponse;
import com.swp391.parking.dto.response.SessionResponse;
import java.util.List;
import java.util.Optional;

public interface ParkingSessionService {
    SessionResponse processEntry(SessionEntryRequest request);
    SessionResponse processExit(Long sessionId, SessionExitRequest request);
    SessionResponse processExitQr(SessionQrScanRequest request);
    QrTokenResponse generateExitQr(Long sessionId, Long currentUserId);
    SessionResponse getSession(Long sessionId);
    List<SessionResponse> getMySessions(Long currentUserId);
    List<SessionResponse> getSessions(String status, String keyword, Long currentUserId, boolean staffScoped);
    Optional<SessionResponse> findActiveByPlate(String plate);
}

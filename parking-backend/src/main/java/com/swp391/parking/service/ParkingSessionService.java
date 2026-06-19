package com.swp391.parking.service;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
import com.swp391.parking.dto.response.SessionResponse;
import java.util.List;

public interface ParkingSessionService {
    SessionResponse processEntry(SessionEntryRequest request);
    SessionResponse processExit(Long sessionId, SessionExitRequest request);
    SessionResponse completeSessionAfterPayment(Long sessionId);
    SessionResponse getSession(Long sessionId);
    SessionResponse getOwnedSession(Long sessionId, String username);
    List<SessionResponse> getMySessions(Long currentUserId);
}

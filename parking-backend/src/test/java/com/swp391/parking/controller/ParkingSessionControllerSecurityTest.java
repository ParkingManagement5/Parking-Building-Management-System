package com.swp391.parking.controller;

import com.swp391.parking.dto.response.SessionResponse;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.service.ParkingSessionService;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;

import java.time.LocalDateTime;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ParkingSessionControllerSecurityTest extends AbstractIntegrationTestSupport {

    private static final Long SESSION_ID = 7L;

    @MockBean
    private ParkingSessionService sessionService;

    @Test
    @WithMockUser(username = "driver-owner", roles = "DRIVER")
    void getSession_shouldAllowDriverOwner() throws Exception {
        given(sessionService.getOwnedSession(SESSION_ID, "driver-owner"))
                .willReturn(sessionResponse());

        mockMvc.perform(get("/api/sessions/{id}", SESSION_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(SESSION_ID));

        verify(sessionService).getOwnedSession(SESSION_ID, "driver-owner");
        verify(sessionService, never()).getSession(SESSION_ID);
    }

    @Test
    @WithMockUser(username = "driver-other", roles = "DRIVER")
    void getSession_shouldReturnNotFoundForDriverNonOwner() throws Exception {
        given(sessionService.getOwnedSession(SESSION_ID, "driver-other"))
                .willThrow(new AppException(HttpStatus.NOT_FOUND, "Khong tim thay session"));

        mockMvc.perform(get("/api/sessions/{id}", SESSION_ID))
                .andExpect(status().isNotFound());

        verify(sessionService).getOwnedSession(SESSION_ID, "driver-other");
        verify(sessionService, never()).getSession(SESSION_ID);
    }

    @Test
    @WithMockUser(username = "driver-owner", roles = "DRIVER")
    void getSession_shouldReturnNotFoundForDriverWhenSessionDoesNotExist() throws Exception {
        given(sessionService.getOwnedSession(SESSION_ID, "driver-owner"))
                .willThrow(new AppException(HttpStatus.NOT_FOUND, "Khong tim thay session"));

        mockMvc.perform(get("/api/sessions/{id}", SESSION_ID))
                .andExpect(status().isNotFound());

        verify(sessionService).getOwnedSession(SESSION_ID, "driver-owner");
    }

    @Test
    @WithMockUser(username = "staff", roles = "STAFF")
    void getSession_shouldAllowStaff() throws Exception {
        given(sessionService.getSession(SESSION_ID)).willReturn(sessionResponse());

        mockMvc.perform(get("/api/sessions/{id}", SESSION_ID))
                .andExpect(status().isOk());

        verify(sessionService).getSession(SESSION_ID);
        verify(sessionService, never()).getOwnedSession(SESSION_ID, "staff");
    }

    @Test
    @WithMockUser(username = "manager", roles = "MANAGER")
    void getSession_shouldAllowManager() throws Exception {
        given(sessionService.getSession(SESSION_ID)).willReturn(sessionResponse());

        mockMvc.perform(get("/api/sessions/{id}", SESSION_ID))
                .andExpect(status().isOk());

        verify(sessionService).getSession(SESSION_ID);
        verify(sessionService, never()).getOwnedSession(SESSION_ID, "manager");
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void getSession_shouldAllowAdmin() throws Exception {
        given(sessionService.getSession(SESSION_ID)).willReturn(sessionResponse());

        mockMvc.perform(get("/api/sessions/{id}", SESSION_ID))
                .andExpect(status().isOk());

        verify(sessionService).getSession(SESSION_ID);
        verify(sessionService, never()).getOwnedSession(SESSION_ID, "admin");
    }

    @Test
    void getSession_shouldRejectUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/sessions/{id}", SESSION_ID))
                .andExpect(status().isUnauthorized());

        verify(sessionService, never()).getSession(SESSION_ID);
    }

    private SessionResponse sessionResponse() {
        return SessionResponse.builder()
                .sessionId(SESSION_ID)
                .slotId(4L)
                .slotCode("A-01")
                .userId(6L)
                .vehicleId(3L)
                .licensePlate("51A-12345")
                .entryGateId(2L)
                .entryTime(LocalDateTime.now())
                .entryMode("WALK_IN_MANUAL")
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .build();
    }
}

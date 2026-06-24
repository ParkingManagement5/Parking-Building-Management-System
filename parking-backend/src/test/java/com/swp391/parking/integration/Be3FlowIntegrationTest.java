package com.swp391.parking.integration;

import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Be3FlowIntegrationTest extends AbstractIntegrationTestSupport {

    @Test
    void loginShouldReturnJwtForActiveSeedLikeUser() throws Exception {
        createUser("staff1", "Password123!", Role.RoleName.STAFF);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "username": "staff1",
                      "password": "Password123!"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.username").value("staff1"))
            .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void loginShouldRejectWrongPassword() throws Exception {
        createUser("staff2", "Password123!", Role.RoleName.STAFF);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "username": "staff2",
                      "password": "WrongPassword123!"
                    }
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Username hoac password khong dung. Con 4 lan truoc khi tam khoa tai khoan"));
    }

    @Test
    void unauthenticatedEntryShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/sessions/entry")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": 1,
                      "entryMode": "WALK_IN_AUTO",
                      "licensePlate": "59A-99999"
                    }
                    """))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "driver-entry", roles = "DRIVER")
    void driverShouldNotBeAllowedToProcessEntry() throws Exception {
        createUser("driver-entry", Role.RoleName.DRIVER);

        mockMvc.perform(post("/api/v1/sessions/entry")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": 1,
                      "entryMode": "WALK_IN_AUTO",
                      "licensePlate": "59A-88888"
                    }
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "driver-owner", roles = "DRIVER")
    void driverShouldReadOnlyOwnSession() throws Exception {
        User owner = createUser("driver-owner", Role.RoleName.DRIVER);
        User other = createUser("driver-other", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Session Tower");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Session Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Session Zone");
        ParkingSlot ownerSlot = createSlot(zone, "SS-01", ParkingSlot.Status.OCCUPIED);
        ParkingSlot otherSlot = createSlot(zone, "SS-02", ParkingSlot.Status.OCCUPIED);
        Gate entryGate = createGate(building, "ENTRY-1", Gate.GateType.ENTRY);
        Vehicle ownerVehicle = createVehicle(owner, vehicleType, "51A-11111");
        Vehicle otherVehicle = createVehicle(other, vehicleType, "51A-22222");
        ParkingSession ownerSession = createSession(
                owner, ownerVehicle, ownerSlot, entryGate,
                ParkingSession.EntryMode.WALK_IN_AUTO, ParkingSession.SessionStatus.ACTIVE);
        ParkingSession otherSession = createSession(
                other, otherVehicle, otherSlot, entryGate,
                ParkingSession.EntryMode.WALK_IN_AUTO, ParkingSession.SessionStatus.ACTIVE);

        mockMvc.perform(get("/api/v1/sessions/{id}", ownerSession.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.sessionId").value(ownerSession.getId()))
            .andExpect(jsonPath("$.data.licensePlate").value("51A-11111"));

        mockMvc.perform(get("/api/v1/sessions/{id}", otherSession.getId()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "staff-exit", roles = "STAFF")
    void exitShouldKeepSlotOccupiedUntilParkingFeeIsPaid() throws Exception {
        User staff = createUser("staff-exit", Role.RoleName.STAFF);
        ParkingBuilding building = createBuilding("Exit Tower");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Exit Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Exit Zone");
        ParkingSlot slot = createSlot(zone, "EX-01", ParkingSlot.Status.OCCUPIED);
        Gate entryGate = createGate(building, "ENTRY-EX", Gate.GateType.ENTRY);
        Gate exitGate = createGate(building, "EXIT-EX", Gate.GateType.EXIT);
        Vehicle vehicle = createVehicle(staff, vehicleType, "60A-12345");
        ParkingSession session = createSession(
                staff, vehicle, slot, entryGate,
                ParkingSession.EntryMode.WALK_IN_MANUAL, ParkingSession.SessionStatus.ACTIVE);

        mockMvc.perform(post("/api/v1/sessions/{id}/exit", session.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "staffUserId": %d,
                      "qrVerified": true
                    }
                    """.formatted(exitGate.getId(), staff.getUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("WAITING_PAYMENT"));

        ParkingSlot slotAfterExit = parkingSlotRepository.findById(slot.getId()).orElseThrow();
        ParkingSession sessionAfterExit = parkingSessionRepository.findById(session.getId()).orElseThrow();
        assertThat(slotAfterExit.getStatus()).isEqualTo(ParkingSlot.Status.OCCUPIED);
        assertThat(sessionAfterExit.getStatus()).isEqualTo(ParkingSession.SessionStatus.WAITING_PAYMENT);

        mockMvc.perform(post("/api/v1/payments/parking-fee")
                .param("sessionId", session.getId().toString())
                .param("totalAmount", "15000")
                .param("paymentMethod", Payment.PaymentMethod.CASH.name()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.paymentStatus").value("PENDING"));

        Payment payment = paymentRepository.findAll().get(0);

        mockMvc.perform(put("/api/v1/payments/parking-fee/{paymentId}/confirm", payment.getPaymentId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.paymentStatus").value("PAID"));

        ParkingSlot slotAfterPayment = parkingSlotRepository.findById(slot.getId()).orElseThrow();
        ParkingSession sessionAfterPayment = parkingSessionRepository.findById(session.getId()).orElseThrow();
        assertThat(slotAfterPayment.getStatus()).isEqualTo(ParkingSlot.Status.AVAILABLE);
        assertThat(sessionAfterPayment.getStatus()).isEqualTo(ParkingSession.SessionStatus.COMPLETED);
    }
}

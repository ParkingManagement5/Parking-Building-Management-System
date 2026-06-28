package com.swp391.parking.integration;

import com.swp391.parking.entity.Booking;
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
import com.swp391.parking.util.QrTokenUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class Be3FlowIntegrationTest extends AbstractIntegrationTestSupport {

    @Autowired
    private QrTokenUtil qrTokenUtil;

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

    @Test
    @WithMockUser(username = "staff-plate-scan", roles = "STAFF")
    void plateVariantsShouldFindConfirmedBookingAndPreventWalkInDuplicate() throws Exception {
        User staff = createUser("staff-plate-scan", Role.RoleName.STAFF);
        User driver = createUser("driver-plate-scan", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Plate Tower");
        var floor = createFloor(building, 2);
        VehicleType vehicleType = createVehicleType("Plate Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Plate Zone");
        ParkingSlot reservedSlot = createSlot(zone, "T2-A-01", ParkingSlot.Status.RESERVED);
        ParkingSlot autoSlot = createSlot(zone, "T1-A-01", ParkingSlot.Status.AVAILABLE);
        Gate entryGate = createGate(building, "ENTRY-PLATE", Gate.GateType.ENTRY);
        Vehicle vehicle = createVehicle(driver, vehicleType, "51A-99999");
        Booking booking = createConfirmedBooking(driver, vehicle, reservedSlot);

        mockMvc.perform(get("/api/v1/vehicles/plate/{licensePlate}", "51A-999.99"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(vehicle.getId()));

        for (String variant : new String[]{"51A-99999", "51A-999.99", "51A 99999", "51A.99999", "51a-99999"}) {
            mockMvc.perform(get("/api/v1/bookings/search")
                    .param("licensePlate", variant))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].bookingId").value(booking.getId()))
                .andExpect(jsonPath("$.data[0].slotCode").value("T2-A-01"));
        }

        long vehiclesBefore = vehicleRepository.count();
        long sessionsBefore = parkingSessionRepository.count();

        mockMvc.perform(post("/api/v1/sessions/entry")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "entryMode": "WALK_IN_AUTO",
                      "licensePlate": "51A-999.99",
                      "vehicleTypeId": %d,
                      "staffUserId": %d
                    }
                    """.formatted(entryGate.getId(), vehicleType.getId(), staff.getUserId())))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.success").value(false));

        assertThat(vehicleRepository.count()).isEqualTo(vehiclesBefore);
        assertThat(parkingSessionRepository.count()).isEqualTo(sessionsBefore);
        assertThat(parkingSlotRepository.findById(autoSlot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.AVAILABLE);
        assertThat(parkingSlotRepository.findById(reservedSlot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.RESERVED);
        assertThat(bookingRepository.findById(booking.getId()).orElseThrow().getStatus())
            .isEqualTo(Booking.BookingStatus.CONFIRMED);
    }

    @Test
    @WithMockUser(username = "staff-plate-entry", roles = "STAFF")
    void bookingEntrySessionLookupAndExitQrShouldUseCanonicalPlateComparison() throws Exception {
        User staff = createUser("staff-plate-entry", Role.RoleName.STAFF);
        User driver = createUser("driver-plate-entry", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Plate Entry Tower");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Plate Entry Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Plate Entry Zone");
        ParkingSlot slot = createSlot(zone, "PE-01", ParkingSlot.Status.RESERVED);
        Gate entryGate = createGate(building, "ENTRY-PE", Gate.GateType.ENTRY);
        Gate exitGate = createGate(building, "EXIT-PE", Gate.GateType.EXIT);
        Vehicle vehicle = createVehicle(driver, vehicleType, "51A-99999");
        Booking booking = createConfirmedBooking(driver, vehicle, slot);

        mockMvc.perform(post("/api/v1/sessions/entry")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "entryMode": "BOOKING",
                      "licensePlate": "51A.99999",
                      "qrToken": "%s",
                      "staffUserId": %d
                    }
                    """.formatted(entryGate.getId(), booking.getQrToken(), staff.getUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.bookingId").value(booking.getId()))
            .andExpect(jsonPath("$.data.slotCode").value("PE-01"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        ParkingSession activeSession = parkingSessionRepository.findByBooking_Id(booking.getId()).orElseThrow();
        assertThat(vehicleRepository.count()).isEqualTo(1);
        assertThat(parkingSessionRepository.count()).isEqualTo(1);
        assertThat(parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.OCCUPIED);

        mockMvc.perform(get("/api/v1/sessions")
                .param("status", "ACTIVE")
                .param("keyword", "51A 99999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].sessionId").value(activeSession.getId()));

        String exitQr = qrTokenUtil.generateExitQrToken(
                activeSession.getId(),
                driver.getUserId().longValue(),
                vehicle.getLicensePlate(),
                booking.getId(),
                LocalDateTime.now().plusMinutes(30));

        mockMvc.perform(post("/api/v1/sessions/exit/qr")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "qrToken": "%s",
                      "gateId": %d,
                      "licensePlate": "51A-99998",
                      "staffUserId": %d
                    }
                    """.formatted(exitQr, exitGate.getId(), staff.getUserId())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));

        assertThat(parkingSessionRepository.findById(activeSession.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSession.SessionStatus.ACTIVE);

        mockMvc.perform(post("/api/v1/sessions/exit/qr")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "qrToken": "%s",
                      "gateId": %d,
                      "licensePlate": "51A-999.99",
                      "staffUserId": %d
                    }
                    """.formatted(exitQr, exitGate.getId(), staff.getUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("WAITING_PAYMENT"));
    }

    @Test
    @WithMockUser(username = "staff-normal-booking", roles = "STAFF")
    void normalBookingEntryAndExitShouldStillWorkWithExactPlate() throws Exception {
        User staff = createUser("staff-normal-booking", Role.RoleName.STAFF);
        User driver = createUser("driver-normal-booking", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Normal Booking Tower");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Normal Booking Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Normal Booking Zone");
        ParkingSlot slot = createSlot(zone, "NB-01", ParkingSlot.Status.RESERVED);
        Gate entryGate = createGate(building, "ENTRY-NB", Gate.GateType.ENTRY);
        Gate exitGate = createGate(building, "EXIT-NB", Gate.GateType.EXIT);
        Vehicle vehicle = createVehicle(driver, vehicleType, "52A-12345");
        Booking booking = createConfirmedBooking(driver, vehicle, slot);

        mockMvc.perform(post("/api/v1/sessions/entry")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "entryMode": "BOOKING",
                      "licensePlate": "52A-12345",
                      "qrToken": "%s",
                      "staffUserId": %d
                    }
                    """.formatted(entryGate.getId(), booking.getQrToken(), staff.getUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        ParkingSession session = parkingSessionRepository.findByBooking_Id(booking.getId()).orElseThrow();

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
            .andExpect(jsonPath("$.data.status").value("WAITING_PAYMENT"));
    }

    private Booking createConfirmedBooking(User driver, Vehicle vehicle, ParkingSlot slot) {
        LocalDateTime now = LocalDateTime.now();
        String qrToken = qrTokenUtil.generateQrToken(
                1L,
                vehicle.getLicensePlate(),
                slot.getId(),
                now.plusHours(2));
        Booking booking = Booking.builder()
                .userId(driver.getUserId().longValue())
                .vehicle(vehicle)
                .slot(slot)
                .bookingStartTime(now.plusMinutes(10))
                .bookingEndTime(now.plusHours(2))
                .reservedAt(now)
                .expiredAt(now.plusHours(2))
                .qrToken(qrToken)
                .qrIssuedAt(now)
                .depositAmount(new BigDecimal("10000"))
                .depositPaidAt(now)
                .status(Booking.BookingStatus.CONFIRMED)
                .build();
        booking = bookingRepository.save(booking);
        booking.setQrToken(qrTokenUtil.generateQrToken(
                booking.getId(),
                vehicle.getLicensePlate(),
                slot.getId(),
                now.plusHours(2)));
        return bookingRepository.save(booking);
    }
}

package com.swp391.parking.integration;

import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.ExceptionCase;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.OcrScan;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.PricingPolicy;
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
            .andExpect(jsonPath("$.message").value("Username hoặc password không đúng. Còn 4 lần trước khi tạm khoá tài khoản"));
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
        staff = assignBuilding(staff, building);
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
    @WithMockUser(username = "staff-walkin-lifecycle", roles = "STAFF")
    void walkInLifecycleShouldReachCompletedWithoutBookingOrQr() throws Exception {
        User staff = createUser("staff-walkin-lifecycle", Role.RoleName.STAFF);
        ParkingBuilding building = createBuilding("WalkIn Tower");
        staff = assignBuilding(staff, building);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("WalkIn Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "WalkIn Zone");
        ParkingSlot slot = createSlot(zone, "WI-01", ParkingSlot.Status.AVAILABLE);
        Gate entryGate = createGate(building, "ENTRY-WI", Gate.GateType.ENTRY);
        Gate exitGate = createGate(building, "EXIT-WI", Gate.GateType.EXIT);

        // Toa nha phai co bang gia rieng (Manager tu set) truoc khi cho walk-in vao -
        // khong con fallback ve gia global nua.
        pricingPolicyRepository.save(PricingPolicy.builder()
                .vehicleType(vehicleType)
                .building(building)
                .dayType("WEEKDAY")
                .timeType("HOURLY")
                .startHour(0)
                .endHour(24)
                .pricePerHour(new BigDecimal("15000"))
                .effectiveFrom(LocalDateTime.of(2020, 1, 1, 0, 0))
                .isActive(true)
                .build());

        long vehiclesBefore = vehicleRepository.count();

        mockMvc.perform(post("/api/v1/sessions/entry")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "entryMode": "WALK_IN_AUTO",
                      "licensePlate": "59a 12345",
                      "vehicleTypeId": %d
                    }
                    """.formatted(entryGate.getId(), vehicleType.getId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.entryMode").value("WALK_IN_AUTO"))
            .andExpect(jsonPath("$.data.status").value("ACTIVE"))
            .andExpect(jsonPath("$.data.slotCode").value("WI-01"))
            .andExpect(jsonPath("$.data.licensePlate").value("59A-123.45"))
            .andExpect(jsonPath("$.data.bookingId").isEmpty());

        ParkingSession activeSession = parkingSessionRepository.findAll().get(0);
        ParkingSlot occupiedSlot = parkingSlotRepository.findById(slot.getId()).orElseThrow();
        assertThat(activeSession.getBooking()).isNull();
        assertThat(activeSession.getStatus()).isEqualTo(ParkingSession.SessionStatus.ACTIVE);
        assertThat(occupiedSlot.getStatus()).isEqualTo(ParkingSlot.Status.OCCUPIED);
        assertThat(vehicleRepository.count()).isEqualTo(vehiclesBefore + 1);
        assertThat(activeSession.getVehicle().getLicensePlate()).isEqualTo("59A-123.45");

        // Vao-ra gan nhu tuc thi (0 phut) => phi tinh duoc = 0d, nam trong grace
        // period => "/exit" tu dong hoan tat luon session (tinh nang co san,
        // khong phai loi), khong con buoc WAITING_PAYMENT rieng nua.
        mockMvc.perform(post("/api/v1/sessions/{id}/exit", activeSession.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "qrVerified": false
                    }
                    """.formatted(exitGate.getId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("COMPLETED"))
            .andExpect(jsonPath("$.data.exitGateCode").value("EXIT-WI"));

        ParkingSession completedSession = parkingSessionRepository.findById(activeSession.getId()).orElseThrow();
        ParkingSlot releasedSlot = parkingSlotRepository.findById(slot.getId()).orElseThrow();
        assertThat(completedSession.getStatus()).isEqualTo(ParkingSession.SessionStatus.COMPLETED);
        assertThat(completedSession.getBooking()).isNull();
        assertThat(releasedSlot.getStatus()).isEqualTo(ParkingSlot.Status.AVAILABLE);

        Payment autoPayment = paymentRepository.findAll().stream()
            .filter(savedPayment -> savedPayment.getPaymentType() == Payment.PaymentType.PARKING_FEE)
            .findFirst()
            .orElseThrow();
        assertThat(autoPayment.getPaymentStatus()).isEqualTo(Payment.PaymentStatus.PAID);
        assertThat(autoPayment.getBookingId()).isNull();
        assertThat(autoPayment.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @WithMockUser(username = "staff-pricing-blocks", roles = "STAFF")
    void parkingFeeShouldUseGracePeriodThirtyMinuteBlocksAndWindowSplit() throws Exception {
        User staff = createUser("staff-pricing-blocks", Role.RoleName.STAFF);
        ParkingBuilding building = createBuilding("Pricing Tower");
        staff = assignBuilding(staff, building);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Pricing Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Pricing Zone");
        ParkingSlot slot = createSlot(zone, "PR-01", ParkingSlot.Status.OCCUPIED);
        Gate entryGate = createGate(building, "ENTRY-PR", Gate.GateType.ENTRY);
        Vehicle vehicle = createVehicle(staff, vehicleType, "51H-99999");

        // effectiveFrom phai truoc thoi diem session mo phong (2026-06-30), khong
        // phai truoc "now" luc chay test - neu khong policy se bi coi la "chua co
        // hieu luc" tai thoi diem session va rot ve fallback phang (khong tach
        // ngay/dem).
        LocalDateTime policyEffectiveFrom = LocalDateTime.of(2020, 1, 1, 0, 0);
        pricingPolicyRepository.save(PricingPolicy.builder()
                .vehicleType(vehicleType)
                .building(building)
                .dayType("WEEKDAY")
                .timeType("HOURLY")
                .startHour(6)
                .endHour(22)
                .pricePerHour(new BigDecimal("15000"))
                .effectiveFrom(policyEffectiveFrom)
                .isActive(true)
                .build());
        pricingPolicyRepository.save(PricingPolicy.builder()
                .vehicleType(vehicleType)
                .building(building)
                .dayType("WEEKDAY")
                .timeType("HOURLY")
                .startHour(22)
                .endHour(6)
                .pricePerHour(new BigDecimal("12000"))
                .effectiveFrom(policyEffectiveFrom)
                .isActive(true)
                .build());

        ParkingSession session = createSession(
                staff, vehicle, slot, entryGate,
                ParkingSession.EntryMode.WALK_IN_MANUAL, ParkingSession.SessionStatus.WAITING_PAYMENT);
        session.setEntryTime(LocalDateTime.of(2026, 6, 30, 21, 35));
        session.setExitTime(LocalDateTime.of(2026, 6, 30, 22, 20));
        parkingSessionRepository.save(session);

        mockMvc.perform(post("/api/v1/payments/parking-fee")
                .param("sessionId", session.getId().toString())
                .param("totalAmount", "999999")
                .param("paymentMethod", Payment.PaymentMethod.CASH.name()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            // 21:45->22:00 (15p, 15000/h) = 1 block x 7500 = 7500
            // 22:00->22:20 (20p, 12000/h) = 1 block x 6000 = 6000 => tong 13500
            .andExpect(jsonPath("$.data.baseFee").value(13500))
            .andExpect(jsonPath("$.data.totalAmount").value(13500))
            .andExpect(jsonPath("$.data.appliedRate").value(15000));
    }

    @Test
    @WithMockUser(username = "staff-daily-prepaid", roles = "STAFF")
    void dailyPrepaidBookingShouldNotChargeAgainAtExitWhenPackageRateChanged() throws Exception {
        User staff = createUser("staff-daily-prepaid", Role.RoleName.STAFF);
        User driver = createUser("driver-daily-prepaid", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Daily Prepaid Tower");
        staff = assignBuilding(staff, building);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Daily Prepaid Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Daily Prepaid Zone");
        ParkingSlot slot = createSlot(zone, "DP-01", ParkingSlot.Status.OCCUPIED);
        Gate entryGate = createGate(building, "ENTRY-DP", Gate.GateType.ENTRY);
        Vehicle vehicle = createVehicle(driver, vehicleType, "61A-10000");

        LocalDateTime start = LocalDateTime.of(2026, 7, 20, 8, 0);
        Booking booking = Booking.builder()
            .userId(driver.getUserId().longValue())
            .vehicle(vehicle)
            .slot(slot)
            .bookingStartTime(start)
            .bookingEndTime(start.plusDays(1))
            .bookingType("DAILY")
            .reservedAt(start.minusHours(1))
            .expiredAt(start.plusDays(1))
            .depositAmount(new BigDecimal("100000"))
            .depositPaidAt(start.minusMinutes(30))
            .status(Booking.BookingStatus.WAITING_PAYMENT)
            .build();
        booking = bookingRepository.save(booking);

        pricingPolicyRepository.save(PricingPolicy.builder()
            .vehicleType(vehicleType)
            .building(building)
            .dayType("WEEKDAY")
            .timeType("DAILY")
            .startHour(0)
            .endHour(24)
            .pricePerHour(new BigDecimal("200000"))
            .effectiveFrom(LocalDateTime.of(2026, 7, 1, 0, 0))
            .isActive(true)
            .build());

        ParkingSession session = ParkingSession.builder()
            .booking(booking)
            .slot(slot)
            .userId(driver.getUserId().longValue())
            .vehicle(vehicle)
            .entryGate(entryGate)
            .entryTime(start)
            .exitTime(start.plusHours(23))
            .entryMode(ParkingSession.EntryMode.BOOKING)
            .status(ParkingSession.SessionStatus.WAITING_PAYMENT)
            .build();
        session = parkingSessionRepository.save(session);

        mockMvc.perform(post("/api/v1/payments/parking-fee")
                .param("sessionId", session.getId().toString())
                .param("bookingId", booking.getId().toString())
                .param("totalAmount", "999999")
                .param("paymentMethod", Payment.PaymentMethod.CASH.name()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.paymentStatus").value("PAID"))
            .andExpect(jsonPath("$.data.baseFee").value(100000))
            .andExpect(jsonPath("$.data.depositDeducted").value(100000))
            .andExpect(jsonPath("$.data.totalAmount").value(0));

        Payment finalFee = paymentRepository.findAll().stream()
            .filter(payment -> payment.getPaymentType() == Payment.PaymentType.PARKING_FEE)
            .findFirst()
            .orElseThrow();
        assertThat(finalFee.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(parkingSessionRepository.findById(session.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSession.SessionStatus.COMPLETED);
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
    void bookingEntryAndSessionLookupShouldUseCanonicalPlateComparison() throws Exception {
        User staff = createUser("staff-plate-entry", Role.RoleName.STAFF);
        User driver = createUser("driver-plate-entry", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Plate Entry Tower");
        staff = assignBuilding(staff, building);
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

        // Exit da bo QR hoan toan - staff xac minh bang bien so OCR/nhap tay (xem
        // processExit's plateVerified). Bien khong khop -> tu choi; bien khop
        // (kieu goc/co dau cham deu duoc canonical hoa) -> cho ra thanh cong.
        mockMvc.perform(post("/api/v1/sessions/{id}/exit", activeSession.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "licensePlate": "51A-99998",
                      "staffUserId": %d
                    }
                    """.formatted(exitGate.getId(), staff.getUserId())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));

        assertThat(parkingSessionRepository.findById(activeSession.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSession.SessionStatus.ACTIVE);

        mockMvc.perform(post("/api/v1/sessions/{id}/exit", activeSession.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "licensePlate": "51A-999.99",
                      "staffUserId": %d
                    }
                    """.formatted(exitGate.getId(), staff.getUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            // Vao-ra tuc thi => phi = 0d => tu dong hoan tat, khong dung o
            // WAITING_PAYMENT (tinh nang co san, khong phai loi).
            .andExpect(jsonPath("$.data.status").value("COMPLETED"));
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
            // Vao-ra tuc thi => phi = 0d => tu dong hoan tat, khong dung o
            // WAITING_PAYMENT (tinh nang co san, khong phai loi).
            .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    @WithMockUser(username = "driver-cancel-window-ok", roles = "DRIVER")
    void confirmedBookingShouldAllowCancelWithinTenMinutesAfterDepositPayment() throws Exception {
        User driver = createUser("driver-cancel-window-ok", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Cancel Window Tower");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Cancel Window Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Cancel Window Zone");
        ParkingSlot slot = createSlot(zone, "CW-01", ParkingSlot.Status.RESERVED);
        Vehicle vehicle = createVehicle(driver, vehicleType, "70A-12345");
        Booking booking = createConfirmedBooking(driver, vehicle, slot, LocalDateTime.now().minusMinutes(9));

        mockMvc.perform(put("/api/v1/bookings/{id}/cancel", booking.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        assertThat(bookingRepository.findById(booking.getId()).orElseThrow().getStatus())
            .isEqualTo(Booking.BookingStatus.CANCELLED);
        assertThat(parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.AVAILABLE);
    }

    @Test
    @WithMockUser(username = "driver-cancel-window-block", roles = "DRIVER")
    void confirmedBookingShouldAllowCancelAfterTenMinutesButForfeitDeposit() throws Exception {
        // Dung theo dung BR: driver van duoc huy booking CONFIRMED cho den luc
        // check-in, chi khac la sau 10 phut ke tu luc coc duoc thanh toan thi
        // khong duoc hoan coc (mat coc) - khong phai bi tu choi huy.
        User driver = createUser("driver-cancel-window-block", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("No Show Tower");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("No Show Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "No Show Zone");
        ParkingSlot slot = createSlot(zone, "NS-01", ParkingSlot.Status.RESERVED);
        Vehicle vehicle = createVehicle(driver, vehicleType, "71A-54321");
        Booking booking = createConfirmedBooking(driver, vehicle, slot, LocalDateTime.now().minusMinutes(11));

        mockMvc.perform(put("/api/v1/bookings/{id}/cancel", booking.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        assertThat(bookingRepository.findById(booking.getId()).orElseThrow().getStatus())
            .isEqualTo(Booking.BookingStatus.CANCELLED);
        assertThat(parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.AVAILABLE);
    }

    @Test
    @WithMockUser(username = "staff-exception-close", roles = "STAFF")
    void exceptionLifecycleShouldRequireResolvedBeforeClose() throws Exception {
        User staff = createUser("staff-exception-close", Role.RoleName.STAFF);
        assignBuilding(staff, createBuilding("Exception Close Tower"));
        ExceptionCase exceptionCase = createExceptionCase(
            ExceptionCase.ExceptionType.PLATE_UNVERIFIED,
            ExceptionCase.ExceptionStatus.OPEN,
            null,
            101
        );

        // Chua assign cho staff nao thi phai bi tu choi truoc khi kip cham toi
        // kiem tra trang thai RESOLVED (enforceAssignedStaff chay truoc).
        mockMvc.perform(put("/api/v1/exceptions/{id}/assign", exceptionCase.getExceptionId())
                .param("staffId", String.valueOf(staff.getUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"));

        // Da assign cho dung staff nay nhung chua RESOLVED -> phai bi tu choi 400.
        mockMvc.perform(put("/api/v1/exceptions/{id}/close", exceptionCase.getExceptionId()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));

        mockMvc.perform(put("/api/v1/exceptions/{id}/resolve", exceptionCase.getExceptionId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("RESOLVED"));

        mockMvc.perform(put("/api/v1/exceptions/{id}/close", exceptionCase.getExceptionId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("CLOSED"));

        mockMvc.perform(get("/api/v1/exceptions/status/CLOSED"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].exceptionId").value(exceptionCase.getExceptionId()))
            .andExpect(jsonPath("$.data[0].status").value("CLOSED"));
    }

    @Test
    void schedulerShouldExpirePendingPaymentBookingWhenExpiredAtPassed() {
        User driver = createUser("driver-expire-pending", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Pending Expire Tower");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Pending Expire Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Pending Expire Zone");
        ParkingSlot slot = createSlot(zone, "PE-01", ParkingSlot.Status.AVAILABLE);
        Vehicle vehicle = createVehicle(driver, vehicleType, "52A-12345");

        Booking booking = Booking.builder()
            .userId(driver.getUserId().longValue())
            .vehicle(vehicle)
            .slot(slot)
            .bookingStartTime(LocalDateTime.now().plusHours(1))
            .bookingEndTime(LocalDateTime.now().plusHours(3))
            .reservedAt(LocalDateTime.now().minusMinutes(20))
            .expiredAt(LocalDateTime.now().minusMinutes(5))
            .depositAmount(BigDecimal.ZERO)
            .status(Booking.BookingStatus.PENDING_PAYMENT)
            .build();
        booking = bookingRepository.save(booking);

        bookingScheduler.expirePendingPayment();

        Booking expiredBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(expiredBooking.getStatus()).isEqualTo(Booking.BookingStatus.EXPIRED);
        assertThat(parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.AVAILABLE);
    }

    @Test
    void schedulerShouldExpireConfirmedNoShowAndReleaseReservedSlot() {
        User driver = createUser("driver-expire-confirmed", Role.RoleName.DRIVER);
        ParkingBuilding building = createBuilding("Confirmed Expire Tower");
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Confirmed Expire Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Confirmed Expire Zone");
        ParkingSlot slot = createSlot(zone, "CE-01", ParkingSlot.Status.RESERVED);
        Vehicle vehicle = createVehicle(driver, vehicleType, "53A-54321");

        Booking booking = Booking.builder()
            .userId(driver.getUserId().longValue())
            .vehicle(vehicle)
            .slot(slot)
            .bookingStartTime(LocalDateTime.now().minusMinutes(31))
            .bookingEndTime(LocalDateTime.now().plusHours(1))
            .reservedAt(LocalDateTime.now().minusHours(1))
            .expiredAt(LocalDateTime.now().plusHours(1))
            .qrToken(qrTokenUtil.generateQrToken(999L, vehicle.getLicensePlate(), slot.getId(), LocalDateTime.now().plusHours(1)))
            .qrIssuedAt(LocalDateTime.now().minusHours(1))
            .depositAmount(new BigDecimal("10000"))
            .depositPaidAt(LocalDateTime.now().minusHours(1))
            .status(Booking.BookingStatus.CONFIRMED)
            .build();
        booking = bookingRepository.save(booking);
        booking.setQrToken(qrTokenUtil.generateQrToken(booking.getId(), vehicle.getLicensePlate(), slot.getId(), LocalDateTime.now().plusHours(1)));
        bookingRepository.save(booking);

        bookingScheduler.expireConfirmedNoShow();

        Booking expiredBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(expiredBooking.getStatus()).isEqualTo(Booking.BookingStatus.EXPIRED);
        assertThat(parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.AVAILABLE);
    }

    @Test
    @WithMockUser(username = "staff-ocr-review", roles = "STAFF")
    void lowConfidenceScanShouldEnterManualReviewAndBeStaffApproved() throws Exception {
        User staff = createUser("staff-ocr-review", Role.RoleName.STAFF);
        ParkingBuilding building = createBuilding("OCR Review Tower");
        Gate gate = createGate(building, "OCR-ENTRY", Gate.GateType.ENTRY);

        mockMvc.perform(post("/api/v1/ocr/scan")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "triggerType": "ENTRY",
                      "detectedPlate": "29-Y3-036.5B",
                      "confidenceScore": 0.81,
                      "imagePath": "uploads/ocr/manual-review.jpg"
                    }
                    """.formatted(gate.getId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.processStatus").value("MANUAL_REVIEW"))
            .andExpect(jsonPath("$.data.detectedPlate").value("29-Y3-036.5B"));

        OcrScan pendingScan = ocrScanRepository.findAll().get(0);
        assertThat(pendingScan.getProcessStatus()).isEqualTo(OcrScan.ProcessStatus.MANUAL_REVIEW);

        mockMvc.perform(get("/api/v1/ocr/pending-reviews"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].scanId").value(pendingScan.getId()))
            .andExpect(jsonPath("$.data[0].processStatus").value("MANUAL_REVIEW"));

        mockMvc.perform(put("/api/v1/ocr/{scanId}/review", pendingScan.getId())
                .param("correctedPlate", "29-Y3-036.58")
                .param("staffUserId", staff.getUserId().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.processStatus").value("STAFF_APPROVED"))
            .andExpect(jsonPath("$.data.isCorrected").value(true))
            .andExpect(jsonPath("$.data.correctedPlate").value("29-Y3-036.58"))
            .andExpect(jsonPath("$.data.effectivePlate").value("29-Y3-036.58"));

        OcrScan approvedScan = ocrScanRepository.findById(pendingScan.getId()).orElseThrow();
        assertThat(approvedScan.getProcessStatus()).isEqualTo(OcrScan.ProcessStatus.STAFF_APPROVED);
        assertThat(approvedScan.getCorrectedByUserId()).isEqualTo(staff.getUserId().longValue());
        assertThat(approvedScan.getCorrectedAt()).isNotNull();

        mockMvc.perform(get("/api/v1/ocr/pending-reviews"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @WithMockUser(username = "staff-ocr-failed", roles = "STAFF")
    void failedScanShouldBeStoredAndSkippedFromPendingReviewQueue() throws Exception {
        ParkingBuilding building = createBuilding("OCR Failed Tower");
        Gate gate = createGate(building, "OCR-FAIL", Gate.GateType.ENTRY);

        mockMvc.perform(post("/api/v1/ocr/scan")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "triggerType": "ENTRY",
                      "imagePath": "uploads/ocr/failed.jpg"
                    }
                    """.formatted(gate.getId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.processStatus").value("FAILED"))
            .andExpect(jsonPath("$.data.detectedPlate").doesNotExist());

        OcrScan failedScan = ocrScanRepository.findAll().get(0);
        assertThat(failedScan.getProcessStatus()).isEqualTo(OcrScan.ProcessStatus.FAILED);

        mockMvc.perform(get("/api/v1/ocr/{scanId}", failedScan.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.scanId").value(failedScan.getId()))
            .andExpect(jsonPath("$.data.processStatus").value("FAILED"));

        mockMvc.perform(get("/api/v1/ocr/pending-reviews"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @WithMockUser(username = "staff-ocr-correct-after-auto", roles = "STAFF")
    void autoApprovedScanShouldBecomeCorrectedAfterApprovalWhenStaffChangesPlate() throws Exception {
        User staff = createUser("staff-ocr-correct-after-auto", Role.RoleName.STAFF);
        ParkingBuilding building = createBuilding("OCR Auto Tower");
        Gate gate = createGate(building, "OCR-AUTO", Gate.GateType.ENTRY);

        mockMvc.perform(post("/api/v1/ocr/scan")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "gateId": %d,
                      "triggerType": "ENTRY",
                      "detectedPlate": "30G-493.4A",
                      "confidenceScore": 0.99,
                      "imagePath": "uploads/ocr/auto-approved.jpg"
                    }
                    """.formatted(gate.getId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.processStatus").value("AUTO_APPROVED"));

        OcrScan autoApprovedScan = ocrScanRepository.findAll().get(0);

        mockMvc.perform(put("/api/v1/ocr/{scanId}/review", autoApprovedScan.getId())
                .param("correctedPlate", "30G-493.44")
                .param("staffUserId", staff.getUserId().toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.processStatus").value("CORRECTED_AFTER_APPROVAL"))
            .andExpect(jsonPath("$.data.isCorrected").value(true))
            .andExpect(jsonPath("$.data.effectivePlate").value("30G-493.44"));

        OcrScan correctedScan = ocrScanRepository.findById(autoApprovedScan.getId()).orElseThrow();
        assertThat(correctedScan.getProcessStatus()).isEqualTo(OcrScan.ProcessStatus.CORRECTED_AFTER_APPROVAL);
        assertThat(correctedScan.getCorrectedPlate()).isEqualTo("30G-493.44");
    }

    @Test
    @WithMockUser(username = "staff-payment-failed", roles = "STAFF")
    void pendingDepositShouldBeMarkableAsFailedAndAllowRecreate() throws Exception {
        User driver = createUser("driver-payment-failed", Role.RoleName.DRIVER);
        User staff = createUser("staff-payment-failed", Role.RoleName.STAFF);
        ParkingBuilding building = createBuilding("Failed Payment Tower");
        assignBuilding(staff, building);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Failed Payment Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Failed Payment Zone");
        ParkingSlot slot = createSlot(zone, "FP-01", ParkingSlot.Status.AVAILABLE);
        Vehicle vehicle = createVehicle(driver, vehicleType, "77A-12345");

        Booking booking = Booking.builder()
            .userId(driver.getUserId().longValue())
            .vehicle(vehicle)
            .slot(slot)
            .bookingStartTime(LocalDateTime.now().plusHours(1))
            .bookingEndTime(LocalDateTime.now().plusHours(2))
            .reservedAt(LocalDateTime.now())
            .expiredAt(LocalDateTime.now().plusMinutes(15))
            .depositAmount(new BigDecimal("10000"))
            .status(Booking.BookingStatus.PENDING_PAYMENT)
            .build();
        booking = bookingRepository.save(booking);

        mockMvc.perform(post("/api/v1/payments/deposit")
                .param("bookingId", booking.getId().toString())
                .param("depositAmount", "10000")
                .param("paymentMethod", Payment.PaymentMethod.CASH.name()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.paymentStatus").value("PENDING"));

        Payment pendingPayment = paymentRepository.findAll().get(0);

        mockMvc.perform(put("/api/v1/payments/{paymentId}/fail", pendingPayment.getPaymentId())
                .param("transactionRef", "FAIL-DEPOSIT-001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.paymentStatus").value("FAILED"))
            .andExpect(jsonPath("$.data.transactionRef").value("FAIL-DEPOSIT-001"));

        Payment failedPayment = paymentRepository.findById(pendingPayment.getPaymentId()).orElseThrow();
        assertThat(failedPayment.getPaymentStatus()).isEqualTo(Payment.PaymentStatus.FAILED);
        assertThat(bookingRepository.findById(booking.getId()).orElseThrow().getStatus())
            .isEqualTo(Booking.BookingStatus.PENDING_PAYMENT);
        assertThat(parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.AVAILABLE);

        mockMvc.perform(post("/api/v1/payments/deposit")
                .param("bookingId", booking.getId().toString())
                .param("depositAmount", "10000")
                .param("paymentMethod", Payment.PaymentMethod.CASH.name()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.paymentStatus").value("PENDING"));

        assertThat(paymentRepository.findAll()).hasSize(2);
        assertThat(paymentRepository.findAll().stream()
                .filter(payment -> payment.getPaymentStatus() == Payment.PaymentStatus.PENDING)
                .count())
            .isEqualTo(1);
    }

    @Test
    @WithMockUser(username = "staff-payment-refund", roles = "STAFF")
    void paidDepositShouldBeRefundableAfterBookingCancelled() throws Exception {
        User driver = createUser("driver-payment-refund", Role.RoleName.DRIVER);
        User staff = createUser("staff-payment-refund", Role.RoleName.STAFF);
        ParkingBuilding building = createBuilding("Refund Payment Tower");
        assignBuilding(staff, building);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("Refund Payment Car", VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "Refund Payment Zone");
        ParkingSlot slot = createSlot(zone, "RF-01", ParkingSlot.Status.AVAILABLE);
        Vehicle vehicle = createVehicle(driver, vehicleType, "78A-54321");

        Booking booking = Booking.builder()
            .userId(driver.getUserId().longValue())
            .vehicle(vehicle)
            .slot(slot)
            .bookingStartTime(LocalDateTime.now().plusHours(1))
            .bookingEndTime(LocalDateTime.now().plusHours(3))
            .reservedAt(LocalDateTime.now())
            .expiredAt(LocalDateTime.now().plusMinutes(15))
            .depositAmount(new BigDecimal("10000"))
            .status(Booking.BookingStatus.PENDING_PAYMENT)
            .build();
        booking = bookingRepository.save(booking);

        mockMvc.perform(post("/api/v1/payments/deposit")
                .param("bookingId", booking.getId().toString())
                .param("depositAmount", "10000")
                .param("paymentMethod", Payment.PaymentMethod.CASH.name()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.paymentStatus").value("PENDING"));

        Payment depositPayment = paymentRepository.findAll().get(0);

        mockMvc.perform(put("/api/v1/payments/deposit/{paymentId}/confirm", depositPayment.getPaymentId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.paymentStatus").value("PAID"));

        Booking confirmedBooking = bookingRepository.findById(booking.getId()).orElseThrow();
        assertThat(confirmedBooking.getStatus()).isEqualTo(Booking.BookingStatus.CONFIRMED);
        assertThat(parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.RESERVED);

        confirmedBooking.setStatus(Booking.BookingStatus.CANCELLED);
        bookingRepository.save(confirmedBooking);
        ParkingSlot releasedSlot = parkingSlotRepository.findById(slot.getId()).orElseThrow();
        releasedSlot.setStatus(ParkingSlot.Status.AVAILABLE);
        parkingSlotRepository.save(releasedSlot);

        mockMvc.perform(put("/api/v1/payments/{paymentId}/refund", depositPayment.getPaymentId())
                .param("transactionRef", "REFUND-DEPOSIT-001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.paymentStatus").value("REFUNDED"))
            .andExpect(jsonPath("$.data.transactionRef").value("REFUND-DEPOSIT-001"));

        Payment refundedPayment = paymentRepository.findById(depositPayment.getPaymentId()).orElseThrow();
        assertThat(refundedPayment.getPaymentStatus()).isEqualTo(Payment.PaymentStatus.REFUNDED);
        assertThat(bookingRepository.findById(booking.getId()).orElseThrow().getStatus())
            .isEqualTo(Booking.BookingStatus.CANCELLED);
        assertThat(parkingSlotRepository.findById(slot.getId()).orElseThrow().getStatus())
            .isEqualTo(ParkingSlot.Status.AVAILABLE);
    }

    private Booking createConfirmedBooking(User driver, Vehicle vehicle, ParkingSlot slot) {
        return createConfirmedBooking(driver, vehicle, slot, LocalDateTime.now());
    }

    private Booking createConfirmedBooking(User driver, Vehicle vehicle, ParkingSlot slot, LocalDateTime depositPaidAt) {
        LocalDateTime now = depositPaidAt;
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
                .depositPaidAt(depositPaidAt)
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

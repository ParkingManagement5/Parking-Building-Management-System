package com.swp391.parking.integration;

import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.Gate;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Xac nhan 2 toa nha voi bang gia KHAC NHAU tinh phi DUNG va DOC LAP (khong
 * bi tran/lan sang nhau) - bao phu ca 4 hinh thuc HOURLY / DAILY / WEEKLY /
 * MONTHLY, ca WEEKDAY lan WEEKEND, split qua ranh gioi ngay/dem, va phan phi
 * phat sinh khi qua han goi (overstay) co/khong nam trong grace period.
 *
 * Dung MANAGER role (khong phai STAFF) de goi /payments/parking-fee vi
 * PaymentController chi enforce building-scope cho STAFF - MANAGER duoc bo
 * qua nen 1 test method co the thao tac ca 2 toa cung luc ma khong can tao
 * rieng tung staff gan dung building.
 */
@WithMockUser(username = "manager-pricing-test", roles = "MANAGER")
class PricingByBuildingIntegrationTest extends AbstractIntegrationTestSupport {

    private static final LocalDateTime EFFECTIVE_FROM = LocalDateTime.of(2020, 1, 1, 0, 0);

    private record TwoBuildings(ParkingBuilding buildingA, ParkingBuilding buildingB, VehicleType vehicleType) {}

    private TwoBuildings setupTwoBuildingsWithPricing(String suffix) {
        ParkingBuilding buildingA = createBuilding("PBB Tower A " + suffix);
        ParkingBuilding buildingB = createBuilding("PBB Tower B " + suffix);
        VehicleType vehicleType = createVehicleType("PBB Car " + suffix, VehicleType.SlotSize.MEDIUM);

        // Building A: gia "re" hon Building B o moi hinh thuc, de moi sai lech
        // (vd lay nham gia toa kia) deu lam sai so tien va bi test bat duoc.
        savePolicy(vehicleType, buildingA, "WEEKDAY", "HOURLY", 6, 22, "15000");
        savePolicy(vehicleType, buildingA, "WEEKDAY", "HOURLY", 22, 6, "10000");
        savePolicy(vehicleType, buildingA, "WEEKEND", "HOURLY", null, null, "20000");
        savePolicy(vehicleType, buildingA, "WEEKDAY", "DAILY", null, null, "100000");
        savePolicy(vehicleType, buildingA, "WEEKDAY", "WEEKLY", null, null, "600000");
        savePolicy(vehicleType, buildingA, "WEEKDAY", "MONTHLY", null, null, "2000000");

        savePolicy(vehicleType, buildingB, "WEEKDAY", "HOURLY", 6, 22, "25000");
        savePolicy(vehicleType, buildingB, "WEEKDAY", "HOURLY", 22, 6, "18000");
        savePolicy(vehicleType, buildingB, "WEEKEND", "HOURLY", null, null, "35000");
        savePolicy(vehicleType, buildingB, "WEEKDAY", "DAILY", null, null, "180000");
        savePolicy(vehicleType, buildingB, "WEEKDAY", "WEEKLY", null, null, "1000000");
        savePolicy(vehicleType, buildingB, "WEEKDAY", "MONTHLY", null, null, "3500000");

        return new TwoBuildings(buildingA, buildingB, vehicleType);
    }

    private void savePolicy(VehicleType vt, ParkingBuilding building, String dayType, String timeType,
                             Integer startHour, Integer endHour, String pricePerHour) {
        pricingPolicyRepository.save(PricingPolicy.builder()
                .vehicleType(vt)
                .building(building)
                .dayType(dayType)
                .timeType(timeType)
                .startHour(startHour)
                .endHour(endHour)
                .pricePerHour(new BigDecimal(pricePerHour))
                .effectiveFrom(EFFECTIVE_FROM)
                .isActive(true)
                .build());
    }

    private ParkingSlot buildSlot(ParkingBuilding building, VehicleType vt, String suffix, String slotCode) {
        var floor = createFloor(building, 1);
        var zone = createZone(floor, vt, "Zone " + slotCode + " " + suffix);
        return createSlot(zone, slotCode, ParkingSlot.Status.OCCUPIED);
    }

    private ParkingSession buildWalkInSession(User user, Vehicle vehicle, ParkingSlot slot, Gate gate,
                                              LocalDateTime entry, LocalDateTime exit) {
        ParkingSession session = ParkingSession.builder()
                .slot(slot)
                .userId(user.getUserId().longValue())
                .vehicle(vehicle)
                .entryGate(gate)
                .entryTime(entry)
                .exitTime(exit)
                .entryMode(ParkingSession.EntryMode.WALK_IN_MANUAL)
                .status(ParkingSession.SessionStatus.WAITING_PAYMENT)
                .build();
        return parkingSessionRepository.save(session);
    }

    private Booking buildPackageBooking(User driver, Vehicle vehicle, ParkingSlot slot, String bookingType,
                                        LocalDateTime start, LocalDateTime end) {
        Booking booking = Booking.builder()
                .userId(driver.getUserId().longValue())
                .vehicle(vehicle)
                .slot(slot)
                .bookingStartTime(start)
                .bookingEndTime(end)
                .bookingType(bookingType)
                .reservedAt(start)
                .expiredAt(end)
                .depositAmount(BigDecimal.ZERO)
                .status(Booking.BookingStatus.CONFIRMED)
                .build();
        return bookingRepository.save(booking);
    }

    private ParkingSession buildPackageSession(User user, Vehicle vehicle, ParkingSlot slot, Gate gate,
                                               Booking booking, LocalDateTime entry, LocalDateTime exit) {
        ParkingSession session = ParkingSession.builder()
                .slot(slot)
                .booking(booking)
                .userId(user.getUserId().longValue())
                .vehicle(vehicle)
                .entryGate(gate)
                .entryTime(entry)
                .exitTime(exit)
                .entryMode(ParkingSession.EntryMode.BOOKING)
                .status(ParkingSession.SessionStatus.WAITING_PAYMENT)
                .build();
        return parkingSessionRepository.save(session);
    }

    private org.springframework.test.web.servlet.ResultActions callParkingFee(Long sessionId) throws Exception {
        return mockMvc.perform(post("/api/v1/payments/parking-fee")
                .contentType(MediaType.APPLICATION_JSON)
                .param("sessionId", sessionId.toString())
                .param("totalAmount", "999999") // gia tri client gui co tinh danh lac - server phai tu tinh lai, khong duoc dung so nay
                .param("paymentMethod", "CASH"));
    }

    // ── HOURLY: cung khung gio ngay, khac toa ⇒ khac gia, khong tran ─────────

    @Test
    void hourlyFeeShouldDifferByBuildingForSameDurationDayWindow() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("H1");
        Gate gateA = createGate(b.buildingA(), "GATE-H1-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-H1-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-h1", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51H-00001");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51H-00002");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "H1", "H1-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "H1", "H1-B-01");

        // 2026-06-30 (Thu Ba - WEEKDAY) 08:00 -> 10:00, ca khoang deu nam trong
        // khung ngay 6h-22h, khong cat qua ranh gioi nao.
        // grace=10p -> tinh tu 08:10; 08:10->10:00 = 110p; block=30p => 4 block
        LocalDateTime entry = LocalDateTime.of(2026, 6, 30, 8, 0);
        LocalDateTime exit = LocalDateTime.of(2026, 6, 30, 10, 0);

        ParkingSession sessionA = buildWalkInSession(driver, vehicleA, slotA, gateA, entry, exit);
        ParkingSession sessionB = buildWalkInSession(driver, vehicleB, slotB, gateB, entry, exit);

        // Building A: rate=15000 -> perBlock=7500 x 4 = 30000
        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appliedRate").value(15000))
                .andExpect(jsonPath("$.data.baseFee").value(30000))
                .andExpect(jsonPath("$.data.totalAmount").value(30000));

        // Building B: rate=25000 -> perBlock=12500 x 4 = 50000 (KHONG duoc la 30000 cua toa A)
        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appliedRate").value(25000))
                .andExpect(jsonPath("$.data.baseFee").value(50000))
                .andExpect(jsonPath("$.data.totalAmount").value(50000));
    }

    // ── HOURLY: cat qua ranh gioi ngay/dem, moi toa mot gia khac nhau ────────

    @Test
    void hourlyFeeShouldSplitAcrossDayNightBoundaryPerBuilding() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("H2");
        Gate gateA = createGate(b.buildingA(), "GATE-H2-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-H2-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-h2", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51H-00003");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51H-00004");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "H2", "H2-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "H2", "H2-B-01");

        // 20:50 -> 22:40 (WEEKDAY): grace 10p -> tinh tu 21:00.
        // Doan 1: 21:00->22:00 (ngay, 60p = 2 block)
        // Doan 2: 22:00->22:40 (dem, 40p = 2 block, vi ceil(40/30)=2)
        LocalDateTime entry = LocalDateTime.of(2026, 6, 30, 20, 50);
        LocalDateTime exit = LocalDateTime.of(2026, 6, 30, 22, 40);

        ParkingSession sessionA = buildWalkInSession(driver, vehicleA, slotA, gateA, entry, exit);
        ParkingSession sessionB = buildWalkInSession(driver, vehicleB, slotB, gateB, entry, exit);

        // A: ngay 15000 -> 7500x2=15000; dem 10000 -> 5000x2=10000 => tong 25000
        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(25000));

        // B: ngay 25000 -> 12500x2=25000; dem 18000 -> 9000x2=18000 => tong 43000
        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(43000));
    }

    // ── HOURLY: WEEKEND (dayType rieng), moi toa mot gia ─────────────────────

    @Test
    void hourlyFeeShouldUseWeekendRatePerBuilding() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("H3");
        Gate gateA = createGate(b.buildingA(), "GATE-H3-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-H3-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-h3", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51H-00005");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51H-00006");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "H3", "H3-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "H3", "H3-B-01");

        // 2026-07-04 la Thu Bay (WEEKEND). 10:00 -> 12:00; grace 10p -> tu 10:10.
        // 10:10->12:00 = 110p => 4 block.
        LocalDateTime entry = LocalDateTime.of(2026, 7, 4, 10, 0);
        LocalDateTime exit = LocalDateTime.of(2026, 7, 4, 12, 0);

        ParkingSession sessionA = buildWalkInSession(driver, vehicleA, slotA, gateA, entry, exit);
        ParkingSession sessionB = buildWalkInSession(driver, vehicleB, slotB, gateB, entry, exit);

        // A: WEEKEND rate=20000 -> perBlock=10000 x4=40000
        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appliedRate").value(20000))
                .andExpect(jsonPath("$.data.baseFee").value(40000));

        // B: WEEKEND rate=35000 -> perBlock=17500 x4=70000
        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.appliedRate").value(35000))
                .andExpect(jsonPath("$.data.baseFee").value(70000));
    }

    // ── DAILY package: 1 don vi, dung han, moi toa mot gia flat ─────────────

    @Test
    void dailyPackageFeeShouldChargeFlatRatePerBuilding() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("D1");
        Gate gateA = createGate(b.buildingA(), "GATE-D1-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-D1-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-d1", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51D-00001");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51D-00002");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "D1", "D1-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "D1", "D1-B-01");

        LocalDateTime start = LocalDateTime.of(2026, 6, 30, 9, 0);
        LocalDateTime end = start.plusDays(1); // dung 1 don vi DAILY, ra dung gio hen -> khong overstay

        Booking bookingA = buildPackageBooking(driver, vehicleA, slotA, "DAILY", start, end);
        Booking bookingB = buildPackageBooking(driver, vehicleB, slotB, "DAILY", start, end);
        ParkingSession sessionA = buildPackageSession(driver, vehicleA, slotA, gateA, bookingA, start, end);
        ParkingSession sessionB = buildPackageSession(driver, vehicleB, slotB, gateB, bookingB, start, end);

        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(100000))
                .andExpect(jsonPath("$.data.totalAmount").value(100000));

        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(180000))
                .andExpect(jsonPath("$.data.totalAmount").value(180000));
    }

    // ── DAILY package: nhieu don vi (3 ngay) - phai nhan dung so don vi ──────

    @Test
    void dailyPackageFeeShouldMultiplyByDurationUnits() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("D2");
        Gate gateA = createGate(b.buildingA(), "GATE-D2-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-D2-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-d2", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51D-00003");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51D-00004");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "D2", "D2-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "D2", "D2-B-01");

        LocalDateTime start = LocalDateTime.of(2026, 6, 30, 9, 0);
        LocalDateTime end = start.plusDays(3); // 3 don vi DAILY

        Booking bookingA = buildPackageBooking(driver, vehicleA, slotA, "DAILY", start, end);
        Booking bookingB = buildPackageBooking(driver, vehicleB, slotB, "DAILY", start, end);
        ParkingSession sessionA = buildPackageSession(driver, vehicleA, slotA, gateA, bookingA, start, end);
        ParkingSession sessionB = buildPackageSession(driver, vehicleB, slotB, gateB, bookingB, start, end);

        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(300000)); // 100000 x 3

        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(540000)); // 180000 x 3
    }

    // ── WEEKLY package: 1 don vi, moi toa mot gia flat ───────────────────────

    @Test
    void weeklyPackageFeeShouldChargeFlatRatePerBuilding() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("W1");
        Gate gateA = createGate(b.buildingA(), "GATE-W1-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-W1-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-w1", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51W-00001");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51W-00002");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "W1", "W1-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "W1", "W1-B-01");

        LocalDateTime start = LocalDateTime.of(2026, 6, 30, 9, 0);
        LocalDateTime end = start.plusDays(7);

        Booking bookingA = buildPackageBooking(driver, vehicleA, slotA, "WEEKLY", start, end);
        Booking bookingB = buildPackageBooking(driver, vehicleB, slotB, "WEEKLY", start, end);
        ParkingSession sessionA = buildPackageSession(driver, vehicleA, slotA, gateA, bookingA, start, end);
        ParkingSession sessionB = buildPackageSession(driver, vehicleB, slotB, gateB, bookingB, start, end);

        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(600000));

        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(1000000));
    }

    // ── MONTHLY package: 1 don vi (30 ngay), moi toa mot gia flat ───────────

    @Test
    void monthlyPackageFeeShouldChargeFlatRatePerBuilding() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("M1");
        Gate gateA = createGate(b.buildingA(), "GATE-M1-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-M1-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-m1", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51M-00001");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51M-00002");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "M1", "M1-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "M1", "M1-B-01");

        LocalDateTime start = LocalDateTime.of(2026, 6, 30, 9, 0);
        LocalDateTime end = start.plusDays(30); // 1 don vi MONTHLY (backend quy uoc 30 ngay/thang)

        Booking bookingA = buildPackageBooking(driver, vehicleA, slotA, "MONTHLY", start, end);
        Booking bookingB = buildPackageBooking(driver, vehicleB, slotB, "MONTHLY", start, end);
        ParkingSession sessionA = buildPackageSession(driver, vehicleA, slotA, gateA, bookingA, start, end);
        ParkingSession sessionB = buildPackageSession(driver, vehicleB, slotB, gateB, bookingB, start, end);

        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(2000000));

        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(3500000));
    }

    // ── Overstay ngoai grace period: cong them phi gio tinh theo dung toa ────

    @Test
    void dailyPackageOverstayBeyondGracePeriodShouldAddHourlyOvertimePerBuilding() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("O1");
        Gate gateA = createGate(b.buildingA(), "GATE-O1-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-O1-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-o1", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51O-00001");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51O-00002");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "O1", "O1-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "O1", "O1-B-01");

        LocalDateTime start = LocalDateTime.of(2026, 6, 30, 9, 0);
        LocalDateTime bookingEnd = start.plusDays(1); // 2026-07-01 09:00 - van trong khung ngay 6h-22h
        LocalDateTime actualExit = bookingEnd.plusHours(2); // tre 2h so voi han goi

        Booking bookingA = buildPackageBooking(driver, vehicleA, slotA, "DAILY", start, bookingEnd);
        Booking bookingB = buildPackageBooking(driver, vehicleB, slotB, "DAILY", start, bookingEnd);
        ParkingSession sessionA = buildPackageSession(driver, vehicleA, slotA, gateA, bookingA, start, actualExit);
        ParkingSession sessionB = buildPackageSession(driver, vehicleB, slotB, gateB, bookingB, start, actualExit);

        // Overtime: grace 10p tinh tu bookingEnd -> 09:10; 09:10->11:00=110p => 4 block
        // baseFee = dung phi goi (khong gom phu troi nua - da tach rieng sang overtimeFee)
        // A: flat 100000, overtime(15000/h -> 7500x4=30000), tong 130000
        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(100000))
                .andExpect(jsonPath("$.data.overtimeFee").value(30000))
                .andExpect(jsonPath("$.data.totalAmount").value(130000));

        // B: flat 180000, overtime(25000/h -> 12500x4=50000), tong 230000
        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(180000))
                .andExpect(jsonPath("$.data.overtimeFee").value(50000))
                .andExpect(jsonPath("$.data.totalAmount").value(230000));
    }

    // ── Overstay 3 tieng (boi so dung 30p): xac nhan grace period duoc "hap
    //    thu" vao block lam tron, ra dung 6 block = dung 3 tieng gia goc,
    //    khong bi tinh du/thieu so voi "dem tung tieng" ────────────────────

    @Test
    void dailyPackageOverstayThreeHoursShouldBillExactSixHalfHourBlocksPerBuilding() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("O3");
        Gate gateA = createGate(b.buildingA(), "GATE-O3-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-O3-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-o3", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51O-00005");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51O-00006");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "O3", "O3-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "O3", "O3-B-01");

        LocalDateTime start = LocalDateTime.of(2026, 6, 30, 9, 0);
        LocalDateTime bookingEnd = start.plusDays(1); // 2026-07-01 09:00 - van trong khung ngay 6h-22h
        LocalDateTime actualExit = bookingEnd.plusHours(3); // tre dung 3h so voi han goi

        Booking bookingA = buildPackageBooking(driver, vehicleA, slotA, "DAILY", start, bookingEnd);
        Booking bookingB = buildPackageBooking(driver, vehicleB, slotB, "DAILY", start, bookingEnd);
        ParkingSession sessionA = buildPackageSession(driver, vehicleA, slotA, gateA, bookingA, start, actualExit);
        ParkingSession sessionB = buildPackageSession(driver, vehicleB, slotB, gateB, bookingB, start, actualExit);

        // Overtime: grace 10p tinh tu bookingEnd -> tinh tu 09:10; 09:10->12:00=170p
        // => ceil(170/30)=6 block (grace 10p bi "an" vao phan lam tron len, ket
        // qua dung bang 3h tron gia goc - khong hon khong kem "dem tung tieng").
        // baseFee = dung phi goi (khong gom phu troi - da tach rieng sang overtimeFee)
        // A: flat 100000, overtime(15000/h -> 7500x6=45000), tong 145000
        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(100000))
                .andExpect(jsonPath("$.data.overtimeFee").value(45000))
                .andExpect(jsonPath("$.data.totalAmount").value(145000));

        // B: flat 180000, overtime(25000/h -> 12500x6=75000), tong 255000
        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(180000))
                .andExpect(jsonPath("$.data.overtimeFee").value(75000))
                .andExpect(jsonPath("$.data.totalAmount").value(255000));
    }

    // ── Overstay TRONG grace period: khong duoc cong them phi gio ────────────

    @Test
    void dailyPackageOverstayWithinGracePeriodShouldNotAddOvertimeFee() throws Exception {
        TwoBuildings b = setupTwoBuildingsWithPricing("O2");
        Gate gateA = createGate(b.buildingA(), "GATE-O2-A", Gate.GateType.ENTRY);
        Gate gateB = createGate(b.buildingB(), "GATE-O2-B", Gate.GateType.ENTRY);
        User driver = createUser("driver-o2", Role.RoleName.DRIVER);
        Vehicle vehicleA = createVehicle(driver, b.vehicleType(), "51O-00003");
        Vehicle vehicleB = createVehicle(driver, b.vehicleType(), "51O-00004");
        ParkingSlot slotA = buildSlot(b.buildingA(), b.vehicleType(), "O2", "O2-A-01");
        ParkingSlot slotB = buildSlot(b.buildingB(), b.vehicleType(), "O2", "O2-B-01");

        LocalDateTime start = LocalDateTime.of(2026, 6, 30, 9, 0);
        LocalDateTime bookingEnd = start.plusDays(1);
        LocalDateTime actualExit = bookingEnd.plusMinutes(5); // tre 5p - trong grace period (10p)

        Booking bookingA = buildPackageBooking(driver, vehicleA, slotA, "DAILY", start, bookingEnd);
        Booking bookingB = buildPackageBooking(driver, vehicleB, slotB, "DAILY", start, bookingEnd);
        ParkingSession sessionA = buildPackageSession(driver, vehicleA, slotA, gateA, bookingA, start, actualExit);
        ParkingSession sessionB = buildPackageSession(driver, vehicleB, slotB, gateB, bookingB, start, actualExit);

        // Tre trong grace -> overtime = 0 -> fee = dung flat rate cua tung toa, khong hon
        callParkingFee(sessionA.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(100000));

        callParkingFee(sessionB.getId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.baseFee").value(180000));
    }
}

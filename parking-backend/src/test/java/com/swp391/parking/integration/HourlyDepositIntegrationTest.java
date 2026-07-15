package com.swp391.parking.integration;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.response.BookingResponse;
import com.swp391.parking.entity.Floor;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.service.BookingService;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tai hien bao cao "dat truoc toi 6 tieng van hien Mien phi" cho coc booking
 * HOURLY - goi thang qua BookingService.createBooking() that (khong mock),
 * dung vehicleType ten dung "CAR" (khop production) de xem coc thuc te server
 * tra ve co dung bang tra calculateDeposit() hay khong.
 */
class HourlyDepositIntegrationTest extends AbstractIntegrationTestSupport {

    @Autowired
    private BookingService bookingService;

    private BookingResponse createHourlyBooking(Floor floor, VehicleType carType, User driver,
                                                String slotCode, String plate, LocalDateTime startTime) {
        var zone = createZone(floor, carType, "Deposit Zone " + slotCode);
        ParkingSlot slot = createSlot(zone, slotCode, ParkingSlot.Status.AVAILABLE);
        Vehicle vehicle = createVehicle(driver, carType, plate);

        CreateBookingRequest request = new CreateBookingRequest();
        request.setVehicleId(vehicle.getId());
        request.setSlotId(slot.getId());
        request.setBookingStartTime(startTime);
        request.setBookingEndTime(startTime.plusHours(2));

        return bookingService.createBooking(driver.getUserId().longValue(), request);
    }

    @Test
    void depositShouldBe30000WhenBookedSixOrMoreHoursAheadWithRealCarTypeName() {
        ParkingBuilding building = createBuilding("Deposit Tower 6h");
        Floor floor = createFloor(building, 1);
        // vehicleType.name PHAI dung "CAR" (khong duoc them hau to) de dung
        // chuoi calculateDeposit() so sanh, mo phong dung du lieu that.
        VehicleType carType = createVehicleType("CAR", VehicleType.SlotSize.MEDIUM);
        createBuildingPricingPolicy(carType, building, true);
        User driver = createUser("driver-deposit-6h", Role.RoleName.DRIVER);

        BookingResponse response = createHourlyBooking(
                floor, carType, driver, "DEP-6H", "59D-00001", LocalDateTime.now().plusHours(7));

        assertThat(response.getDepositAmount()).isEqualByComparingTo(new BigDecimal("30000"));
    }

    @Test
    void depositShouldEscalateThroughAllTiersAsLeadTimeIncreases() {
        ParkingBuilding building = createBuilding("Deposit Tower Tiers");
        Floor floor = createFloor(building, 1);
        // Ten phai dung "CAR" (khong hau to) vi calculateDeposit() so sanh dung chuoi.
        VehicleType carType = createVehicleType("CAR", VehicleType.SlotSize.MEDIUM);
        createBuildingPricingPolicy(carType, building, true);
        User driver = createUser("driver-deposit-tiers", Role.RoleName.DRIVER);

        // 30p truoc -> tang 10-<120p -> 10000
        assertThat(createHourlyBooking(floor, carType, driver, "DEP-T1", "59D-00002",
                LocalDateTime.now().plusMinutes(30)).getDepositAmount())
                .isEqualByComparingTo(new BigDecimal("10000"));
        // 3h truoc -> tang 120-<240p -> 15000
        assertThat(createHourlyBooking(floor, carType, driver, "DEP-T2", "59D-00003",
                LocalDateTime.now().plusHours(3)).getDepositAmount())
                .isEqualByComparingTo(new BigDecimal("15000"));
        // 5h truoc -> tang 240-<360p -> 20000
        assertThat(createHourlyBooking(floor, carType, driver, "DEP-T3", "59D-00004",
                LocalDateTime.now().plusHours(5)).getDepositAmount())
                .isEqualByComparingTo(new BigDecimal("20000"));
        // Hon 6h truoc (6h05p, tranh dung moc bien 360p de khong flaky do do
        // tre vai mili-giay giua luc test tinh startTime va luc server tinh
        // "now" rieng) -> tang >=360p -> 30000 (KHONG duoc la 0/mien phi)
        assertThat(createHourlyBooking(floor, carType, driver, "DEP-T4", "59D-00005",
                LocalDateTime.now().plusHours(6).plusMinutes(5)).getDepositAmount())
                .isEqualByComparingTo(new BigDecimal("30000"));
        // 10h truoc -> van >=360p -> van 30000 (khong tang them nua, khong ve 0)
        assertThat(createHourlyBooking(floor, carType, driver, "DEP-T5", "59D-00006",
                LocalDateTime.now().plusHours(10)).getDepositAmount())
                .isEqualByComparingTo(new BigDecimal("30000"));
    }

    @Test
    void motorbikeDepositShouldAlwaysBeZeroRegardlessOfLeadTime() {
        ParkingBuilding building = createBuilding("Deposit Tower Moto");
        Floor floor = createFloor(building, 1);
        // createSlot() helper luon tao slot size MEDIUM co dinh - dung MEDIUM o
        // day de khop, vi test nay chi can ten khac "CAR"/"ELECTRIC_CAR", khong
        // can dung SMALL that su.
        VehicleType motoType = createVehicleType("MOTORBIKE-dep", VehicleType.SlotSize.MEDIUM);
        createBuildingPricingPolicy(motoType, building, true);
        User driver = createUser("driver-deposit-moto", Role.RoleName.DRIVER);

        BookingResponse response = createHourlyBooking(
                floor, motoType, driver, "DEP-MOTO", "59D-00007", LocalDateTime.now().plusHours(7));

        // Dung y thiet ke (BR-03d): MOTORBIKE khong bao gio tinh coc - day la
        // "Mien phi" DUNG, khong phai bug.
        assertThat(response.getDepositAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}

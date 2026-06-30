package com.swp391.parking.integration;

import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.support.AbstractIntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.security.test.context.support.WithMockUser;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class VNPayCreateDepositIntegrationTest extends AbstractIntegrationTestSupport {

    @Test
    @WithMockUser(username = "driver-vnpay-expired-status", roles = "DRIVER")
    void createDepositUrlShouldRejectExpiredStatusBookingWithoutCreatingPayment() throws Exception {
        User driver = createUser("driver-vnpay-expired-status", Role.RoleName.DRIVER);
        Booking booking = createBooking(driver, "VNP-EX-01", "88A-10001",
                Booking.BookingStatus.EXPIRED, LocalDateTime.now().plusMinutes(15));

        mockMvc.perform(post("/api/v1/payments/vnpay/create-deposit/{bookingId}", booking.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        assertThat(countDepositPayments(booking)).isZero();
    }

    @Test
    @WithMockUser(username = "driver-vnpay-expired-deadline", roles = "DRIVER")
    void createDepositUrlShouldRejectExpiredPendingPaymentBookingWithoutCreatingPayment() throws Exception {
        User driver = createUser("driver-vnpay-expired-deadline", Role.RoleName.DRIVER);
        Booking booking = createBooking(driver, "VNP-EX-02", "88A-10002",
                Booking.BookingStatus.PENDING_PAYMENT, LocalDateTime.now().minusMinutes(1));

        mockMvc.perform(post("/api/v1/payments/vnpay/create-deposit/{bookingId}", booking.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        assertThat(countDepositPayments(booking)).isZero();
    }

    @Test
    @WithMockUser(username = "driver-vnpay-valid", roles = "DRIVER")
    void createDepositUrlShouldCreateOrReuseOneDepositForValidPendingPaymentBooking() throws Exception {
        User driver = createUser("driver-vnpay-valid", Role.RoleName.DRIVER);
        Booking booking = createBooking(driver, "VNP-OK-01", "88A-10003",
                Booking.BookingStatus.PENDING_PAYMENT, LocalDateTime.now().plusMinutes(15));

        mockMvc.perform(post("/api/v1/payments/vnpay/create-deposit/{bookingId}", booking.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.paymentUrl").isNotEmpty())
                .andExpect(jsonPath("$.data.paymentId").isNumber());

        mockMvc.perform(post("/api/v1/payments/vnpay/create-deposit/{bookingId}", booking.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.paymentUrl").isNotEmpty())
                .andExpect(jsonPath("$.data.paymentId").isNumber());

        var deposits = paymentRepository.findByBookingId(booking.getId().intValue()).stream()
                .filter(payment -> payment.getPaymentType() == Payment.PaymentType.DEPOSIT)
                .toList();
        assertThat(deposits).hasSize(1);
        assertThat(deposits.get(0).getPaymentStatus()).isEqualTo(Payment.PaymentStatus.PENDING);
        assertThat(deposits.get(0).getPaymentMethod()).isEqualTo(Payment.PaymentMethod.VNPAY);
        assertThat(deposits.get(0).getTotalAmount()).isEqualByComparingTo("10000");
    }

    private Booking createBooking(User driver, String slotCode, String licensePlate,
                                  Booking.BookingStatus status, LocalDateTime expiredAt) {
        ParkingBuilding building = createBuilding("VNPay Deposit " + slotCode);
        var floor = createFloor(building, 1);
        VehicleType vehicleType = createVehicleType("VNPay Deposit Car " + slotCode, VehicleType.SlotSize.MEDIUM);
        var zone = createZone(floor, vehicleType, "VNPay Deposit Zone " + slotCode);
        ParkingSlot slot = createSlot(zone, slotCode, ParkingSlot.Status.AVAILABLE);
        Vehicle vehicle = createVehicle(driver, vehicleType, licensePlate);

        Booking booking = Booking.builder()
                .userId(driver.getUserId().longValue())
                .vehicle(vehicle)
                .slot(slot)
                .bookingStartTime(LocalDateTime.now().plusHours(2))
                .bookingEndTime(LocalDateTime.now().plusHours(4))
                .reservedAt(LocalDateTime.now())
                .expiredAt(expiredAt)
                .depositAmount(new BigDecimal("10000"))
                .status(status)
                .build();
        return bookingRepository.save(booking);
    }

    private long countDepositPayments(Booking booking) {
        return paymentRepository.findByBookingId(booking.getId().intValue()).stream()
                .filter(payment -> payment.getPaymentType() == Payment.PaymentType.DEPOSIT)
                .count();
    }
}

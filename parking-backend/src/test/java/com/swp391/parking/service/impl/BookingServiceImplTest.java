package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.response.BookingResponse;
import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.util.QrTokenUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class BookingServiceImplTest {

    private static final Long USER_ID = 10L;
    private static final Long VEHICLE_ID = 20L;
    private static final Long SLOT_ID = 30L;
    private static final Long BOOKING_ID = 40L;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private ParkingSlotRepository parkingSlotRepository;

    @Mock
    private QrTokenUtil qrTokenUtil;

    @InjectMocks
    private BookingServiceImpl bookingService;

    @Test
    void createBooking_shouldRejectEndTimeBeforeOrEqualStartTime() {
        LocalDateTime startTime = LocalDateTime.now().plusHours(2);

        for (LocalDateTime invalidEndTime : List.of(startTime.minusMinutes(1), startTime)) {
            CreateBookingRequest request = createBookingRequest(startTime, invalidEndTime);

            AppException exception = assertThrows(AppException.class,
                    () -> bookingService.createBooking(USER_ID, request));

            assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        }

        verifyNoInteractions(vehicleRepository, parkingSlotRepository, bookingRepository, qrTokenUtil);
    }

    @Test
    void createBooking_shouldDefaultNullEndTimeToStartTimePlusTwoHours() {
        LocalDateTime startTime = LocalDateTime.now().plusHours(3);
        CreateBookingRequest request = createBookingRequest(startTime, null);
        Vehicle vehicle = createVehicle();
        ParkingSlot slot = createSlot(ParkingSlot.Status.AVAILABLE);

        given(vehicleRepository.findById(VEHICLE_ID)).willReturn(Optional.of(vehicle));
        given(parkingSlotRepository.findById(SLOT_ID)).willReturn(Optional.of(slot));
        given(bookingRepository.findByVehicle_IdAndStatusIn(eq(VEHICLE_ID), anyList()))
                .willReturn(Optional.empty());
        given(bookingRepository.findConflictingBookings(SLOT_ID, startTime, startTime.plusHours(2)))
                .willReturn(List.of());
        given(bookingRepository.save(any(Booking.class))).willAnswer(invocation -> {
            Booking booking = invocation.getArgument(0);
            booking.setId(BOOKING_ID);
            return booking;
        });

        BookingResponse response = bookingService.createBooking(USER_ID, request);

        assertEquals(startTime.plusHours(2), response.getBookingEndTime());

        ArgumentCaptor<Booking> bookingCaptor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(bookingCaptor.capture());
        assertEquals(startTime.plusHours(2), bookingCaptor.getValue().getBookingEndTime());
    }

    @Test
    void confirmBookingAfterPayment_shouldRejectExpiredBooking() {
        Booking booking = createPendingBooking(LocalDateTime.now().plusHours(2));
        booking.setExpiredAt(LocalDateTime.now().minusMinutes(1));
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(booking));

        AppException exception = assertThrows(AppException.class,
                () -> bookingService.confirmBookingAfterPayment(BOOKING_ID));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        verify(qrTokenUtil, never()).generateQrToken(any(), any(), any(), any());
        verify(bookingRepository, never()).save(any());
        verify(parkingSlotRepository, never()).save(any());
    }

    @Test
    void confirmBookingAfterPayment_shouldGenerateQrUntilStartTimePlusThirtyMinutes() {
        LocalDateTime startTime = LocalDateTime.now().plusHours(2);
        Booking booking = createPendingBooking(startTime);
        booking.setExpiredAt(LocalDateTime.now().plusMinutes(10));
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(booking));
        given(qrTokenUtil.generateQrToken(eq(BOOKING_ID), eq("51A-12345"), eq(SLOT_ID), any()))
                .willReturn("qr-token");
        given(bookingRepository.save(any(Booking.class))).willAnswer(invocation -> invocation.getArgument(0));

        bookingService.confirmBookingAfterPayment(BOOKING_ID);

        ArgumentCaptor<LocalDateTime> qrExpiryCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(qrTokenUtil).generateQrToken(eq(BOOKING_ID), eq("51A-12345"), eq(SLOT_ID),
                qrExpiryCaptor.capture());
        assertEquals(startTime.plusMinutes(30), qrExpiryCaptor.getValue());
    }

    @Test
    void confirmBookingAfterPayment_shouldConfirmBookingAndReserveSlot() {
        Booking booking = createPendingBooking(LocalDateTime.now().plusHours(2));
        booking.setExpiredAt(LocalDateTime.now().plusMinutes(10));
        given(bookingRepository.findById(BOOKING_ID)).willReturn(Optional.of(booking));
        given(qrTokenUtil.generateQrToken(any(), any(), any(), any())).willReturn("qr-token");
        given(bookingRepository.save(any(Booking.class))).willAnswer(invocation -> invocation.getArgument(0));

        BookingResponse response = bookingService.confirmBookingAfterPayment(BOOKING_ID);

        assertEquals("CONFIRMED", response.getStatus());
        assertEquals("qr-token", response.getQrToken());
        assertEquals(ParkingSlot.Status.RESERVED, booking.getSlot().getStatus());
        assertNotNull(booking.getQrIssuedAt());
        assertEquals(booking.getQrIssuedAt(), booking.getDepositPaidAt());

        verify(parkingSlotRepository).save(booking.getSlot());
        verify(bookingRepository).save(booking);
    }

    private CreateBookingRequest createBookingRequest(LocalDateTime startTime, LocalDateTime endTime) {
        CreateBookingRequest request = new CreateBookingRequest();
        request.setVehicleId(VEHICLE_ID);
        request.setSlotId(SLOT_ID);
        request.setBookingStartTime(startTime);
        request.setBookingEndTime(endTime);
        return request;
    }

    private Booking createPendingBooking(LocalDateTime startTime) {
        return Booking.builder()
                .id(BOOKING_ID)
                .userId(USER_ID)
                .vehicle(createVehicle())
                .slot(createSlot(ParkingSlot.Status.AVAILABLE))
                .bookingStartTime(startTime)
                .bookingEndTime(startTime.plusHours(2))
                .status(Booking.BookingStatus.PENDING_PAYMENT)
                .build();
    }

    private Vehicle createVehicle() {
        return Vehicle.builder()
                .id(VEHICLE_ID)
                .userId(USER_ID)
                .vehicleType(VehicleType.builder()
                        .id(1L)
                        .name("CAR")
                        .slotSize(VehicleType.SlotSize.MEDIUM)
                        .build())
                .licensePlate("51A-12345")
                .build();
    }

    private ParkingSlot createSlot(ParkingSlot.Status status) {
        return ParkingSlot.builder()
                .id(SLOT_ID)
                .slotCode("A-01")
                .slotSize(ParkingSlot.SlotSize.MEDIUM)
                .status(status)
                .build();
    }
}

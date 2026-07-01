package com.swp391.parking.service;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.response.BookingResponse;
import java.util.List;

public interface BookingService {
    BookingResponse createBooking(Long currentUserId, CreateBookingRequest request);
    BookingResponse getBooking(Long bookingId, Long currentUserId, boolean staffScoped);
    List<BookingResponse> getMyBookings(Long currentUserId);
    BookingResponse cancelBooking(Long bookingId, Long currentUserId);
    BookingResponse confirmBookingAfterPayment(Long bookingId);
    BookingResponse verifyQrToken(String qrToken, Long currentUserId, boolean staffScoped);
    BookingResponse regenerateQr(Long bookingId, Long currentUserId);
    List<BookingResponse> searchByPlate(String licensePlate, Long currentUserId, boolean staffScoped);
}

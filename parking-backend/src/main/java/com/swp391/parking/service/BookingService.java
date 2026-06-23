package com.swp391.parking.service;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.response.BookingResponse;
import java.util.List;

public interface BookingService {
    BookingResponse createBooking(Long currentUserId, CreateBookingRequest request);
    BookingResponse getBooking(Long bookingId);
    List<BookingResponse> getMyBookings(Long currentUserId);
    BookingResponse cancelBooking(Long bookingId, Long currentUserId);
    BookingResponse confirmBookingAfterPayment(Long bookingId);
    BookingResponse verifyQrToken(String qrToken);
}

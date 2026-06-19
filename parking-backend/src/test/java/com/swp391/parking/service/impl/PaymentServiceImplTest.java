package com.swp391.parking.service.impl;

import com.swp391.parking.dto.response.PaymentResponse;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.PaymentRepository;
import com.swp391.parking.service.BookingService;
import com.swp391.parking.service.ParkingSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    private static final Integer PAYMENT_ID = 11;
    private static final Integer SESSION_ID = 22;
    private static final String TRANSACTION_REF = "txn-123";

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private BookingService bookingService;

    @Mock
    private ParkingSessionService parkingSessionService;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    @Test
    void confirmParkingFee_shouldMarkPaidAndCompleteSession() {
        Payment payment = pendingParkingFee(SESSION_ID);
        given(paymentRepository.findById(PAYMENT_ID)).willReturn(Optional.of(payment));
        given(paymentRepository.save(any(Payment.class))).willAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = paymentService.confirmParkingFee(PAYMENT_ID, TRANSACTION_REF);

        assertEquals(Payment.PaymentStatus.PAID, payment.getPaymentStatus());
        assertNotNull(payment.getPaidAt());
        assertEquals(TRANSACTION_REF, payment.getTransactionRef());
        assertEquals(Payment.PaymentStatus.PAID, response.getPaymentStatus());
        assertEquals(TRANSACTION_REF, response.getTransactionRef());
        verify(parkingSessionService).completeSessionAfterPayment(SESSION_ID.longValue());
        verify(paymentRepository).save(payment);
    }

    @Test
    void confirmParkingFee_shouldRejectMissingSessionId() {
        Payment payment = pendingParkingFee(null);
        given(paymentRepository.findById(PAYMENT_ID)).willReturn(Optional.of(payment));
        lenient().when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AppException exception = assertThrows(AppException.class,
                () -> paymentService.confirmParkingFee(PAYMENT_ID, TRANSACTION_REF));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals(Payment.PaymentStatus.PENDING, payment.getPaymentStatus());
        assertNull(payment.getPaidAt());
        assertNull(payment.getTransactionRef());
        verify(parkingSessionService, never()).completeSessionAfterPayment(any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void confirmParkingFee_shouldPropagateSessionCompletionException() {
        Payment payment = pendingParkingFee(SESSION_ID);
        given(paymentRepository.findById(PAYMENT_ID)).willReturn(Optional.of(payment));
        lenient().when(paymentRepository.save(any(Payment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        AppException completionException = new AppException(HttpStatus.BAD_REQUEST, "Session invalid");
        lenient().doThrow(completionException)
                .when(parkingSessionService).completeSessionAfterPayment(SESSION_ID.longValue());

        AppException exception = assertThrows(AppException.class,
                () -> paymentService.confirmParkingFee(PAYMENT_ID, TRANSACTION_REF));

        assertEquals(completionException, exception);
        assertEquals(Payment.PaymentStatus.PENDING, payment.getPaymentStatus());
        assertNull(payment.getPaidAt());
        assertNull(payment.getTransactionRef());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void confirmParkingFee_shouldRejectMissingPayment() {
        given(paymentRepository.findById(PAYMENT_ID)).willReturn(Optional.empty());

        AppException exception = assertThrows(AppException.class,
                () -> paymentService.confirmParkingFee(PAYMENT_ID, TRANSACTION_REF));

        assertEquals(HttpStatus.NOT_FOUND, exception.getStatus());
        verify(parkingSessionService, never()).completeSessionAfterPayment(any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    void confirmParkingFee_shouldRejectAlreadyPaidPayment() {
        Payment payment = pendingParkingFee(SESSION_ID);
        payment.setPaymentStatus(Payment.PaymentStatus.PAID);
        given(paymentRepository.findById(PAYMENT_ID)).willReturn(Optional.of(payment));

        AppException exception = assertThrows(AppException.class,
                () -> paymentService.confirmParkingFee(PAYMENT_ID, TRANSACTION_REF));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        verify(parkingSessionService, never()).completeSessionAfterPayment(any());
        verify(paymentRepository, never()).save(any());
    }

    private Payment pendingParkingFee(Integer sessionId) {
        return Payment.builder()
                .paymentId(PAYMENT_ID)
                .sessionId(sessionId)
                .paymentType(Payment.PaymentType.PARKING_FEE)
                .paymentMethod(Payment.PaymentMethod.CASH)
                .paymentStatus(Payment.PaymentStatus.PENDING)
                .totalAmount(new BigDecimal("50000"))
                .build();
    }
}

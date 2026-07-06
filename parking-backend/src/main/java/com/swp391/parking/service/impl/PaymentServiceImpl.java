package com.swp391.parking.service.impl;

import com.swp391.parking.dto.response.PaymentResponse;
import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.Payment.PaymentMethod;
import com.swp391.parking.entity.Payment.PaymentStatus;
import com.swp391.parking.entity.Payment.PaymentType;
import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.PaymentRepository;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.PricingPolicyRepository;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.BookingService;
import com.swp391.parking.service.NotificationService;
import com.swp391.parking.service.PaymentService;
import com.swp391.parking.util.FeeCalculatorUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final PricingPolicyRepository pricingPolicyRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Override
    @Transactional
    public PaymentResponse createDeposit(
        Integer bookingId,
        BigDecimal depositAmount,
        PaymentMethod paymentMethod
    ) {
        var existingDeposit = paymentRepository.findByBookingIdAndPaymentType(bookingId, PaymentType.DEPOSIT);
        if (existingDeposit.isPresent()
                && (existingDeposit.get().getPaymentStatus() == PaymentStatus.PENDING
                || existingDeposit.get().getPaymentStatus() == PaymentStatus.PAID)) {
            return toResponse(existingDeposit.get());
        }

        Payment payment = Payment.builder()
            .bookingId(bookingId)
            .paymentType(PaymentType.DEPOSIT)
            .paymentMethod(paymentMethod)
            .paymentStatus(PaymentStatus.PENDING)
            .totalAmount(depositAmount)
            .build();

        return toResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse confirmDeposit(Integer paymentId, String transactionRef) {
        Payment payment = findById(paymentId);

        if (payment.getPaymentType() != PaymentType.DEPOSIT) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Payment #" + paymentId + " khong phai DEPOSIT (hien: " + payment.getPaymentType() + ")");
        }

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(HttpStatus.CONFLICT, "Payment already paid");
        }
        if (payment.getPaymentStatus() == PaymentStatus.FAILED
                || payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Khong the confirm payment dang o trang thai " + payment.getPaymentStatus());
        }

        if (payment.getBookingId() != null) {
            Booking booking = bookingRepository.findById(payment.getBookingId().longValue()).orElse(null);
            if (booking != null && booking.getExpiredAt() != null
                    && booking.getExpiredAt().isBefore(LocalDateTime.now())
                    && booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Booking da het han, khong the confirm deposit");
            }
        }

        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        if (transactionRef != null && !transactionRef.isBlank()) {
            payment.setTransactionRef(transactionRef);
        }

        Payment savedPayment = paymentRepository.save(payment);

        if (savedPayment.getBookingId() != null) {
            bookingService.confirmBookingAfterPayment(savedPayment.getBookingId().longValue());
        }

        return toResponse(savedPayment);
    }

    @Override
    @Transactional
    public PaymentResponse markFailed(Integer paymentId, String transactionRef) {
        Payment payment = findById(paymentId);

        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Payment da PAID, khong the mark FAILED");
        }
        if (payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Payment da REFUNDED, khong the mark FAILED");
        }
        if (payment.getPaymentStatus() == PaymentStatus.FAILED) {
            return toResponse(payment);
        }

        payment.setPaymentStatus(PaymentStatus.FAILED);
        if (transactionRef != null && !transactionRef.isBlank()) {
            payment.setTransactionRef(transactionRef);
        }
        return toResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse createParkingFee(
        Integer sessionId,
        Integer bookingId,
        Integer policyId,
        BigDecimal appliedRate,
        BigDecimal baseFee,
        BigDecimal overtimeFee,
        BigDecimal penaltyFee,
        BigDecimal discount,
        BigDecimal depositDeducted,
        BigDecimal totalAmount,
        PaymentMethod paymentMethod
    ) {
        ParkingSession session = parkingSessionRepository.findById(sessionId.longValue())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Session khong ton tai"));

        if (session.getStatus() != ParkingSession.SessionStatus.WAITING_PAYMENT) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chi tao Parking Fee cho session WAITING_PAYMENT (hien: " + session.getStatus() + ")");
        }

        Payment existingPending = paymentRepository.findBySessionId(sessionId).stream()
                .filter(p -> p.getPaymentType() == PaymentType.PARKING_FEE
                        && p.getPaymentStatus() == PaymentStatus.PENDING)
                .findFirst()
                .orElse(null);
        boolean hasPaidFee = paymentRepository.findBySessionId(sessionId).stream()
                .anyMatch(p -> p.getPaymentType() == PaymentType.PARKING_FEE
                        && p.getPaymentStatus() == PaymentStatus.PAID);
        if (hasPaidFee) {
            throw new AppException(HttpStatus.CONFLICT, "Session da co Parking Fee da thanh toan");
        }

        BigDecimal serverRate = resolveHourlyRate(session);
        List<PricingPolicy> activePolicies = List.of();
        if (session.getVehicle() != null && session.getVehicle().getVehicleType() != null) {
            // Dung TAT CA phien ban gia de tinh dung phi cho tung doan thoi gian da
            // qua, ke ca khi Manager da sua gia giua luc xe dang do.
            activePolicies = pricingPolicyRepository.findByVehicleType_Id(
                    session.getVehicle().getVehicleType().getId());
        }
        if (session.getExitTime() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Session #" + sessionId + " chua co thoi gian ra (exitTime null), khong the tinh phi");
        }
        BigDecimal serverBaseFee = FeeCalculatorUtil.calculateSessionFee(
                session.getEntryTime(), session.getExitTime(), activePolicies, serverRate);

        BigDecimal serverDeposit = BigDecimal.ZERO;
        if (session.getBooking() != null && session.getBooking().getDepositAmount() != null) {
            serverDeposit = session.getBooking().getDepositAmount();
        }

        BigDecimal serverTotal = FeeCalculatorUtil.calculateTotal(
                serverBaseFee, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, serverDeposit);

        Integer resolvedBookingId = bookingId;
        try {
            if (session.getBooking() != null && session.getBooking().getId() != null) {
                resolvedBookingId = session.getBooking().getId().intValue();
            }
        } catch (Exception ignored) {}

        Payment payment = existingPending != null ? existingPending : Payment.builder()
            .sessionId(sessionId)
            .paymentType(PaymentType.PARKING_FEE)
            .paymentStatus(PaymentStatus.PENDING)
            .build();

        payment.setBookingId(resolvedBookingId);
        payment.setPolicyId(policyId);
        payment.setPaymentMethod(paymentMethod);
        payment.setAppliedRate(serverRate);
        payment.setBaseFee(serverBaseFee);
        payment.setOvertimeFee(BigDecimal.ZERO);
        payment.setPenaltyFee(BigDecimal.ZERO);
        payment.setDiscount(BigDecimal.ZERO);
        payment.setDepositDeducted(serverDeposit);
        payment.setTotalAmount(serverTotal);

        // Miễn phí (grace period hoặc deposit đã cover hết): auto-complete ngay
        if (serverTotal.compareTo(BigDecimal.ZERO) == 0) {
            payment.setPaymentStatus(PaymentStatus.PAID);
            payment.setPaidAt(LocalDateTime.now());
            payment.setTransactionRef("FREE-GRACE-" + sessionId);
            Payment saved = paymentRepository.save(payment);
            completeSessionAfterParkingFee(saved);
            return toResponse(saved);
        }

        return toResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional
    public PaymentResponse confirmParkingFee(Integer paymentId, String transactionRef) {
        Payment payment = findById(paymentId);

        if (payment.getPaymentType() != PaymentType.PARKING_FEE) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Payment #" + paymentId + " khong phai PARKING_FEE (hien: " + payment.getPaymentType() + ")");
        }

        // Idempotent: duplicate IPN or concurrent /return + IPN calls both succeed
        if (payment.getPaymentStatus() == PaymentStatus.PAID) {
            return toResponse(payment);
        }
        if (payment.getPaymentStatus() == PaymentStatus.FAILED
                || payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Khong the confirm payment dang o trang thai " + payment.getPaymentStatus());
        }

        if (payment.getSessionId() != null) {
            ParkingSession session = parkingSessionRepository.findById(payment.getSessionId().longValue()).orElse(null);
            if (session != null && session.getStatus() != ParkingSession.SessionStatus.WAITING_PAYMENT) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Session khong o trang thai WAITING_PAYMENT (hien: " + session.getStatus() + ")");
            }
        }

        // Update method to reflect how payment was actually made
        if (transactionRef != null && transactionRef.startsWith("CASH-")) {
            payment.setPaymentMethod(PaymentMethod.CASH);
        } else if (transactionRef != null && !transactionRef.startsWith("FREE-")) {
            payment.setPaymentMethod(PaymentMethod.VNPAY);
        }

        payment.setPaymentStatus(PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        payment.setTransactionRef(transactionRef);

        Payment saved = paymentRepository.save(payment);
        completeSessionAfterParkingFee(saved);

        return toResponse(saved);
    }

    @Override
    @Transactional
    public PaymentResponse refundPayment(Integer paymentId, String transactionRef) {
        Payment payment = findById(paymentId);

        if (payment.getPaymentStatus() == PaymentStatus.REFUNDED) {
            return toResponse(payment);
        }
        if (payment.getPaymentStatus() != PaymentStatus.PAID) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chi refund payment da PAID (hien: " + payment.getPaymentStatus() + ")");
        }

        validateRefundEligibility(payment);
        payment.setPaymentStatus(PaymentStatus.REFUNDED);
        if (transactionRef != null && !transactionRef.isBlank()) {
            payment.setTransactionRef(transactionRef);
        }
        return toResponse(paymentRepository.save(payment));
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getById(Integer paymentId) {
        return toResponse(findById(paymentId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getByBookingId(Integer bookingId) {
        return paymentRepository.findByBookingId(bookingId)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getBySessionId(Integer sessionId) {
        return paymentRepository.findBySessionId(sessionId)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getByStatus(PaymentStatus status, Long currentUserId, boolean staffScoped) {
        Long buildingId = resolveScopedBuildingId(currentUserId, staffScoped);
        return paymentRepository.findByPaymentStatusOrderByCreatedAtDesc(status)
            .stream()
            .filter(payment -> buildingId == null || paymentBelongsToBuilding(payment, buildingId))
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getMyPayments(Long userId) {
        return paymentRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .stream().map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public void enforcePaymentOwnership(Integer paymentId, Long userId) {
        Payment payment = findById(paymentId);
        boolean owned = false;
        if (payment.getBookingId() != null) {
            bookingRepository.findById(payment.getBookingId().longValue())
                    .ifPresent(b -> { if (!b.getUserId().equals(userId)) throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem payment nay"); });
            owned = true;
        }
        if (payment.getSessionId() != null) {
            parkingSessionRepository.findById(payment.getSessionId().longValue())
                    .ifPresent(s -> { if (!s.getUserId().equals(userId)) throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem payment nay"); });
            owned = true;
        }
        if (!owned) throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem payment nay");
    }

    @Override
    @Transactional(readOnly = true)
    public void enforceBookingOwnership(Integer bookingId, Long userId) {
        bookingRepository.findById(bookingId.longValue()).ifPresent(b -> {
            if (!b.getUserId().equals(userId)) {
                throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem payment cua booking nay");
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public void enforceSessionOwnership(Integer sessionId, Long userId) {
        parkingSessionRepository.findById(sessionId.longValue()).ifPresent(s -> {
            if (!s.getUserId().equals(userId)) {
                throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem payment cua session nay");
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public void enforcePaymentBuildingScope(Integer paymentId, Long currentUserId, boolean staffScoped) {
        Long buildingId = resolveScopedBuildingId(currentUserId, staffScoped);
        if (buildingId == null) {
            return;
        }
        Payment payment = findById(paymentId);
        if (!paymentBelongsToBuilding(payment, buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem payment ngoai toa nha duoc phan cong");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void enforceBookingBuildingScope(Integer bookingId, Long currentUserId, boolean staffScoped) {
        Long buildingId = resolveScopedBuildingId(currentUserId, staffScoped);
        if (buildingId == null) {
            return;
        }
        Booking booking = bookingRepository.findById(bookingId.longValue())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!bookingBelongsToBuilding(booking, buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem booking ngoai toa nha duoc phan cong");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public void enforceSessionBuildingScope(Integer sessionId, Long currentUserId, boolean staffScoped) {
        Long buildingId = resolveScopedBuildingId(currentUserId, staffScoped);
        if (buildingId == null) {
            return;
        }
        ParkingSession session = parkingSessionRepository.findById(sessionId.longValue())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Session not found"));
        if (!sessionBelongsToBuilding(session, buildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Khong co quyen xem session ngoai toa nha duoc phan cong");
        }
    }

    private Payment findById(Integer paymentId) {
        return paymentRepository.findById(paymentId)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    private BigDecimal resolveHourlyRate(ParkingSession session) {
        if (session.getVehicle() == null || session.getVehicle().getVehicleType() == null) {
            return new BigDecimal("20000");
        }
        Long vtId = session.getVehicle().getVehicleType().getId();
        // Tat ca phien ban gia - resolveHourlyRate se tu chon dung phien ban theo
        // effectiveFrom tai thoi diem entryTime.
        List<PricingPolicy> policies = pricingPolicyRepository.findByVehicleType_Id(vtId);
        LocalDateTime refTime = session.getEntryTime() != null ? session.getEntryTime() : LocalDateTime.now();
        return FeeCalculatorUtil.resolveHourlyRate(policies, refTime);
    }

    private void validateRefundEligibility(Payment payment) {
        if (payment.getPaymentType() == PaymentType.DEPOSIT) {
            if (payment.getBookingId() == null) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Deposit payment khong gan voi booking, khong the refund");
            }
            Booking booking = bookingRepository.findById(payment.getBookingId().longValue())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Booking khong ton tai"));
            if (booking.getStatus() != Booking.BookingStatus.CANCELLED
                    && booking.getStatus() != Booking.BookingStatus.EXPIRED) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Chi refund deposit khi booking da CANCELLED hoac EXPIRED");
            }
            return;
        }

        if (payment.getPaymentType() == PaymentType.PARKING_FEE) {
            if (payment.getSessionId() == null) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Parking fee khong gan voi session, khong the refund");
            }
            ParkingSession session = parkingSessionRepository.findById(payment.getSessionId().longValue())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Parking session khong ton tai"));
            if (session.getStatus() != ParkingSession.SessionStatus.COMPLETED) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Chi refund parking fee khi session da COMPLETED");
            }
        }
    }

    private void completeSessionAfterParkingFee(Payment payment) {
        if (payment.getSessionId() == null || payment.getPaymentType() != PaymentType.PARKING_FEE) {
            return;
        }

        ParkingSession session = parkingSessionRepository.findById(payment.getSessionId().longValue())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Parking session not found"));

        session.setStatus(ParkingSession.SessionStatus.COMPLETED);
        parkingSessionRepository.save(session);

        Booking booking = session.getBooking();
        if (booking != null && booking.getStatus() != Booking.BookingStatus.COMPLETED) {
            booking.setStatus(Booking.BookingStatus.COMPLETED);
            bookingRepository.save(booking);
        }

        ParkingSlot slot = session.getSlot();
        if (slot != null) {
            slot.setStatus(ParkingSlot.Status.AVAILABLE);
            parkingSlotRepository.save(slot);
        }

        try {
            notificationService.notify(session.getUserId(),
                    "Thanh toan hoan tat",
                    "Phi do xe " + payment.getTotalAmount() + " VND da duoc thanh toan. Cam on ban!",
                    "success", "PAYMENT", payment.getPaymentId());
        } catch (Exception ignored) {}

        try {
            userRepository.findById(session.getUserId().intValue())
                    .ifPresent(user -> emailService.sendParkingReceiptEmail(user, session, payment));
        } catch (Exception ignored) {}
    }

    private Long resolveScopedBuildingId(Long currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return null;
        }
        var currentUser = userRepository.findById(Math.toIntExact(currentUserId))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Khong tim thay staff hien tai"));
        if (currentUser.getAssignedBuilding() == null || currentUser.getAssignedBuilding().getId() == null) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Staff chua duoc gan toa nha, khong the xem payment ngoai pham vi");
        }
        return currentUser.getAssignedBuilding().getId();
    }

    private boolean paymentBelongsToBuilding(Payment payment, Long buildingId) {
        if (payment.getSessionId() != null) {
            ParkingSession session = parkingSessionRepository.findById(payment.getSessionId().longValue()).orElse(null);
            if (session != null) {
                return sessionBelongsToBuilding(session, buildingId);
            }
        }
        if (payment.getBookingId() != null) {
            Booking booking = bookingRepository.findById(payment.getBookingId().longValue()).orElse(null);
            if (booking != null) {
                return bookingBelongsToBuilding(booking, buildingId);
            }
        }
        return false;
    }

    private boolean bookingBelongsToBuilding(Booking booking, Long buildingId) {
        return booking != null
                && booking.getSlot() != null
                && booking.getSlot().getZone() != null
                && booking.getSlot().getZone().getFloor() != null
                && booking.getSlot().getZone().getFloor().getBuilding() != null
                && buildingId.equals(booking.getSlot().getZone().getFloor().getBuilding().getId());
    }

    private boolean sessionBelongsToBuilding(ParkingSession session, Long buildingId) {
        return session != null
                && session.getSlot() != null
                && session.getSlot().getZone() != null
                && session.getSlot().getZone().getFloor() != null
                && session.getSlot().getZone().getFloor().getBuilding() != null
                && buildingId.equals(session.getSlot().getZone().getFloor().getBuilding().getId());
    }

    private PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
            .paymentId(payment.getPaymentId())
            .bookingId(payment.getBookingId())
            .sessionId(payment.getSessionId())
            .policyId(payment.getPolicyId())
            .paymentType(payment.getPaymentType())
            .appliedRate(payment.getAppliedRate())
            .baseFee(payment.getBaseFee())
            .overtimeFee(payment.getOvertimeFee())
            .penaltyFee(payment.getPenaltyFee())
            .discount(payment.getDiscount())
            .depositDeducted(payment.getDepositDeducted())
            .totalAmount(payment.getTotalAmount())
            .transactionRef(payment.getTransactionRef())
            .paymentMethod(payment.getPaymentMethod())
            .paymentStatus(payment.getPaymentStatus())
            .paidAt(payment.getPaidAt())
            .createdAt(payment.getCreatedAt())
            .build();
    }
}

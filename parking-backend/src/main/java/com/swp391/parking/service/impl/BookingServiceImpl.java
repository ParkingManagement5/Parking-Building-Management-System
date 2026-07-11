package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.response.BookingResponse;
import com.swp391.parking.entity.*;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.*;
import com.swp391.parking.service.BookingService;
import com.swp391.parking.service.NotificationService;
import com.swp391.parking.service.SystemConfigService;
import com.swp391.parking.util.FeeCalculatorUtil;
import com.swp391.parking.util.LicensePlateUtil;
import com.swp391.parking.util.QrTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final ParkingSessionRepository sessionRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final PaymentRepository paymentRepository;
    private final QrTokenUtil qrTokenUtil;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final SystemConfigService systemConfigService;
    private final PricingPolicyRepository pricingPolicyRepository;
    private final FeeCalculatorUtil feeCalculatorUtil;

    @Override
    @Transactional
    public BookingResponse createBooking(Long currentUserId, CreateBookingRequest request) {
        LocalDateTime now = LocalDateTime.now();
        expireStaleOpenBookings(now);

        // Load vehicle (BE2) — kiểm tra chủ sở hữu
        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy xe"));
        if (!vehicle.getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Xe này không thuộc về bạn");
        }

        // Load slot (BE2)
        ParkingSlot slot = parkingSlotRepository.findById(request.getSlotId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy slot"));

        // [BR-02] Loại xe phải match zone — so sánh slotSize
        ParkingSlot.SlotSize vehicleSlotSize = vehicle.getVehicleType().getSlotSize() != null
                ? ParkingSlot.SlotSize.valueOf(vehicle.getVehicleType().getSlotSize().name())
                : null;
        if (vehicleSlotSize == null || vehicleSlotSize != slot.getSlotSize()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Kích cỡ xe (" + vehicle.getVehicleType().getSlotSize()
                            + ") không phù hợp với slot " + slot.getSlotCode()
                            + " (" + slot.getSlotSize() + ")");
        }

        // Slot phải đang được kích hoạt trước khi kiểm tra trạng thái khai thác.
        if (!Boolean.TRUE.equals(slot.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Slot " + slot.getSlotCode() + " đang bị vô hiệu hóa, không thể đặt");
        }

        // [BR-11] Slot không được MAINTENANCE
        if (slot.getStatus() == ParkingSlot.Status.MAINTENANCE) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Slot đang bảo trì, không thể đặt");
        }
        if (slot.getStatus() != ParkingSlot.Status.AVAILABLE) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Slot " + slot.getSlotCode() + " không khả dụng (trạng thái: " + slot.getStatus() + ")");
        }

        // [BR-06] 1 xe chỉ có 1 booking active
        bookingRepository.findByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(
                        Booking.BookingStatus.PENDING_PAYMENT,
                        Booking.BookingStatus.CONFIRMED,
                        Booking.BookingStatus.CHECKED_IN,
                        Booking.BookingStatus.WAITING_PAYMENT
                )
        ).ifPresent(b -> {
            throw new AppException(HttpStatus.CONFLICT,
                    "Xe này đang có booking active (#" + b.getId() + ")");
        });

        // [BR-06b] Xe đang có session chưa hoàn tất (walk-in hoặc booking) → không cho đặt thêm
        boolean hasOpenSession = sessionRepository.existsByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(ParkingSession.SessionStatus.ACTIVE, ParkingSession.SessionStatus.WAITING_PAYMENT)
        );
        if (hasOpenSession) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Xe đang có phiên đỗ xe chưa hoàn tất, không thể đặt booking mới");
        }

        // Kiểm tra slot đã có booking active chưa
        bookingRepository.findBySlot_IdAndStatusIn(
                slot.getId(),
                List.of(
                        Booking.BookingStatus.PENDING_PAYMENT,
                        Booking.BookingStatus.CONFIRMED,
                        Booking.BookingStatus.CHECKED_IN
                )
        ).ifPresent(b -> {
            throw new AppException(HttpStatus.CONFLICT,
                    "Slot " + slot.getSlotCode() + " đã có booking active (#" + b.getId() + ")");
        });

        LocalDateTime startTime = request.getBookingStartTime();
        if (startTime == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Thieu bookingStartTime");
        }

        long minAdvanceMinutes = systemConfigService.getLongValue("BOOKING_MIN_ADVANCE_MINUTES", 10);
        long qrExpireBufferMinutes = systemConfigService.getLongValue("QR_EXPIRE_BUFFER_MINUTES", 15);

        long minutesUntilStart = ChronoUnit.MINUTES.between(now, startTime);
        if (minutesUntilStart < minAdvanceMinutes) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Phải đặt trước ít nhất " + minAdvanceMinutes + " phút.");
        }

        String bookingType = request.getBookingType() != null && !request.getBookingType().isBlank()
                ? request.getBookingType().toUpperCase() : "HOURLY";

        LocalDateTime endTime;
        if ("HOURLY".equals(bookingType)) {
            endTime = request.getBookingEndTime() != null
                    ? request.getBookingEndTime() : startTime.plusHours(2);
        } else {
            Integer durationUnits = request.getDurationUnits();
            if (durationUnits == null || durationUnits < 1) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "durationUnits phải >= 1 khi bookingType khác HOURLY");
            }
            endTime = switch (bookingType) {
                case "DAILY" -> startTime.plusDays(durationUnits);
                case "WEEKLY" -> startTime.plusWeeks(durationUnits);
                case "MONTHLY" -> startTime.plusMonths(durationUnits);
                default -> throw new AppException(HttpStatus.BAD_REQUEST,
                        "bookingType không hợp lệ: " + bookingType);
            };
        }

        if (!endTime.isAfter(startTime)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "bookingEndTime phải sau bookingStartTime");
        }

        // expired_at = MIN(now+QR_EXPIRE_BUFFER_MINUTES, start-5p)
        LocalDateTime expiredAt = now.plusMinutes(qrExpireBufferMinutes).isBefore(startTime.minusMinutes(5))
                ? now.plusMinutes(qrExpireBufferMinutes) : startTime.minusMinutes(5);
        if (expiredAt.isBefore(now)) {
            expiredAt = now.plusMinutes(qrExpireBufferMinutes);
        }

        // Tính deposit (tiền đặt chỗ — mất nếu không đến)
        // Flat-rate booking (DAILY/WEEKLY/MONTHLY) mien coc
        BigDecimal deposit;
        if ("HOURLY".equals(bookingType)) {
            deposit = calculateDeposit(vehicle.getVehicleType().getName(), minutesUntilStart);
        } else if ("WEEKLY".equals(bookingType) || "MONTHLY".equals(bookingType)) {
            // Prepay tron goi: driver tra toan bo phi flat-rate truoc khi nhan QR
            deposit = calculatePrepayFlatRate(vehicle, bookingType, startTime, endTime);
        } else {
            deposit = BigDecimal.ZERO; // DAILY: mien coc, tra luc ra
        }

        Booking booking = Booking.builder()
                .userId(currentUserId)
                .vehicle(vehicle)
                .slot(slot)
                .bookingStartTime(startTime)
                .bookingEndTime(endTime)
                .bookingType(bookingType)
                .reservedAt(now)
                .expiredAt(expiredAt)
                .depositAmount(deposit)
                .status(Booking.BookingStatus.PENDING_PAYMENT)
                .build();

        booking = bookingRepository.save(booking);
        log.info("Booking #{} tạo bởi user #{}, deposit={}", booking.getId(), currentUserId, deposit);

        String paymentHint = ("WEEKLY".equals(bookingType) || "MONTHLY".equals(bookingType))
                ? "Vui lòng thanh toán phí trọn gói để nhận QR."
                : "DAILY".equals(bookingType)
                        ? "Đặt chỗ thành công, thanh toán khi ra khỏi bãi."
                        : "Vui lòng thanh toán cọc để nhận QR.";
        notificationService.notify(currentUserId,
                "Đặt chỗ thành công",
                "Booking #" + booking.getId() + " cho slot " + slot.getSlotCode() + " đã được tạo. " + paymentHint,
                "info", "BOOKING", booking.getId().intValue());

        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse confirmBookingAfterPayment(Long bookingId) {
        Booking booking = getBookingEntity(bookingId);

        // Idempotent: if already CONFIRMED (e.g., duplicate IPN callback), return current state
        if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
            return toResponse(booking);
        }

        if (booking.getStatus() != Booking.BookingStatus.PENDING_PAYMENT) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Booking #" + bookingId + " không ở trạng thái chờ thanh toán (hiện: " + booking.getStatus() + ")");
        }

        LocalDateTime now = LocalDateTime.now();

        // Payment deadline (expiredAt) already passed - reject confirmation even
        // if the gate-entry QR window (bookingStartTime + 30 min) is still open.
        if (booking.getExpiredAt() != null && !booking.getExpiredAt().isAfter(now)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Booking #" + bookingId + " đã quá hạn thanh toán, không thể xác nhận");
        }

        // Booking QR is valid until bookingStartTime + 30 minutes.
        LocalDateTime qrExpiry = confirmedBookingQrExpiry(booking);
        if (!qrExpiry.isAfter(now)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking đã quá hạn vào bãi");
        }

        String qr = qrTokenUtil.generateBookingQrToken(
                booking.getId(),
                booking.getVehicle().getLicensePlate(),
                booking.getSlot().getId(),
                qrExpiry);

        booking.setQrToken(qr);
        booking.setQrIssuedAt(now);
        booking.setDepositPaidAt(now);
        booking.setStatus(Booking.BookingStatus.CONFIRMED);
        booking.setExpiredAt(qrExpiry);

        // Mark slot RESERVED
        ParkingSlot slot = booking.getSlot();
        slot.setStatus(ParkingSlot.Status.RESERVED);
        parkingSlotRepository.save(slot);

        booking = bookingRepository.save(booking);
        log.info("Booking #{} CONFIRMED, QR issued, slot {} RESERVED",
                bookingId, slot.getSlotCode());

        notificationService.notify(booking.getUserId(),
                "QR đã được tạo",
                "Booking #" + bookingId + " đã xác nhận. Đưa QR cho staff tại cổng vào.",
                "success", "BOOKING", bookingId.intValue());

        Booking confirmedBooking = booking;
        userRepository.findById(confirmedBooking.getUserId().intValue())
                .ifPresent(user -> emailService.sendBookingQrEmail(user, confirmedBooking));

        return toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBooking(Long bookingId, Long currentUserId, boolean staffScoped) {
        Booking booking = getBookingEntity(bookingId);
        enforceStaffBuildingScope(booking, currentUserId, staffScoped);
        return toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse verifyQrToken(String qrToken, Long currentUserId, boolean staffScoped) {
        if (qrToken == null || qrToken.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Thiếu QR token");
        }

        Long bookingId;
        try {
            bookingId = qrTokenUtil.parseQrToken(qrToken).get("booking_id", Long.class);
        } catch (Exception ex) {
            throw new AppException(HttpStatus.BAD_REQUEST, "QR không hợp lệ hoặc đã hết hạn");
        }

        Booking booking = getBookingEntity(bookingId);
        enforceStaffBuildingScope(booking, currentUserId, staffScoped);
        if (booking.getQrUsedAt() != null) {
            throw new AppException(HttpStatus.CONFLICT, "QR đã được dùng rồi");
        }
        if (booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking không còn hiệu lực");
        }
        // Token verify phải đúng token hiện tại trong DB để QR cũ bị revoke sau regenerate.
        if (booking.getQrToken() == null || !booking.getQrToken().equals(qrToken)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "QR đã bị thay thế bởi token mới. Dùng QR mới nhất.");
        }

        return toResponse(booking);
    }

    @Override
    @Transactional
    public List<BookingResponse> getMyBookings(Long currentUserId) {
        expireStaleOpenBookings(LocalDateTime.now());
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(currentUserId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(Long bookingId, Long currentUserId) {
        Booking booking = getBookingEntity(bookingId);
        if (!booking.getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền huỷ booking này");
        }
        if (!List.of(Booking.BookingStatus.PENDING_PAYMENT, Booking.BookingStatus.CONFIRMED)
                .contains(booking.getStatus())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chỉ huỷ được PENDING_PAYMENT hoặc CONFIRMED");
        }

        boolean shouldRefundDeposit = false;
        if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
            long cancelWindowMinutes = systemConfigService.getLongValue("BOOKING_CANCEL_WINDOW_MINUTES", 10);
            shouldRefundDeposit = isWithinCancelRefundWindow(booking.getDepositPaidAt(), cancelWindowMinutes);

            ParkingSlot slot = booking.getSlot();
            slot.setStatus(ParkingSlot.Status.AVAILABLE);
            parkingSlotRepository.save(slot);
        }

        booking.setStatus(Booking.BookingStatus.CANCELLED);
        Booking savedBooking = bookingRepository.save(booking);
        if (shouldRefundDeposit) {
            markDepositRefunded(savedBooking);
        }
        return toResponse(savedBooking);
    }

    @Override
    @Transactional
    public BookingResponse regenerateQr(Long bookingId, Long currentUserId) {
        Booking booking = getBookingEntity(bookingId);
        if (!booking.getUserId().equals(currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền tạo lại QR cho booking này");
        }
        if (booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chỉ tạo lại QR cho booking CONFIRMED (hiện: " + booking.getStatus() + ")");
        }
        if (booking.getQrUsedAt() != null) {
            throw new AppException(HttpStatus.CONFLICT, "QR đã được sử dụng, không thể tạo lại");
        }

        LocalDateTime qrExpiry = booking.getExpiredAt();
        if (qrExpiry == null || !qrExpiry.isAfter(LocalDateTime.now())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "QR đã hết hạn, không thể tạo lại cho booking này");
        }

        String newQr = qrTokenUtil.generateBookingQrToken(
                booking.getId(),
                booking.getVehicle().getLicensePlate(),
                booking.getSlot().getId(),
                qrExpiry);

        booking.setQrToken(newQr);
        booking.setQrIssuedAt(LocalDateTime.now());
        booking = bookingRepository.save(booking);

        log.info("Booking #{} QR regenerated, new expiry={}", bookingId, qrExpiry);
        return toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> searchByPlate(String licensePlate, Long currentUserId, boolean staffScoped) {
        if (licensePlate == null || licensePlate.isBlank()) return List.of();
        Map<Long, Booking> matches = new LinkedHashMap<>();
        List<Booking.BookingStatus> activeStatuses = List.of(
                Booking.BookingStatus.PENDING_PAYMENT,
                Booking.BookingStatus.CONFIRMED);
        LicensePlateUtil.lookupCandidates(licensePlate).stream()
                .map(vehicleRepository::findByLicensePlate)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .forEach(vehicle -> bookingRepository.findByVehicle_IdAndStatusIn(vehicle.getId(), activeStatuses)
                        .ifPresent(booking -> matches.putIfAbsent(booking.getId(), booking)));
        return matches.values().stream()
                .filter(booking -> canStaffAccessBooking(booking, currentUserId, staffScoped))
                .map(this::toResponse).toList();
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private Booking getBookingEntity(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy booking #" + id));
    }

    private LocalDateTime confirmedBookingQrExpiry(Booking booking) {
        if (booking.getBookingStartTime() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking thieu bookingStartTime");
        }
        // Booking dài hạn: QR có hiệu lực đến hết bookingEndTime (driver có thể vào trong cả kỳ hợp đồng)
        String type = booking.getBookingType();
        if (type != null && !type.equalsIgnoreCase("HOURLY") && booking.getBookingEndTime() != null) {
            return booking.getBookingEndTime().withNano(0);
        }
        long expireAfterStart = systemConfigService.getLongValue("BOOKING_EXPIRE_AFTER_START", 30);
        return booking.getBookingStartTime().plusMinutes(expireAfterStart).withNano(0);
    }

    private void expireStaleOpenBookings(LocalDateTime now) {
        List<Booking> stalePending = bookingRepository.findByStatusAndExpiredAtBefore(
                Booking.BookingStatus.PENDING_PAYMENT, now);
        if (!stalePending.isEmpty()) {
            stalePending.forEach(b -> b.setStatus(Booking.BookingStatus.EXPIRED));
            bookingRepository.saveAll(stalePending);
        }

        long expireAfterStart = systemConfigService.getLongValue("BOOKING_EXPIRE_AFTER_START", 30);
        List<Booking> staleConfirmed = bookingRepository.findConfirmedNoShow(now.minusMinutes(expireAfterStart));
        if (!staleConfirmed.isEmpty()) {
            staleConfirmed.forEach(b -> {
                b.setStatus(Booking.BookingStatus.EXPIRED);
                ParkingSlot slot = b.getSlot();
                if (slot.getStatus() == ParkingSlot.Status.RESERVED) {
                    slot.setStatus(ParkingSlot.Status.AVAILABLE);
                    parkingSlotRepository.save(slot);
                }
            });
            bookingRepository.saveAll(staleConfirmed);
        }
    }

    private BigDecimal calculateDeposit(String vehicleTypeName, long minutesUntilStart) {
        // BR-03d: chỉ CAR và ELECTRIC_CAR mới tính cọc, MOTORBIKE không tính
        if (!vehicleTypeName.equalsIgnoreCase("CAR")
                && !vehicleTypeName.equalsIgnoreCase("ELECTRIC_CAR")) {
            return BigDecimal.ZERO;
        }
        if (minutesUntilStart < 10)  return BigDecimal.ZERO;
        if (minutesUntilStart < 120) return new BigDecimal("10000");
        if (minutesUntilStart < 240) return new BigDecimal("15000");
        if (minutesUntilStart < 360) return new BigDecimal("20000");
        return new BigDecimal("30000");
    }

    private BigDecimal calculatePrepayFlatRate(Vehicle vehicle, String bookingType,
                                               LocalDateTime startTime, LocalDateTime endTime) {
        if (vehicle.getVehicleType() == null) return BigDecimal.ZERO;
        List<PricingPolicy> active = pricingPolicyRepository
                .findByVehicleType_IdAndIsActiveTrue(vehicle.getVehicleType().getId());
        BigDecimal fallback = feeCalculatorUtil.resolveHourlyRate(active, startTime);
        return feeCalculatorUtil.calculateSessionFee(startTime, endTime, active, fallback, bookingType, endTime);
    }

    private boolean isWithinCancelRefundWindow(LocalDateTime depositPaidAt, long cancelWindowMinutes) {
        if (depositPaidAt == null) {
            return false;
        }
        return !depositPaidAt.plusMinutes(cancelWindowMinutes).isBefore(LocalDateTime.now());
    }

    private void markDepositRefunded(Booking booking) {
        paymentRepository.findByBookingIdAndPaymentType(booking.getId().intValue(), Payment.PaymentType.DEPOSIT)
                .filter(payment -> payment.getPaymentStatus() == Payment.PaymentStatus.PAID)
                .ifPresent(payment -> {
                    payment.setPaymentStatus(Payment.PaymentStatus.REFUNDED);
                    if (payment.getTransactionRef() == null || payment.getTransactionRef().isBlank()) {
                        payment.setTransactionRef("BOOKING-CANCEL-REFUND-" + booking.getId() + "-" + System.currentTimeMillis());
                    }
                    paymentRepository.save(payment);
                });
    }

    private void enforceStaffBuildingScope(Booking booking, Long currentUserId, boolean staffScoped) {
        if (!canStaffAccessBooking(booking, currentUserId, staffScoped)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem booking ngoài toà nhà được phân công");
        }
    }

    private boolean canStaffAccessBooking(Booking booking, Long currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return true;
        }
        User currentUser = userRepository.findById(Math.toIntExact(currentUserId))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy staff hiện tại"));
        if (currentUser.getAssignedBuilding() == null || currentUser.getAssignedBuilding().getId() == null) {
            // Staff without assigned building can see all bookings (e.g. floating/admin staff)
            return true;
        }
        return booking.getSlot() != null
                && booking.getSlot().getZone() != null
                && booking.getSlot().getZone().getFloor() != null
                && booking.getSlot().getZone().getFloor().getBuilding() != null
                && currentUser.getAssignedBuilding().getId().equals(
                        booking.getSlot().getZone().getFloor().getBuilding().getId());
    }

    private BookingResponse toResponse(Booking b) {
        ParkingSlot slot = b.getSlot();
        Zone zone = slot.getZone();
        Floor floor = zone.getFloor();
        ParkingBuilding building = floor.getBuilding();

        return BookingResponse.builder()
                .bookingId(b.getId())
                .userId(b.getUserId())
                .vehicleId(b.getVehicle().getId())
                .licensePlate(b.getVehicle().getLicensePlate())
                .slotId(slot.getId())
                .slotCode(slot.getSlotCode())
                .zoneId(zone.getId())
                .zoneName(zone.getName())
                .floorId(floor.getId())
                .floorName(floor.getName())
                .buildingId(building.getId())
                .buildingName(building.getName())
                .bookingStartTime(b.getBookingStartTime())
                .bookingEndTime(b.getBookingEndTime())
                .bookingType(b.getBookingType())
                .reservedAt(b.getReservedAt())
                .expiredAt(b.getExpiredAt())
                .qrToken(b.getStatus() == Booking.BookingStatus.CONFIRMED
                        && b.getQrUsedAt() == null
                        && (b.getExpiredAt() == null || b.getExpiredAt().isAfter(LocalDateTime.now()))
                        ? b.getQrToken()
                        : null)
                .qrIssuedAt(b.getQrIssuedAt())
                .qrUsed(b.getQrUsedAt() != null)
                .depositAmount(b.getDepositAmount())
                .depositPaidAt(b.getDepositPaidAt())
                .status(b.getStatus().name())
                .createdAt(b.getCreatedAt())
                .build();
    }
}


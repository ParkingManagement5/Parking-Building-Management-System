package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreateBookingRequest;
import com.swp391.parking.dto.response.BookingResponse;
import com.swp391.parking.entity.*;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.*;
import com.swp391.parking.service.BookingService;
import com.swp391.parking.service.NotificationService;
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
    private static final long CONFIRMED_CANCEL_WINDOW_MINUTES = 10;

    private final BookingRepository bookingRepository;
    private final ParkingSessionRepository sessionRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final QrTokenUtil qrTokenUtil;
    private final NotificationService notificationService;

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

        // Đặt trước ít nhất 10 phút
        long minutesUntilStart = ChronoUnit.MINUTES.between(now, startTime);
        if (minutesUntilStart < 10) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Phải đặt trước ít nhất 10 phút.");
        }

        LocalDateTime endTime = request.getBookingEndTime() != null
                ? request.getBookingEndTime() : startTime.plusHours(2);

        if (!endTime.isAfter(startTime)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "bookingEndTime phai sau bookingStartTime");
        }

        // expired_at = MIN(now+15p, start-5p)
        LocalDateTime expiredAt = now.plusMinutes(15).isBefore(startTime.minusMinutes(5))
                ? now.plusMinutes(15) : startTime.minusMinutes(5);
        if (expiredAt.isBefore(now)) {
            expiredAt = now.plusMinutes(15);
        }

        // Tính deposit (tiền đặt chỗ — mất nếu không đến)
        BigDecimal deposit = calculateDeposit(vehicle.getVehicleType().getName(), minutesUntilStart);

        Booking booking = Booking.builder()
                .userId(currentUserId)
                .vehicle(vehicle)
                .slot(slot)
                .bookingStartTime(startTime)
                .bookingEndTime(endTime)
                .reservedAt(now)
                .expiredAt(expiredAt)
                .depositAmount(deposit)
                .status(Booking.BookingStatus.PENDING_PAYMENT)
                .build();

        booking = bookingRepository.save(booking);
        log.info("Booking #{} tạo bởi user #{}, deposit={}", booking.getId(), currentUserId, deposit);

        notificationService.notify(currentUserId,
                "Dat cho thanh cong",
                "Booking #" + booking.getId() + " cho slot " + slot.getSlotCode() + " da duoc tao. Vui long thanh toan coc de nhan QR.",
                "info", "BOOKING", booking.getId().intValue());

        return toResponse(booking);
    }

    @Override
    @Transactional
    public BookingResponse confirmBookingAfterPayment(Long bookingId) {
        Booking booking = getBookingEntity(bookingId);
        if (booking.getStatus() != Booking.BookingStatus.PENDING_PAYMENT) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking không ở trạng thái chờ thanh toán");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime pendingPaymentExpiry = booking.getExpiredAt();
        if (pendingPaymentExpiry == null || !pendingPaymentExpiry.isAfter(now)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking đã hết hạn thanh toán");
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
                "QR da duoc tao",
                "Booking #" + bookingId + " da xac nhan. Dua QR cho staff tai cong vao.",
                "success", "BOOKING", bookingId.intValue());

        return toResponse(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBooking(Long bookingId) {
        return toResponse(getBookingEntity(bookingId));
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse verifyQrToken(String qrToken) {
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
        if (booking.getQrUsedAt() != null) {
            throw new AppException(HttpStatus.CONFLICT, "QR đã được dùng rồi");
        }
        if (booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking không còn hiệu lực");
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
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền hủy booking này");
        }
        if (!List.of(Booking.BookingStatus.PENDING_PAYMENT, Booking.BookingStatus.CONFIRMED)
                .contains(booking.getStatus())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chỉ hủy được PENDING_PAYMENT hoặc CONFIRMED");
        }
        // Giải phóng slot nếu đã CONFIRMED
        if (booking.getStatus() == Booking.BookingStatus.CONFIRMED) {
            LocalDateTime depositPaidAt = booking.getDepositPaidAt();
            if (depositPaidAt == null || depositPaidAt.plusMinutes(CONFIRMED_CANCEL_WINDOW_MINUTES).isBefore(LocalDateTime.now())) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Booking da qua 10 phut sau khi thanh toan coc. Khong the huy tay; neu khach khong den he thong se xu ly no-show theo bookingStartTime + 30 phut.");
            }
            ParkingSlot slot = booking.getSlot();
            slot.setStatus(ParkingSlot.Status.AVAILABLE);
            parkingSlotRepository.save(slot);
        }
        booking.setStatus(Booking.BookingStatus.CANCELLED);
        return toResponse(bookingRepository.save(booking));
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
                    "QR da het han, khong the tao lai cho booking nay");
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
    public List<BookingResponse> searchByPlate(String licensePlate) {
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
        return matches.values().stream().map(this::toResponse).toList();
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
        return booking.getBookingStartTime().plusMinutes(30).withNano(0);
    }

    private void expireStaleOpenBookings(LocalDateTime now) {
        List<Booking> stalePending = bookingRepository.findByStatusAndExpiredAtBefore(
                Booking.BookingStatus.PENDING_PAYMENT, now);
        if (!stalePending.isEmpty()) {
            stalePending.forEach(b -> b.setStatus(Booking.BookingStatus.EXPIRED));
            bookingRepository.saveAll(stalePending);
        }

        List<Booking> staleConfirmed = bookingRepository.findConfirmedNoShow(now.minusMinutes(30));
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
        if (minutesUntilStart < 30)  return BigDecimal.ZERO;
        if (minutesUntilStart < 120) return new BigDecimal("10000");
        if (minutesUntilStart < 240) return new BigDecimal("15000");
        if (minutesUntilStart < 360) return new BigDecimal("20000");
        return new BigDecimal("30000");
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

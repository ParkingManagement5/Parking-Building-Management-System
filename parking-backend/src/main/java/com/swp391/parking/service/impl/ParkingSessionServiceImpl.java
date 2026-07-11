package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
import com.swp391.parking.dto.request.SessionQrScanRequest;
import com.swp391.parking.dto.response.QrTokenResponse;
import com.swp391.parking.dto.response.SessionResponse;
import com.swp391.parking.entity.*;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.repository.*;
import com.swp391.parking.service.NotificationService;
import com.swp391.parking.service.ParkingSessionService;
import com.swp391.parking.service.PaymentService;
import com.swp391.parking.util.FeeCalculatorUtil;
import com.swp391.parking.util.LicensePlateUtil;
import com.swp391.parking.util.QrTokenUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParkingSessionServiceImpl implements ParkingSessionService {

    private final ParkingSessionRepository sessionRepository;
    private final BookingRepository bookingRepository;
    private final GateLogRepository gateLogRepository;
    // BE2 repositories
    private final ParkingSlotRepository parkingSlotRepository;
    private final GateRepository gateRepository;
    private final VehicleRepository vehicleRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final UserRepository userRepository;
    private final PricingPolicyRepository pricingPolicyRepository;
    private final QrTokenUtil qrTokenUtil;
    private final SlotAssignmentService slotAssignmentService;
    private final NotificationService notificationService;
    private final PaymentService paymentService;
    private final FeeCalculatorUtil feeCalculatorUtil;

    @Override
    @Transactional
    public SessionResponse processEntry(SessionEntryRequest request) {
        Gate gate = gateRepository.findById(request.getGateId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy gate"));

        if (!Boolean.TRUE.equals(gate.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Gate " + gate.getGateCode() + " đang inactive");
        }
        if (gate.getGateType() != null
                && gate.getGateType() != Gate.GateType.ENTRY
                && gate.getGateType() != Gate.GateType.BOTH) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Gate " + gate.getGateCode() + " không phải cổng vào (type: " + gate.getGateType() + ")");
        }

        ParkingSession.EntryMode mode;
        try {
            mode = ParkingSession.EntryMode.valueOf(request.getEntryMode());
        } catch (IllegalArgumentException e) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "entryMode không hợp lệ: " + request.getEntryMode() + ". Dùng: BOOKING, WALK_IN_AUTO, WALK_IN_MANUAL");
        }
        ParkingSession session;
        if (mode == ParkingSession.EntryMode.BOOKING) {
            session = processBookingEntry(request, gate);
        } else if (mode == ParkingSession.EntryMode.BOOKING_STAFF_OVERRIDE) {
            session = processBookingStaffOverride(request, gate);
        } else {
            session = processWalkInEntry(request, gate, mode);
        }

        saveGateLog(gate, session, request.getLicensePlate(),
                GateLog.EventType.ENTRY, GateLog.ResultStatus.SUCCESS, request.getStaffUserId());

        notificationService.notify(session.getUserId(),
                "Xe đã vào bãi",
                "Xe " + session.getVehicle().getLicensePlate() + " đã vào slot " + session.getSlot().getSlotCode() + ".",
                "success", "SESSION", session.getId().intValue());

        Long entryBuildingId = gate.getBuilding() != null ? gate.getBuilding().getId() : null;
        if (entryBuildingId != null) {
            notificationService.notifyStaffInBuilding(entryBuildingId, "Xe vào bãi",
                    "Xe " + session.getVehicle().getLicensePlate() + " vào slot " + session.getSlot().getSlotCode(),
                    "info", "SESSION", session.getId().intValue());
        } else {
            notificationService.notifyAllStaff("Xe vào bãi",
                    "Xe " + session.getVehicle().getLicensePlate() + " vào slot " + session.getSlot().getSlotCode(),
                    "info", "SESSION", session.getId().intValue());
        }

        return toResponse(session);
    }

    private ParkingSession processBookingEntry(SessionEntryRequest request, Gate gate) {
        if (request.getQrToken() == null || request.getQrToken().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Thiếu QR token");
        }

        Claims claims;
        try {
            claims = qrTokenUtil.parseQrToken(request.getQrToken());
        } catch (JwtException e) {
            throw new AppException(HttpStatus.BAD_REQUEST, "QR không hợp lệ hoặc đã hết hạn");
        }

        Long bookingId = claims.get("booking_id", Long.class);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy booking"));

        // [BR-05] QR dùng 1 lần
        if (booking.getQrUsedAt() != null) {
            throw new AppException(HttpStatus.CONFLICT, "QR đã được dùng rồi");
        }
        if (booking.getStatus() != Booking.BookingStatus.CONFIRMED) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking không còn hiệu lực");
        }
        // QR phải match token hiện tại trong DB (revoke QR cũ sau regenerate)
        if (booking.getQrToken() == null || !booking.getQrToken().equals(request.getQrToken())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "QR đã bị thay thế bởi token mới. Dùng QR mới nhất.");
        }

        // Verify biển số xe khớp với booking
        String bookingPlate = booking.getVehicle().getLicensePlate();
        if (request.getLicensePlate() == null || request.getLicensePlate().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Thiếu biển số xe. Staff cần xác minh biển số xe khớp với booking (biển đăng ký: " + bookingPlate + ")");
        }
        if (!LicensePlateUtil.equivalent(request.getLicensePlate(), bookingPlate)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Biển số xe không khớp. QR booking cho xe " + bookingPlate + " nhưng biển scan là " + request.getLicensePlate());
        }

        // [BR-06b] Xe đang có session chưa hoàn tất → không cho check-in
        boolean hasOpenSession = sessionRepository.existsByVehicle_IdAndStatusIn(
                booking.getVehicle().getId(),
                List.of(ParkingSession.SessionStatus.ACTIVE, ParkingSession.SessionStatus.WAITING_PAYMENT)
        );
        if (hasOpenSession) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Xe đang có phiên đỗ xe chưa hoàn tất, không thể check-in");
        }

        booking.setQrUsedAt(LocalDateTime.now());
        booking.setStatus(Booking.BookingStatus.CHECKED_IN);
        bookingRepository.save(booking);

        // Slot → OCCUPIED
        ParkingSlot slot = booking.getSlot();
        slot.setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(slot);

        ParkingSession session = ParkingSession.builder()
                .booking(booking)
                .slot(slot)
                .userId(booking.getUserId())
                .vehicle(booking.getVehicle())
                .entryGate(gate)
                .entryTime(LocalDateTime.now())
                .entryMode(ParkingSession.EntryMode.BOOKING)
                .status(ParkingSession.SessionStatus.ACTIVE)
                .build();

        return sessionRepository.save(session);
    }

    /**
     * Staff override: cho xe vào khi QR entry thất bại.
     * Bỏ qua QR, tìm booking CONFIRMED theo biển số, tạo session gắn booking bình thường.
     * Exit vẫn cần QR (generateExitQr từ app driver), payment vẫn tính đủ.
     */
    private ParkingSession processBookingStaffOverride(SessionEntryRequest request, Gate gate) {
        if (request.getLicensePlate() == null || request.getLicensePlate().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Thiếu biển số xe để tìm booking");
        }

        Vehicle vehicle = findByEquivalentLicensePlate(request.getLicensePlate())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy xe biển số " + request.getLicensePlate() + " trong hệ thống"));

        Booking booking = bookingRepository.findByVehicle_IdAndStatusIn(
                vehicle.getId(), List.of(Booking.BookingStatus.CONFIRMED))
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy booking CONFIRMED cho xe " + vehicle.getLicensePlate()
                        + ". Dùng Walk-in nếu xe không có booking."));

        boolean hasOpenSession = sessionRepository.existsByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(ParkingSession.SessionStatus.ACTIVE, ParkingSession.SessionStatus.WAITING_PAYMENT));
        if (hasOpenSession) {
            throw new AppException(HttpStatus.CONFLICT, "Xe đang có phiên đỗ xe chưa hoàn tất");
        }

        booking.setStatus(Booking.BookingStatus.CHECKED_IN);
        bookingRepository.save(booking);

        ParkingSlot slot = booking.getSlot();
        slot.setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(slot);

        return sessionRepository.save(ParkingSession.builder()
                .booking(booking)
                .slot(slot)
                .userId(booking.getUserId())
                .vehicle(vehicle)
                .entryGate(gate)
                .entryTime(LocalDateTime.now())
                .entryMode(ParkingSession.EntryMode.BOOKING_STAFF_OVERRIDE)
                .status(ParkingSession.SessionStatus.ACTIVE)
                .build());
    }

//    private ParkingSession processWalkInEntry(SessionEntryRequest request, Gate gate,
//                                              ParkingSession.EntryMode mode) {
//        if (request.getLicensePlate() == null || request.getLicensePlate().isBlank()) {
//            throw new AppException(HttpStatus.BAD_REQUEST, "Thiếu biển số xe");
//        }
//        if (request.getSlotId() == null) {
//            throw new AppException(HttpStatus.BAD_REQUEST, "Thiếu slotId cho walk-in");
//        }
//
//        Vehicle vehicle = vehicleRepository.findByLicensePlate(request.getLicensePlate())
//                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
//
//        ParkingSlot slot = parkingSlotRepository.findById(request.getSlotId())
//                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy slot"));
//
//        if (slot.getStatus() != ParkingSlot.Status.AVAILABLE) {
//            throw new AppException(HttpStatus.CONFLICT,
//                    "Slot " + slot.getSlotCode() + " không còn trống");
//        }
//
//        slot.setStatus(ParkingSlot.Status.OCCUPIED);
//        parkingSlotRepository.save(slot);
//
//        ParkingSession session = ParkingSession.builder()
//                .slot(slot)
//                .userId(vehicle.getUserId())
//                .vehicle(vehicle)
//                .entryGate(gate)
//                .entryTime(LocalDateTime.now())
//                .entryMode(mode)
//                .status(ParkingSession.SessionStatus.ACTIVE)
//                .build();
//
//        return sessionRepository.save(session);
//    }

    private ParkingSession processWalkInEntry(SessionEntryRequest request, Gate gate,
                                              ParkingSession.EntryMode mode) {
        if (request.getLicensePlate() == null || request.getLicensePlate().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Thiếu biển số xe");
        }

        Vehicle vehicle = findOrCreateWalkInVehicle(request);

        // [BR-06] Xe đang có session chưa hoàn tất → không cho vào
        boolean hasOpenSession = sessionRepository.existsByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(
                        ParkingSession.SessionStatus.ACTIVE,
                        ParkingSession.SessionStatus.WAITING_PAYMENT
                )
        );
        if (hasOpenSession) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Xe đang có phiên đỗ xe chưa hoàn tất");
        }

        // [BR-06b] Xe đang có booking active → không cho walk-in
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
                    "Xe đang có booking active (#" + b.getId() + "), không thể walk-in");
        });
        ParkingSlot slot;
        if (mode == ParkingSession.EntryMode.WALK_IN_AUTO) {
            // Tự động tìm slot theo slotSize của loại xe [BR-02]
            // Phai gioi han theo dung building cua gate — truoc day truyen null
            // khien slot co the duoc gan tu MOT TOA NHA KHAC, lam session bi
            // "bien mat" khoi danh sach cua staff (staff bi gioi han xem theo
            // dung building duoc phan cong) du session/slot van luu dung.
            Long entryBuildingId = gate.getBuilding() != null ? gate.getBuilding().getId() : null;
            slot = slotAssignmentService.assignBestSlot(entryBuildingId,
                    vehicle.getVehicleType().getSlotSize());
        } else {
            // WALK_IN_MANUAL: staff chỉ định slot
            if (request.getSlotId() == null) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Thiếu slotId cho walk-in manual");
            }
            slot = slotAssignmentService.assignSpecificSlot(request.getSlotId());
        }

        slot.setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(slot);

        ParkingSession session = ParkingSession.builder()
                .slot(slot)
                .userId(vehicle.getUserId())
                .vehicle(vehicle)
                .entryGate(gate)
                .entryTime(LocalDateTime.now())
                .entryMode(mode)
                .status(ParkingSession.SessionStatus.ACTIVE)
                .build();

        return sessionRepository.save(session);
    }

    @Override
    @Transactional
    public SessionResponse processExit(Long sessionId, SessionExitRequest request) {
        ParkingSession session = getSessionEntity(sessionId);
        if (session.getStatus() != ParkingSession.SessionStatus.ACTIVE) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Session không ACTIVE (hiện: " + session.getStatus() + ")");
        }
        boolean isWalkIn = session.getEntryMode() == ParkingSession.EntryMode.WALK_IN_AUTO
                || session.getEntryMode() == ParkingSession.EntryMode.WALK_IN_MANUAL;
        boolean staffForceExit = Boolean.TRUE.equals(request.getStaffForceExit());
        if (!isWalkIn && !Boolean.TRUE.equals(request.getQrVerified()) && !staffForceExit) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Exit requires a valid driver Exit QR");
        }

        Gate gate = gateRepository.findById(request.getGateId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy gate"));

        if (!Boolean.TRUE.equals(gate.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Gate " + gate.getGateCode() + " đang inactive");
        }
        if (gate.getGateType() != null
                && gate.getGateType() != Gate.GateType.EXIT
                && gate.getGateType() != Gate.GateType.BOTH) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Gate " + gate.getGateCode() + " không phải cổng ra (type: " + gate.getGateType() + ")");
        }

        session.setExitGate(gate);
        session.setExitTime(LocalDateTime.now());

        // ── Pass model: WEEKLY/MONTHLY mid-period exit ───────────────────────
        // Nếu xe ra trước bookingEndTime → giữ slot RESERVED, reset booking CONFIRMED
        // để driver có thể quét lại QR cũ và vào bãi trong cùng kỳ hạn.
        Booking booking = session.getBooking();
        String bookingType = booking != null ? booking.getBookingType() : null;
        boolean isPassBooking = "WEEKLY".equalsIgnoreCase(bookingType)
                || "MONTHLY".equalsIgnoreCase(bookingType);
        boolean isMidPeriodExit = isPassBooking
                && booking.getBookingEndTime() != null
                && session.getExitTime().isBefore(booking.getBookingEndTime());

        if (isMidPeriodExit) {
            session.setStatus(ParkingSession.SessionStatus.COMPLETED);
            session = sessionRepository.save(session);

            booking.setStatus(Booking.BookingStatus.CONFIRMED);
            booking.setQrUsedAt(null);
            bookingRepository.save(booking);

            ParkingSlot passSlot = session.getSlot();
            if (passSlot != null) {
                passSlot.setStatus(ParkingSlot.Status.RESERVED);
                parkingSlotRepository.save(passSlot);
            }

            saveGateLog(gate, session, session.getVehicle().getLicensePlate(),
                    GateLog.EventType.EXIT, GateLog.ResultStatus.SUCCESS, request.getStaffUserId());

            String plate = session.getVehicle().getLicensePlate();
            log.info("Session #{} mid-period exit for booking #{} ({}), slot RESERVED",
                    sessionId, booking.getId(), bookingType);

            notificationService.notify(session.getUserId(), "Xe đã ra bãi",
                    "Xe " + plate + " đã ra. Slot vẫn được giữ đến "
                            + booking.getBookingEndTime() + ". Có thể vào lại với QR.",
                    "info", "SESSION", session.getId().intValue());

            Long midBuildingId = gate.getBuilding() != null ? gate.getBuilding().getId() : null;
            if (midBuildingId != null) {
                notificationService.notifyStaffInBuilding(midBuildingId, "Xe ra (pass)",
                        "Xe " + plate + " ra bãi, slot giữ cho booking " + bookingType + " #" + booking.getId(),
                        "info", "SESSION", session.getId().intValue());
            } else {
                notificationService.notifyAllStaff("Xe ra (pass)",
                        "Xe " + plate + " ra bãi, slot giữ cho booking " + bookingType + " #" + booking.getId(),
                        "info", "SESSION", session.getId().intValue());
            }
            return toResponse(session);
        }
        // ─────────────────────────────────────────────────────────────────────

        // Exit chi ghi nhan xe ra cong; session chi COMPLETED sau khi parking fee duoc confirm.
        session.setStatus(ParkingSession.SessionStatus.WAITING_PAYMENT);
        session = sessionRepository.save(session);

        if (booking != null && booking.getStatus() == Booking.BookingStatus.CHECKED_IN) {
            booking.setStatus(Booking.BookingStatus.WAITING_PAYMENT);
            bookingRepository.save(booking);
        }

        // Cancel booking mồ côi: xe walk-in exit nhưng có booking riêng chưa dùng
        cancelOrphanedBookings(session);

        saveGateLog(gate, session, session.getVehicle().getLicensePlate(),
                GateLog.EventType.EXIT, GateLog.ResultStatus.MANUAL_CHECK, request.getStaffUserId());

        log.info("Session #{} exit recorded, WAITING_PAYMENT", sessionId);

        notificationService.notify(session.getUserId(),
                "Xe đã ra bãi",
                "Xe " + session.getVehicle().getLicensePlate() + " đã ra khỏi bãi. Vui lòng chờ thanh toán.",
                "warning", "SESSION", session.getId().intValue());

        Long exitBuildingId = gate.getBuilding() != null ? gate.getBuilding().getId() : null;
        if (exitBuildingId != null) {
            notificationService.notifyStaffInBuilding(exitBuildingId, "Xe ra bãi",
                    "Xe " + session.getVehicle().getLicensePlate() + " đã ra. Chờ thanh toán phí đỗ xe.",
                    "warning", "SESSION", session.getId().intValue());
        } else {
            notificationService.notifyAllStaff("Xe ra bãi",
                    "Xe " + session.getVehicle().getLicensePlate() + " đã ra. Chờ thanh toán phí đỗ xe.",
                    "warning", "SESSION", session.getId().intValue());
        }

        // Tao san parking fee PENDING de staff co the thu CASH hoac sinh QR VNPay ngay.
        paymentService.createParkingFee(
                session.getId().intValue(),
                booking != null && booking.getId() != null ? booking.getId().intValue() : null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                BigDecimal.ZERO,
                Payment.PaymentMethod.CASH
        );

        return toResponse(session);
    }

    @Override
    @Transactional
    public SessionResponse processExitQr(SessionQrScanRequest request) {
        Long sessionId = parseExitQrSessionId(request.getQrToken());

        ParkingSession session = getSessionEntity(sessionId);
        String sessionPlate = session.getVehicle() != null ? session.getVehicle().getLicensePlate() : null;

        if (request.getLicensePlate() == null || request.getLicensePlate().isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Thiếu biển số xe. Cần xác minh biển số khớp với session (biển: " + sessionPlate + ")");
        }
        if (sessionPlate != null && !LicensePlateUtil.equivalent(request.getLicensePlate(), sessionPlate)) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Biển số không khớp. Session cho xe " + sessionPlate + " nhưng biển scan là " + request.getLicensePlate());
        }

        SessionExitRequest exitRequest = new SessionExitRequest();
        exitRequest.setGateId(request.getGateId());
        exitRequest.setStaffUserId(request.getStaffUserId());
        exitRequest.setQrVerified(true);
        return processExit(sessionId, exitRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public QrTokenResponse generateExitQr(Long sessionId, Long currentUserId) {
        ParkingSession session = getSessionEntity(sessionId);
        if (session.getStatus() != ParkingSession.SessionStatus.ACTIVE) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Chỉ session ACTIVE mới tạo được Exit QR");
        }
        if (!Objects.equals(session.getUserId(), currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Không thể tạo Exit QR cho session của người khác");
        }
        if (session.getVehicle() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Session chưa có thông tin xe");
        }

        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(30);
        String token = qrTokenUtil.generateExitQrToken(
                session.getId(),
                session.getUserId(),
                session.getVehicle().getLicensePlate(),
                session.getBooking() != null ? session.getBooking().getId() : null,
                expiresAt
        );

        return QrTokenResponse.builder()
                .qrToken(token)
                .purpose("EXIT")
                .expiresAt(expiresAt)
                .sessionId(session.getId())
                .licensePlate(session.getVehicle().getLicensePlate())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResponse getSession(Long sessionId) {
        return toResponse(getSessionEntity(sessionId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionResponse> getMySessions(Long currentUserId) {
        return sessionRepository.findByUserIdOrderByCreatedAtDesc(currentUserId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionResponse> getSessions(String status, String keyword, Long currentUserId, boolean staffScoped) {
        Long buildingId = resolveScopedBuildingId(currentUserId, staffScoped);
        if (keyword != null && !keyword.isBlank() && status != null && !status.isBlank()) {
            ParkingSession.SessionStatus sessionStatus = ParkingSession.SessionStatus.valueOf(status.trim().toUpperCase());
            return searchByPlateOrId(keyword, sessionStatus, buildingId).stream().map(this::toResponse).toList();
        }

        if (keyword != null && !keyword.isBlank()) {
            return searchByPlateOrId(keyword, null, buildingId).stream().map(this::toResponse).toList();
        }

        if (status != null && !status.isBlank()) {
            ParkingSession.SessionStatus sessionStatus = ParkingSession.SessionStatus.valueOf(status.trim().toUpperCase());
            List<ParkingSession> sessions = buildingId != null
                    ? sessionRepository.findByStatusAndBuildingIdOrderByCreatedAtDesc(sessionStatus, buildingId)
                    : sessionRepository.findByStatusOrderByCreatedAtDesc(sessionStatus);
            return sessions
                    .stream().map(this::toResponse).toList();
        }

        List<ParkingSession> sessions = buildingId != null
                ? sessionRepository.findAllByBuildingIdOrderByCreatedAtDesc(buildingId)
                : sessionRepository.findAllByOrderByCreatedAtDesc();
        return sessions
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<SessionResponse> findActiveByPlate(String plate) {
        List<ParkingSession.SessionStatus> activeStatuses = List.of(
                ParkingSession.SessionStatus.ACTIVE,
                ParkingSession.SessionStatus.WAITING_PAYMENT);
        for (String candidate : LicensePlateUtil.lookupCandidates(plate)) {
            for (ParkingSession.SessionStatus status : activeStatuses) {
                List<ParkingSession> found = sessionRepository.searchByPlateOrIdAndStatus(candidate, status);
                Optional<ParkingSession> match = found.stream()
                        .filter(s -> s.getVehicle() != null
                                && LicensePlateUtil.equivalent(s.getVehicle().getLicensePlate(), plate))
                        .findFirst();
                if (match.isPresent()) return match.map(this::toResponse);
            }
        }
        return Optional.empty();
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private ParkingSession getSessionEntity(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy session #" + id));
    }

    private void cancelOrphanedBookings(ParkingSession session) {
        Vehicle vehicle = session.getVehicle();
        if (vehicle == null) return;

        Long linkedBookingId = session.getBooking() != null ? session.getBooking().getId() : null;

        bookingRepository.findByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(
                        Booking.BookingStatus.PENDING_PAYMENT,
                        Booking.BookingStatus.CONFIRMED
                )
        ).ifPresent(orphan -> {
            if (linkedBookingId == null || !orphan.getId().equals(linkedBookingId)) {
                orphan.setStatus(Booking.BookingStatus.CANCELLED);
                ParkingSlot bookingSlot = orphan.getSlot();
                if (bookingSlot != null && bookingSlot.getStatus() == ParkingSlot.Status.RESERVED) {
                    bookingSlot.setStatus(ParkingSlot.Status.AVAILABLE);
                    parkingSlotRepository.save(bookingSlot);
                }
                bookingRepository.save(orphan);
                log.info("Cancelled orphaned booking #{} for vehicle plate {}",
                        orphan.getId(), vehicle.getLicensePlate());
            }
        });
    }

    private void saveGateLog(Gate gate, ParkingSession session, String plate,
                             GateLog.EventType evt, GateLog.ResultStatus result, Long staffId) {
        gateLogRepository.save(GateLog.builder()
                .gate(gate).session(session).licensePlate(plate)
                .eventType(evt).resultStatus(result)
                .staffUserId(staffId)
                .eventTime(LocalDateTime.now())
                .build());
    }

    private Vehicle findOrCreateWalkInVehicle(SessionEntryRequest request) {
        String licensePlate = LicensePlateUtil.normalizeDisplay(request.getLicensePlate());
        return findByEquivalentLicensePlate(licensePlate)
                .orElseGet(() -> createWalkInGuestVehicle(request, licensePlate));
    }

    private Vehicle createWalkInGuestVehicle(SessionEntryRequest request, String licensePlate) {
        VehicleType vehicleType = resolveWalkInVehicleType(request.getVehicleTypeId());
        Long ownerUserId = resolveWalkInOwnerUserId(request.getStaffUserId());

        Vehicle vehicle = Vehicle.builder()
                .userId(ownerUserId)
                .vehicleType(vehicleType)
                .licensePlate(licensePlate)
                .brand("Walk-in")
                .model("Guest")
                .color("")
                .isActive(true)
                .build();

        return vehicleRepository.save(vehicle);
    }

    private VehicleType resolveWalkInVehicleType(Long vehicleTypeId) {
        if (vehicleTypeId != null) {
            return vehicleTypeRepository.findById(vehicleTypeId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy loại xe ID: " + vehicleTypeId));
        }

        return vehicleTypeRepository.findByIsActiveTrue().stream()
                .filter(type -> type.getSlotSize() == VehicleType.SlotSize.MEDIUM)
                .findFirst()
                .or(() -> vehicleTypeRepository.findByIsActiveTrue().stream().findFirst())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST,
                        "Chưa có loại xe active để tạo walk-in"));
    }

    private Long resolveWalkInOwnerUserId(Long staffUserId) {
        if (staffUserId != null) {
            return staffUserId;
        }

        return userRepository.findAll().stream()
                .findFirst()
                .map(user -> user.getUserId().longValue())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST,
                        "Không tìm thấy user để tạo walk-in"));
    }

    private Long claimLong(Claims claims, String key) {
        Object value = claims.get(key);
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Long.parseLong(text);
        }
        return null;
    }

    private Long parseExitQrSessionId(String qrToken) {
        try {
            return qrTokenUtil.parseExitSessionId(qrToken);
        } catch (JwtException | IllegalArgumentException compactError) {
            String msg = compactError.getMessage();
            if (msg != null && msg.toLowerCase().contains("expired")) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Exit QR đã hết hạn. Yêu cầu driver tạo lại Exit QR mới từ Current Session.");
            }
            try {
                Claims claims = qrTokenUtil.parseQrToken(qrToken);
                if (!"QR_SESSION_EXIT".equals(claims.getSubject()) || !"EXIT".equals(claims.get("purpose", String.class))) {
                    throw new AppException(HttpStatus.BAD_REQUEST, "QR này không phải Exit QR");
                }
                Long sessionId = claimLong(claims, "session_id");
                if (sessionId == null) {
                    throw new AppException(HttpStatus.BAD_REQUEST, "Exit QR thiếu session_id");
                }
                return sessionId;
            } catch (AppException ae) {
                throw ae;
            } catch (JwtException | IllegalArgumentException jwtError) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Exit QR không hợp lệ. Kiểm tra lại token hoặc yêu cầu driver tạo mới.");
            }
        }
    }

    private Optional<Vehicle> findByEquivalentLicensePlate(String licensePlate) {
        return LicensePlateUtil.lookupCandidates(licensePlate).stream()
                .map(vehicleRepository::findByLicensePlate)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst();
    }

    private List<ParkingSession> searchByPlateOrId(String keyword, ParkingSession.SessionStatus status, Long buildingId) {
        Map<Long, ParkingSession> matches = new LinkedHashMap<>();
        LicensePlateUtil.lookupCandidates(keyword).forEach(candidate -> {
            List<ParkingSession> found;
            if (buildingId != null) {
                found = status != null
                        ? sessionRepository.searchByPlateOrIdAndStatusAndBuildingId(candidate, status, buildingId)
                        : sessionRepository.searchByPlateOrIdAndBuildingId(candidate, buildingId);
            } else {
                found = status != null
                        ? sessionRepository.searchByPlateOrIdAndStatus(candidate, status)
                        : sessionRepository.searchByPlateOrId(candidate);
            }
            found.forEach(session -> matches.putIfAbsent(session.getId(), session));
        });
        return matches.values().stream().toList();
    }

    private Long resolveScopedBuildingId(Long currentUserId, boolean staffScoped) {
        if (!staffScoped) {
            return null;
        }
        User currentUser = userRepository.findById(Math.toIntExact(currentUserId))
                .orElseThrow(() -> new AppException(HttpStatus.UNAUTHORIZED, "Không tìm thấy staff hiện tại"));
        if (currentUser.getAssignedBuilding() == null || currentUser.getAssignedBuilding().getId() == null) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Staff chưa được gán toà nhà, không thể xem danh sách session");
        }
        return currentUser.getAssignedBuilding().getId();
    }

    private BigDecimal resolveHourlyRate(ParkingSession s) {
        if (s.getVehicle() == null || s.getVehicle().getVehicleType() == null) {
            return new BigDecimal("20000");
        }
        Long vehicleTypeId = s.getVehicle().getVehicleType().getId();
        // Dung TAT CA phien ban gia (ke ca da bi Manager thay the) de resolve dung
        // gia da ap dung tai thoi diem entryTime, khong bi anh huong boi lan sua gia
        // sau nay.
        List<PricingPolicy> policies = pricingPolicyRepository.findByVehicleType_Id(vehicleTypeId);
        LocalDateTime refTime = s.getEntryTime() != null ? s.getEntryTime() : LocalDateTime.now();
        return feeCalculatorUtil.resolveHourlyRate(policies, refTime);
    }

    private SessionResponse toResponse(ParkingSession s) {
        BigDecimal hourlyRate = resolveHourlyRate(s);
        List<PricingPolicy> activePolicies = List.of();
        if (s.getVehicle() != null && s.getVehicle().getVehicleType() != null) {
            activePolicies = pricingPolicyRepository.findByVehicleType_Id(
                    s.getVehicle().getVehicleType().getId());
        }
        LocalDateTime endTime = s.getExitTime() != null ? s.getExitTime() : LocalDateTime.now();
        String bookingType = s.getBooking() != null ? s.getBooking().getBookingType() : null;
        LocalDateTime bookingEndTime = s.getBooking() != null ? s.getBooking().getBookingEndTime() : null;
        BigDecimal calculatedFee = s.getEntryTime() != null
                ? feeCalculatorUtil.calculateSessionFee(s.getEntryTime(), endTime, activePolicies, hourlyRate, bookingType, bookingEndTime)
                : BigDecimal.ZERO;
        BigDecimal depositAmount = s.getBooking() != null ? s.getBooking().getDepositAmount() : BigDecimal.ZERO;

        var slot = s.getSlot();
        var zone = slot != null ? slot.getZone() : null;
        var floor = zone != null ? zone.getFloor() : null;
        var building = floor != null ? floor.getBuilding() : null;

        return SessionResponse.builder()
                .sessionId(s.getId())
                .bookingId(s.getBooking() != null ? s.getBooking().getId() : null)
                .slotId(slot != null ? slot.getId() : null)
                .slotCode(slot != null ? slot.getSlotCode() : null)
                .userId(s.getUserId())
                .vehicleId(s.getVehicle() != null ? s.getVehicle().getId() : null)
                .licensePlate(s.getVehicle() != null ? s.getVehicle().getLicensePlate() : null)
                .vehicleTypeId(s.getVehicle() != null && s.getVehicle().getVehicleType() != null
                        ? s.getVehicle().getVehicleType().getId() : null)
                .vehicleTypeName(s.getVehicle() != null && s.getVehicle().getVehicleType() != null
                        ? s.getVehicle().getVehicleType().getName() : null)
                .entryGateId(s.getEntryGate() != null ? s.getEntryGate().getId() : null)
                .entryGateCode(s.getEntryGate() != null ? s.getEntryGate().getGateCode() : null)
                .exitGateId(s.getExitGate() != null ? s.getExitGate().getId() : null)
                .exitGateCode(s.getExitGate() != null ? s.getExitGate().getGateCode() : null)
                .entryTime(s.getEntryTime())
                .exitTime(s.getExitTime())
                .entryMode(s.getEntryMode() != null ? s.getEntryMode().name() : null)
                .status(s.getStatus() != null ? s.getStatus().name() : null)
                .createdAt(s.getCreatedAt())
                .calculatedFee(calculatedFee)
                .hourlyRate(hourlyRate)
                .depositAmount(depositAmount)
                .buildingId(building != null ? building.getId() : null)
                .buildingName(building != null ? building.getName() : null)
                .floorId(floor != null ? floor.getId() : null)
                .floorName(floor != null ? floor.getName() : null)
                .zoneId(zone != null ? zone.getId() : null)
                .zoneName(zone != null ? zone.getName() : null)
                .build();
    }
}

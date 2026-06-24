package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
import com.swp391.parking.dto.request.SessionQrScanRequest;
import com.swp391.parking.dto.response.QrTokenResponse;
import com.swp391.parking.dto.response.SessionResponse;
import com.swp391.parking.entity.*;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.*;
import com.swp391.parking.service.NotificationService;
import com.swp391.parking.service.ParkingSessionService;
import com.swp391.parking.util.QrTokenUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

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
    private final QrTokenUtil qrTokenUtil;
    private final SlotAssignmentService slotAssignmentService;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public SessionResponse processEntry(SessionEntryRequest request) {
        Gate gate = gateRepository.findById(request.getGateId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy gate"));

        ParkingSession.EntryMode mode = ParkingSession.EntryMode.valueOf(request.getEntryMode());
        ParkingSession session = (mode == ParkingSession.EntryMode.BOOKING)
                ? processBookingEntry(request, gate)
                : processWalkInEntry(request, gate, mode);

        saveGateLog(gate, session, request.getLicensePlate(),
                GateLog.EventType.ENTRY, GateLog.ResultStatus.SUCCESS, request.getStaffUserId());

        notificationService.notify(session.getUserId(),
                "Xe da vao bai",
                "Xe " + session.getVehicle().getLicensePlate() + " da vao slot " + session.getSlot().getSlotCode() + ".",
                "success", "SESSION", session.getId().intValue());

        notificationService.notifyAllStaff("Xe vao bai",
                "Xe " + session.getVehicle().getLicensePlate() + " vao slot " + session.getSlot().getSlotCode(),
                "info", "SESSION", session.getId().intValue());

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
            slot = slotAssignmentService.assignBestSlot(null,
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
        if (!isWalkIn && !Boolean.TRUE.equals(request.getQrVerified())) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Exit requires a valid driver Exit QR");
        }

        Gate gate = gateRepository.findById(request.getGateId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy gate"));

        session.setExitGate(gate);
        session.setExitTime(LocalDateTime.now());
        // [BR-09] Chờ BE4 xử lý payment → mới COMPLETED
        session.setStatus(ParkingSession.SessionStatus.WAITING_PAYMENT);
        session = sessionRepository.save(session);

        // Cập nhật booking gắn với session (nếu có)
        Booking booking = session.getBooking();
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
                "Xe da ra bai",
                "Xe " + session.getVehicle().getLicensePlate() + " da ra khoi bai. Vui long cho thanh toan.",
                "warning", "SESSION", session.getId().intValue());

        notificationService.notifyAllStaff("Xe ra bai",
                "Xe " + session.getVehicle().getLicensePlate() + " da ra. Cho thanh toan phi do xe.",
                "warning", "SESSION", session.getId().intValue());

        return toResponse(session);
    }

    @Override
    @Transactional
    public SessionResponse processExitQr(SessionQrScanRequest request) {
        Long sessionId = parseExitQrSessionId(request.getQrToken());

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
                    "Chi session ACTIVE moi tao duoc Exit QR");
        }
        if (!Objects.equals(session.getUserId(), currentUserId)) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Khong the tao Exit QR cho session cua nguoi khac");
        }
        if (session.getVehicle() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Session chua co thong tin xe");
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
    public List<SessionResponse> getSessions(String status, String keyword) {
        if (keyword != null && !keyword.isBlank()) {
            return sessionRepository.searchByPlateOrId(keyword.trim())
                    .stream().map(this::toResponse).toList();
        }

        if (status != null && !status.isBlank()) {
            ParkingSession.SessionStatus sessionStatus = ParkingSession.SessionStatus.valueOf(status.trim().toUpperCase());
            return sessionRepository.findByStatusOrderByCreatedAtDesc(sessionStatus)
                    .stream().map(this::toResponse).toList();
        }

        return sessionRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).toList();
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
        String licensePlate = normalizePlate(request.getLicensePlate());
        return vehicleRepository.findByLicensePlate(licensePlate)
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
                            "Khong tim thay loai xe ID: " + vehicleTypeId));
        }

        return vehicleTypeRepository.findByIsActiveTrue().stream()
                .filter(type -> type.getSlotSize() == VehicleType.SlotSize.MEDIUM)
                .findFirst()
                .or(() -> vehicleTypeRepository.findByIsActiveTrue().stream().findFirst())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST,
                        "Chua co loai xe active de tao walk-in"));
    }

    private Long resolveWalkInOwnerUserId(Long staffUserId) {
        if (staffUserId != null) {
            return staffUserId;
        }

        return userRepository.findAll().stream()
                .findFirst()
                .map(user -> user.getUserId().longValue())
                .orElseThrow(() -> new AppException(HttpStatus.BAD_REQUEST,
                        "Khong tim thay user de tao walk-in"));
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
                        "Exit QR da het han. Yeu cau driver tao lai Exit QR moi tu Current Session.");
            }
            try {
                Claims claims = qrTokenUtil.parseQrToken(qrToken);
                if (!"QR_SESSION_EXIT".equals(claims.getSubject()) || !"EXIT".equals(claims.get("purpose", String.class))) {
                    throw new AppException(HttpStatus.BAD_REQUEST, "QR nay khong phai Exit QR");
                }
                Long sessionId = claimLong(claims, "session_id");
                if (sessionId == null) {
                    throw new AppException(HttpStatus.BAD_REQUEST, "Exit QR thieu session_id");
                }
                return sessionId;
            } catch (AppException ae) {
                throw ae;
            } catch (JwtException | IllegalArgumentException jwtError) {
                throw new AppException(HttpStatus.BAD_REQUEST,
                        "Exit QR khong hop le. Kiem tra lai token hoac yeu cau driver tao moi.");
            }
        }
    }

    private String normalizePlate(String licensePlate) {
        String normalized = licensePlate.toUpperCase().replace(" ", "");
        int separatorIndex = normalized.lastIndexOf('-');
        if (separatorIndex >= 0 && separatorIndex < normalized.length() - 1) {
            String prefix = normalized.substring(0, separatorIndex + 1);
            String serial = normalized.substring(separatorIndex + 1).replace(".", "");
            if (serial.matches("\\d{5}")) {
                return prefix + serial.substring(0, 3) + "." + serial.substring(3);
            }
        }
        return normalized;
    }

    private SessionResponse toResponse(ParkingSession s) {
        return SessionResponse.builder()
                .sessionId(s.getId())
                .bookingId(s.getBooking() != null ? s.getBooking().getId() : null)
                .slotId(s.getSlot() != null ? s.getSlot().getId() : null)
                .slotCode(s.getSlot() != null ? s.getSlot().getSlotCode() : null)
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
                .build();
    }
}

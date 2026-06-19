package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.SessionEntryRequest;
import com.swp391.parking.dto.request.SessionExitRequest;
import com.swp391.parking.dto.response.SessionResponse;
import com.swp391.parking.entity.*;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.*;
import com.swp391.parking.service.ParkingSessionService;
import com.swp391.parking.util.QrTokenUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
    private final UserRepository userRepository;
    private final QrTokenUtil qrTokenUtil;
    private final Clock clock;

    @Override
    @Transactional
    public SessionResponse processEntry(SessionEntryRequest request, String authenticatedUsername) {
        Gate gate = gateRepository.findById(request.getGateId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy gate"));

        validateEntryGate(gate);
        validateEntryBuilding(gate.getBuilding(), LocalTime.now(clock));
        ParkingSession.EntryMode mode = parseEntryMode(request.getEntryMode());
        Long actorUserId = resolveActorUserId(authenticatedUsername);
        ParkingSession session = (mode == ParkingSession.EntryMode.BOOKING)
                ? processBookingEntry(request, gate)
                : processWalkInEntry(request, gate, mode);

        saveGateLog(gate, session, session.getVehicle().getLicensePlate(),
                GateLog.EventType.ENTRY, GateLog.ResultStatus.SUCCESS, actorUserId);

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

        Vehicle vehicle = lockVehicle(booking.getVehicle());
        ensureNoOpenSession(vehicle);
        ParkingSlot slot = lockBookingSlot(booking);

        booking.setQrUsedAt(LocalDateTime.now());
        booking.setStatus(Booking.BookingStatus.CHECKED_IN);
        bookingRepository.save(booking);

        slot.setStatus(ParkingSlot.Status.OCCUPIED);
        parkingSlotRepository.save(slot);

        ParkingSession session = ParkingSession.builder()
                .booking(booking)
                .slot(slot)
                .userId(booking.getUserId())
                .vehicle(vehicle)
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
//                        "Không tìm thấy xe: " + request.getLicensePlate()));
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

        Vehicle vehicle = vehicleRepository.findByLicensePlateForUpdate(request.getLicensePlate())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy xe: " + request.getLicensePlate()));
        ensureNoOpenSession(vehicle);

        ParkingSlot slot;
        if (mode == ParkingSession.EntryMode.WALK_IN_AUTO) {
            slot = lockBestAvailableSlot(gate.getBuilding().getId(), vehicle.getVehicleType().getSlotSize());
        } else {
            // WALK_IN_MANUAL: staff chỉ định slot
            if (request.getSlotId() == null) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Thiếu slotId cho walk-in manual");
            }
            slot = parkingSlotRepository.findByIdForUpdate(request.getSlotId())
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                            "Không tìm thấy slot #" + request.getSlotId()));
            validateManualSlot(slot, vehicle, gate);
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
    public SessionResponse processExit(Long sessionId, SessionExitRequest request, String authenticatedUsername) {
        ParkingSession session = getSessionEntity(sessionId);
        if (session.getStatus() != ParkingSession.SessionStatus.ACTIVE) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Session không ACTIVE (hiện: " + session.getStatus() + ")");
        }

        Gate gate = gateRepository.findById(request.getGateId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy gate"));

        validateExitGate(gate);
        Long actorUserId = resolveActorUserId(authenticatedUsername);

        session.setExitGate(gate);
        session.setExitTime(LocalDateTime.now());
        // [BR-09] Chờ BE4 xử lý payment → mới COMPLETED
        session.setStatus(ParkingSession.SessionStatus.WAITING_PAYMENT);
        session = sessionRepository.save(session);

        saveGateLog(gate, session, session.getVehicle().getLicensePlate(),
                GateLog.EventType.EXIT, GateLog.ResultStatus.MANUAL_CHECK, actorUserId);

        log.info("Session #{} exit recorded, WAITING_PAYMENT", sessionId);
        return toResponse(session);
    }

    @Override
    @Transactional
    public SessionResponse completeSessionAfterPayment(Long sessionId) {
        ParkingSession session = getSessionEntity(sessionId);
        if (session.getStatus() != ParkingSession.SessionStatus.WAITING_PAYMENT) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Session khong o trang thai cho thanh toan");
        }

        ParkingSlot slot = session.getSlot();
        if (slot == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Session khong co slot");
        }

        session.setStatus(ParkingSession.SessionStatus.COMPLETED);
        slot.setStatus(ParkingSlot.Status.AVAILABLE);

        Booking booking = session.getBooking();
        if (booking != null && booking.getStatus() == Booking.BookingStatus.CHECKED_IN) {
            booking.setStatus(Booking.BookingStatus.COMPLETED);
            bookingRepository.save(booking);
        }

        parkingSlotRepository.save(slot);
        sessionRepository.save(session);

        return toResponse(session);
    }

    @Override
    public SessionResponse getSession(Long sessionId) {
        return toResponse(getSessionEntity(sessionId));
    }

    @Override
    public SessionResponse getOwnedSession(Long sessionId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy session #" + sessionId));
        ParkingSession session = getSessionEntity(sessionId);
        Vehicle vehicle = session.getVehicle();
        if (vehicle == null || !Objects.equals(vehicle.getUserId(), user.getUserId().longValue())) {
            throw new AppException(HttpStatus.NOT_FOUND,
                    "Không tìm thấy session #" + sessionId);
        }
        return toResponse(session);
    }

    @Override
    public List<SessionResponse> getMySessions(Long currentUserId) {
        return sessionRepository.findByUserIdOrderByCreatedAtDesc(currentUserId)
                .stream().map(this::toResponse).toList();
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private ParkingSession getSessionEntity(Long id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy session #" + id));
    }

    private ParkingSession.EntryMode parseEntryMode(String value) {
        if (value == null || value.isBlank()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "entryMode không hợp lệ");
        }
        try {
            return ParkingSession.EntryMode.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(HttpStatus.BAD_REQUEST, "entryMode không hợp lệ");
        }
    }

    private void validateEntryGate(Gate gate) {
        if (!Boolean.TRUE.equals(gate.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Gate không hoạt động");
        }
        if (gate.getGateType() == Gate.GateType.EXIT) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Gate EXIT không được dùng cho xe vào");
        }
    }

    private void validateEntryBuilding(ParkingBuilding building, LocalTime currentTime) {
        if (building == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Parking building is invalid");
        }
        if (!Boolean.TRUE.equals(building.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Parking building is inactive");
        }
        if (Boolean.TRUE.equals(building.getIs24Hours())) {
            return;
        }

        LocalTime openTime = building.getOpenTime();
        LocalTime closeTime = building.getCloseTime();
        if (openTime == null || closeTime == null || openTime.equals(closeTime)) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Parking building operating hours are invalid");
        }

        boolean withinOperatingHours = openTime.isBefore(closeTime)
                ? !currentTime.isBefore(openTime) && currentTime.isBefore(closeTime)
                : !currentTime.isBefore(openTime) || currentTime.isBefore(closeTime);
        if (!withinOperatingHours) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Parking building is outside operating hours");
        }
    }

    private void validateExitGate(Gate gate) {
        if (!Boolean.TRUE.equals(gate.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Gate không hoạt động");
        }
        if (gate.getGateType() == Gate.GateType.ENTRY) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Gate ENTRY không được dùng cho xe ra");
        }
    }

    private Long resolveActorUserId(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy user thao tác"))
                .getUserId()
                .longValue();
    }

    private ParkingSlot lockBookingSlot(Booking booking) {
        ParkingSlot bookingSlot = booking.getSlot();
        if (bookingSlot == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking không có slot");
        }
        ParkingSlot slot = parkingSlotRepository.findByIdForUpdate(bookingSlot.getId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy slot #" + bookingSlot.getId()));
        if (slot.getStatus() != ParkingSlot.Status.RESERVED) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Slot " + slot.getSlotCode() + " không còn RESERVED");
        }
        return slot;
    }

    private Vehicle lockVehicle(Vehicle vehicle) {
        if (vehicle == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Booking không có xe");
        }
        return vehicleRepository.findByIdForUpdate(vehicle.getId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy xe #" + vehicle.getId()));
    }

    private ParkingSlot lockBestAvailableSlot(Long buildingId, VehicleType.SlotSize slotSize) {
        ParkingSlot.SlotSize targetSize = ParkingSlot.SlotSize.valueOf(slotSize.name());
        return parkingSlotRepository.findFirstAvailableByBuildingAndSlotSizeForUpdate(
                        buildingId, targetSize, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .orElseThrow(() -> new AppException(HttpStatus.CONFLICT,
                        "Không còn slot trống cho kích cỡ " + slotSize
                                + " tại tòa nhà #" + buildingId));
    }

    private void ensureNoOpenSession(Vehicle vehicle) {
        boolean hasOpenSession = sessionRepository.existsByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(
                        ParkingSession.SessionStatus.ACTIVE,
                        ParkingSession.SessionStatus.WAITING_PAYMENT
                )
        );
        if (hasOpenSession) {
            throw new AppException(
                    HttpStatus.CONFLICT,
                    "Xe đang có phiên đỗ xe chưa hoàn tất"
            );
        }
    }

    private void validateManualSlot(ParkingSlot slot, Vehicle vehicle, Gate gate) {
        if (slot == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Slot khong hop le");
        }
        if (!Boolean.TRUE.equals(slot.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Slot khong hoat dong");
        }
        if (slot.getStatus() == ParkingSlot.Status.MAINTENANCE) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Slot khong trong");
        }
        if (slot.getStatus() != ParkingSlot.Status.AVAILABLE) {
            throw new AppException(HttpStatus.CONFLICT, "Slot khong trong");
        }

        Zone zone = slot.getZone();
        if (zone == null || !Boolean.TRUE.equals(zone.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Zone cua slot khong hoat dong");
        }

        Floor floor = zone.getFloor();
        if (floor == null || !Boolean.TRUE.equals(floor.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Floor cua slot khong hoat dong");
        }

        ParkingBuilding slotBuilding = floor.getBuilding();
        if (slotBuilding == null || !Boolean.TRUE.equals(slotBuilding.getIsActive())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Building cua slot khong hoat dong");
        }

        ParkingBuilding gateBuilding = gate.getBuilding();
        if (gateBuilding == null || !Objects.equals(slotBuilding.getId(), gateBuilding.getId())) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Slot khong thuoc building cua gate");
        }

        VehicleType vehicleType = vehicle.getVehicleType();
        if (vehicleType == null || vehicleType.getSlotSize() == null || slot.getSlotSize() == null) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Kich co slot khong hop le");
        }

        ParkingSlot.SlotSize requiredSlotSize = ParkingSlot.SlotSize.valueOf(
                vehicleType.getSlotSize().name());
        if (slot.getSlotSize() != requiredSlotSize) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Slot khong phu hop voi loai xe");
        }
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

    private SessionResponse toResponse(ParkingSession s) {
        return SessionResponse.builder()
                .sessionId(s.getId())
                .bookingId(s.getBooking() != null ? s.getBooking().getId() : null)
                .slotId(s.getSlot().getId())
                .slotCode(s.getSlot().getSlotCode())
                .userId(s.getUserId())
                .vehicleId(s.getVehicle().getId())
                .licensePlate(s.getVehicle().getLicensePlate())
                .entryGateId(s.getEntryGate() != null ? s.getEntryGate().getId() : null)
                .exitGateId(s.getExitGate() != null ? s.getExitGate().getId() : null)
                .entryTime(s.getEntryTime())
                .exitTime(s.getExitTime())
                .entryMode(s.getEntryMode().name())
                .status(s.getStatus().name())
                .createdAt(s.getCreatedAt())
                .build();
    }
}

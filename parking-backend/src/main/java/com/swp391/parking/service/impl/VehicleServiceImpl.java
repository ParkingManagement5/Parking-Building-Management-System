package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.VehicleRequest;
import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.ParkingSlot;
import com.swp391.parking.entity.Vehicle;
import com.swp391.parking.entity.VehicleType;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.BookingRepository;
import com.swp391.parking.repository.ParkingSessionRepository;
import com.swp391.parking.repository.ParkingSlotRepository;
import com.swp391.parking.repository.VehicleRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.service.VehicleService;
import com.swp391.parking.util.LicensePlateUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepository vehicleRepo;
    private final VehicleTypeRepository vehicleTypeRepo;
    private final BookingRepository bookingRepo;
    private final ParkingSlotRepository parkingSlotRepo;
    private final ParkingSessionRepository sessionRepo;

    @Override
    public List<Vehicle> getByUser(Integer userId) {
        return vehicleRepo.findByUserIdAndIsActiveTrue(userId);
    }

    @Override
    public Vehicle getById(Long id) {
        return vehicleRepo.findById(id)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy xe ID: " + id));
    }

    @Override
    public Vehicle getByLicensePlate(String licensePlate) {
        return findByEquivalentLicensePlate(licensePlate)
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy xe biển số: " + licensePlate));
    }

    @Override
    @Transactional
    public Vehicle create(Integer userId, VehicleRequest req) {
        String normalizedPlate = LicensePlateUtil.normalizeDisplay(req.getLicensePlate());
        if (findByEquivalentLicensePlate(normalizedPlate).isPresent()) {
            throw new AppException(HttpStatus.CONFLICT,
                "Biển số '" + normalizedPlate + "' đã được đăng ký");
        }

        VehicleType vehicleType = vehicleTypeRepo.findById(req.getVehicleTypeId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy loại xe ID: " + req.getVehicleTypeId()));

        Vehicle vehicle = Vehicle.builder()
            .userId(userId.longValue())
            .vehicleType(vehicleType)
            .licensePlate(normalizedPlate)
            .brand(req.getBrand())
            .model(req.getModel())
            .color(req.getColor())
            .isActive(true)
            .build();

        return vehicleRepo.save(vehicle);
    }

    @Override
    @Transactional
    public Vehicle update(Long id, VehicleRequest req) {
        Vehicle vehicle = getById(id);
        String normalizedPlate = LicensePlateUtil.normalizeDisplay(req.getLicensePlate());
        VehicleType vehicleType = vehicleTypeRepo.findById(req.getVehicleTypeId())
            .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                "Không tìm thấy loại xe ID: " + req.getVehicleTypeId()));

        findByEquivalentLicensePlate(normalizedPlate).stream()
            .filter(existing -> !existing.getId().equals(id))
            .findFirst()
            .ifPresent(existing -> {
                throw new AppException(HttpStatus.CONFLICT,
                    "Biển số '" + normalizedPlate + "' đã được đăng ký");
            });

        vehicle.setVehicleType(vehicleType);
        vehicle.setLicensePlate(normalizedPlate);
        vehicle.setBrand(req.getBrand());
        vehicle.setModel(req.getModel());
        vehicle.setColor(req.getColor());
        return vehicleRepo.save(vehicle);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        Vehicle vehicle = getById(id);

        boolean hasActiveSession = sessionRepo.existsByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(ParkingSession.SessionStatus.ACTIVE, ParkingSession.SessionStatus.WAITING_PAYMENT));
        if (hasActiveSession) {
            throw new AppException(HttpStatus.CONFLICT,
                    "Xe đang có session chưa hoàn tất, không thể vô hiệu hoá");
        }

        vehicle.setIsActive(false);
        vehicleRepo.save(vehicle);

        // Cancel booking active của xe bị xóa
        bookingRepo.findByVehicle_IdAndStatusIn(
                vehicle.getId(),
                List.of(
                        Booking.BookingStatus.PENDING_PAYMENT,
                        Booking.BookingStatus.CONFIRMED
                )
        ).ifPresent(booking -> {
            booking.setStatus(Booking.BookingStatus.CANCELLED);
            ParkingSlot slot = booking.getSlot();
            if (slot != null && slot.getStatus() == ParkingSlot.Status.RESERVED) {
                slot.setStatus(ParkingSlot.Status.AVAILABLE);
                parkingSlotRepo.save(slot);
            }
            bookingRepo.save(booking);
            log.info("Cancelled booking #{} because vehicle #{} was deactivated",
                    booking.getId(), vehicle.getId());
        });
    }

    private Optional<Vehicle> findByEquivalentLicensePlate(String licensePlate) {
        return LicensePlateUtil.lookupCandidates(licensePlate).stream()
                .map(vehicleRepo::findByLicensePlate)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst();
    }
}

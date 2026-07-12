package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.response.PricingPolicyResponse;
import com.swp391.parking.entity.ParkingBuilding;
import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.ParkingBuildingRepository;
import com.swp391.parking.repository.PricingPolicyRepository;
import com.swp391.parking.repository.VehicleTypeRepository;
import com.swp391.parking.service.PricingPolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PricingPolicyServiceImpl implements PricingPolicyService {

    private final PricingPolicyRepository pricingPolicyRepository;
    private final VehicleTypeRepository vehicleTypeRepository;
    private final ParkingBuildingRepository parkingBuildingRepository;

    @Override
    public PricingPolicyResponse createPolicy(CreatePricingPolicyRequest request, Long scopeBuildingId) {
        ParkingBuilding building = resolveBuildingForWrite(request.getBuildingId(), scopeBuildingId);
        PricingPolicy policy = PricingPolicy.builder()
                .vehicleType(vehicleTypeRepository.findById(request.getVehicleTypeId())
                        .orElseThrow(() -> new RuntimeException("VehicleType not found")))
                .building(building)
                .dayType(request.getDayType())
                .timeType(request.getTimeType())
                .startHour(request.getStartHour())
                .endHour(request.getEndHour())
                .pricePerHour(request.getPricePerHour())
                .effectiveFrom(LocalDateTime.now())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        policy = pricingPolicyRepository.save(policy);
        return toResponse(policy);
    }

    @Override
    public PricingPolicyResponse getPolicy(Long id, Long scopeBuildingId) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        enforceReadScope(policy, scopeBuildingId);
        return toResponse(policy);
    }

    @Override
    public List<PricingPolicyResponse> getAllPolicies(Long scopeBuildingId) {
        // Chi hien thi PHIEN BAN MOI NHAT cua moi to hop (loai xe + toa nha + loai ngay
        // + khung gio). Cac phien ban cu bi thay the van con trong DB (de tinh phi lich
        // su chinh xac cho cac phien do da qua truoc do) nhung khong hien len danh sach
        // quan ly de tranh gay nhieu/trung lap.
        Map<String, PricingPolicy> latestByCombo = new LinkedHashMap<>();
        for (PricingPolicy p : pricingPolicyRepository.findAll()) {
            if (scopeBuildingId != null && !matchesManagerScope(p, scopeBuildingId)) {
                continue; // Manager: chi thay policy cua toa minh + policy global
            }
            String key = comboKey(p);
            PricingPolicy current = latestByCombo.get(key);
            if (current == null || effectiveFromOf(p).isAfter(effectiveFromOf(current))) {
                latestByCombo.put(key, p);
            }
        }
        return latestByCombo.values().stream()
                .sorted(Comparator.comparing(PricingPolicy::getPolicyId))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PricingPolicyResponse updatePolicy(Long id, CreatePricingPolicyRequest request, Long scopeBuildingId) {
        PricingPolicy existing = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        enforceWriteScope(existing, scopeBuildingId);

        boolean valueChanged =
                !Objects.equals(existing.getVehicleType() != null ? existing.getVehicleType().getId() : null,
                        request.getVehicleTypeId())
                || !existing.getDayType().equalsIgnoreCase(request.getDayType())
                || !existing.getTimeType().equalsIgnoreCase(request.getTimeType())
                || !Objects.equals(existing.getStartHour(), request.getStartHour())
                || !Objects.equals(existing.getEndHour(), request.getEndHour())
                || existing.getPricePerHour().compareTo(request.getPricePerHour()) != 0;

        if (!valueChanged) {
            // Chi bat/tat trang thai, gia/khung gio khong doi -> khong can tao phien
            // ban moi, sua thang tren dong hien tai.
            if (request.getIsActive() != null) existing.setIsActive(request.getIsActive());
            return toResponse(pricingPolicyRepository.save(existing));
        }

        // Gia hoac khung gio thay doi that su: giu nguyen dong cu (danh dau da thay
        // the) de cac phien do da/dang dien ra truoc thoi diem nay van tinh dung gia
        // cu, va tao mot dong MOI voi gia moi ap dung tu bay gio tro di. Toa nha ap
        // dung giu nguyen nhu dong cu — doi pham vi toa nha khong phai la "sua gia".
        existing.setIsActive(false);
        pricingPolicyRepository.save(existing);

        PricingPolicy newVersion = PricingPolicy.builder()
                .vehicleType(vehicleTypeRepository.findById(request.getVehicleTypeId())
                        .orElseThrow(() -> new RuntimeException("VehicleType not found")))
                .building(existing.getBuilding())
                .dayType(request.getDayType())
                .timeType(request.getTimeType())
                .startHour(request.getStartHour())
                .endHour(request.getEndHour())
                .pricePerHour(request.getPricePerHour())
                .effectiveFrom(LocalDateTime.now())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        newVersion = pricingPolicyRepository.save(newVersion);
        return toResponse(newVersion);
    }

    private String comboKey(PricingPolicy p) {
        Long vtId = p.getVehicleType() != null ? p.getVehicleType().getId() : null;
        Long buildingId = p.getBuilding() != null ? p.getBuilding().getId() : null;
        return vtId + "|" + buildingId + "|" + p.getDayType() + "|" + p.getTimeType()
                + "|" + p.getStartHour() + "|" + p.getEndHour();
    }

    private LocalDateTime effectiveFromOf(PricingPolicy p) {
        return p.getEffectiveFrom() != null ? p.getEffectiveFrom() : LocalDateTime.MIN;
    }

    /**
     * "Xoá" bảng giá thực chất là deactivate (isActive=false), KHÔNG xoá cứng khỏi DB.
     * Lý do: FeeCalculatorUtil quét TẤT CẢ policy (kể cả inactive) theo effectiveFrom
     * để tính đúng giá lịch sử cho các phiên đã/đang đỗ dưới policy này. Xoá cứng sẽ
     * làm phiên đang đỗ rơi xuống DEFAULT_RATE (20.000đ/h) và phá dữ liệu giá lịch sử
     * dùng để tính lại phí khi tranh chấp/hoàn tiền.
     */
    @Override
    public void deletePolicy(Long id, Long scopeBuildingId) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        enforceWriteScope(policy, scopeBuildingId);
        policy.setIsActive(false);
        pricingPolicyRepository.save(policy);
    }

    @Override
    public PricingPolicyResponse activatePolicy(Long id, Long scopeBuildingId) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        enforceWriteScope(policy, scopeBuildingId);
        policy.setIsActive(true);
        policy = pricingPolicyRepository.save(policy);
        return toResponse(policy);
    }

    /**
     * Manager: luon ep ve toa nha minh quan ly.
     * Admin: CHI tao duoc gia global (building=null) — gia rieng cua 1 toa la viec
     * cua Manager quan ly toa do, Admin khong con tao/sua thay nua (tranh trung
     * chuc nang, giong cach da tach voi viec gan Staff vao toa).
     */
    private ParkingBuilding resolveBuildingForWrite(Long requestedBuildingId, Long scopeBuildingId) {
        if (scopeBuildingId != null) {
            return parkingBuildingRepository.findById(scopeBuildingId)
                    .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Building not found"));
        }
        if (requestedBuildingId != null) {
            throw new AppException(HttpStatus.BAD_REQUEST,
                    "Admin chỉ tạo được giá global — giá riêng của 1 toà nhà là việc của Manager quản lý toà đó");
        }
        return null; // global default
    }

    /** Manager duoc DOC policy cua toa minh + policy global (de biet gia mac dinh dang ap dung). */
    private boolean matchesManagerScope(PricingPolicy p, Long managerBuildingId) {
        Long policyBuildingId = p.getBuilding() != null ? p.getBuilding().getId() : null;
        return policyBuildingId == null || managerBuildingId.equals(policyBuildingId);
    }

    private void enforceReadScope(PricingPolicy policy, Long scopeBuildingId) {
        if (scopeBuildingId != null && !matchesManagerScope(policy, scopeBuildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN, "Không có quyền xem bảng giá của toà nhà khác");
        }
    }

    /**
     * Manager chi duoc SUA policy cua chinh toa minh (khong duoc sua gia global hay toa khac).
     * Admin chi con SUA duoc gia global — gia rieng cua bat ky toa nao (du co Manager
     * hay chua) la viec cua Manager quan ly toa do, tranh 2 noi cung sua duoc 1 gia.
     */
    private void enforceWriteScope(PricingPolicy policy, Long scopeBuildingId) {
        Long policyBuildingId = policy.getBuilding() != null ? policy.getBuilding().getId() : null;
        if (scopeBuildingId == null) {
            if (policyBuildingId != null) {
                throw new AppException(HttpStatus.FORBIDDEN,
                        "Đây là giá riêng của 1 toà nhà — chỉ Manager quản lý toà đó được sửa");
            }
            return; // Admin, policy global -> OK
        }
        if (!scopeBuildingId.equals(policyBuildingId)) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "Chỉ được sửa bảng giá của toà nhà bạn quản lý (không được sửa giá global hoặc toà khác)");
        }
    }

    private PricingPolicyResponse toResponse(PricingPolicy policy) {
        return PricingPolicyResponse.builder()
                .policyId(policy.getPolicyId())
                .vehicleTypeId(policy.getVehicleType() != null ? policy.getVehicleType().getId() : null)
                .buildingId(policy.getBuilding() != null ? policy.getBuilding().getId() : null)
                .buildingName(policy.getBuilding() != null ? policy.getBuilding().getName() : null)
                .dayType(policy.getDayType())
                .timeType(policy.getTimeType())
                .startHour(policy.getStartHour())
                .endHour(policy.getEndHour())
                .pricePerHour(policy.getPricePerHour())
                .effectiveFrom(policy.getEffectiveFrom())
                .isActive(policy.getIsActive())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }
}

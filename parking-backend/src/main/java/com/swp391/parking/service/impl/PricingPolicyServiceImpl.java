package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.response.PricingPolicyResponse;
import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.exception.AppException;
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

    @Override
    public PricingPolicyResponse createPolicy(CreatePricingPolicyRequest request) {
        PricingPolicy policy = PricingPolicy.builder()
                .vehicleType(vehicleTypeRepository.findById(request.getVehicleTypeId())
                        .orElseThrow(() -> new RuntimeException("VehicleType not found")))
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
    public PricingPolicyResponse getPolicy(Long id) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        return toResponse(policy);
    }

    @Override
    public List<PricingPolicyResponse> getAllPolicies() {
        // Chi hien thi PHIEN BAN MOI NHAT cua moi to hop (loai xe + loai ngay + khung
        // gio). Cac phien ban cu bi thay the van con trong DB (de tinh phi lich su
        // chinh xac cho cac phien do da qua truoc do) nhung khong hien len danh sach
        // quan ly de tranh gay nhieu/trung lap.
        Map<String, PricingPolicy> latestByCombo = new LinkedHashMap<>();
        for (PricingPolicy p : pricingPolicyRepository.findAll()) {
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
    public PricingPolicyResponse updatePolicy(Long id, CreatePricingPolicyRequest request) {
        PricingPolicy existing = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));

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
        // cu, va tao mot dong MOI voi gia moi ap dung tu bay gio tro di.
        existing.setIsActive(false);
        pricingPolicyRepository.save(existing);

        PricingPolicy newVersion = PricingPolicy.builder()
                .vehicleType(vehicleTypeRepository.findById(request.getVehicleTypeId())
                        .orElseThrow(() -> new RuntimeException("VehicleType not found")))
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
        return vtId + "|" + p.getDayType() + "|" + p.getTimeType() + "|" + p.getStartHour() + "|" + p.getEndHour();
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
    public void deletePolicy(Long id) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        policy.setIsActive(false);
        pricingPolicyRepository.save(policy);
    }

    @Override
    public PricingPolicyResponse activatePolicy(Long id) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        policy.setIsActive(true);
        policy = pricingPolicyRepository.save(policy);
        return toResponse(policy);
    }

    private PricingPolicyResponse toResponse(PricingPolicy policy) {
        return PricingPolicyResponse.builder()
                .policyId(policy.getPolicyId())
                .vehicleTypeId(policy.getVehicleType() != null ? policy.getVehicleType().getId() : null)
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
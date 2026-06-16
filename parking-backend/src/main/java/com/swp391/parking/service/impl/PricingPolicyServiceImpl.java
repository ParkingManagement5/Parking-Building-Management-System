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

import java.util.List;
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
        return pricingPolicyRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public PricingPolicyResponse updatePolicy(Long id, CreatePricingPolicyRequest request) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        policy.setVehicleType(vehicleTypeRepository.findById(request.getVehicleTypeId())
                .orElseThrow(() -> new RuntimeException("VehicleType not found")));
        policy.setDayType(request.getDayType());
        policy.setTimeType(request.getTimeType());
        policy.setStartHour(request.getStartHour());
        policy.setEndHour(request.getEndHour());
        policy.setPricePerHour(request.getPricePerHour());
        if (request.getIsActive() != null) policy.setIsActive(request.getIsActive());
        policy = pricingPolicyRepository.save(policy);
        return toResponse(policy);
    }

    @Override
    public void deletePolicy(Long id) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        pricingPolicyRepository.delete(policy);
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
                .isActive(policy.getIsActive())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }
}
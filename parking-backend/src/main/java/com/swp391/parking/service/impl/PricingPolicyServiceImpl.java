package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.response.PricingPolicyResponse;
import com.swp391.parking.entity.PricingPolicy;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.PricingPolicyRepository;
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

    @Override
    public PricingPolicyResponse createPolicy(CreatePricingPolicyRequest request) {
        PricingPolicy policy = PricingPolicy.builder()
                .vehicleTypeId(request.getVehicleTypeId())
                .dayType(request.getDayType())
                .timeType(request.getTimeType())
                .basePrice(request.getBasePrice())
                .overtimePrice(request.getOvertimePrice())
                .status("ACTIVE")
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
        policy.setVehicleTypeId(request.getVehicleTypeId());
        policy.setDayType(request.getDayType());
        policy.setTimeType(request.getTimeType());
        policy.setBasePrice(request.getBasePrice());
        policy.setOvertimePrice(request.getOvertimePrice());
        policy = pricingPolicyRepository.save(policy);
        return toResponse(policy);
    }

    @Override
    public void deletePolicy(Long id) {
        PricingPolicy policy = pricingPolicyRepository.findById(id)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Pricing policy not found"));
        pricingPolicyRepository.delete(policy);
    }

    private PricingPolicyResponse toResponse(PricingPolicy policy) {
        return PricingPolicyResponse.builder()
                .policyId(policy.getPolicyId())
                .vehicleTypeId(policy.getVehicleTypeId())
                .dayType(policy.getDayType())
                .timeType(policy.getTimeType())
                .basePrice(policy.getBasePrice())
                .overtimePrice(policy.getOvertimePrice())
                .status(policy.getStatus())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }
}
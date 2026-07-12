package com.swp391.parking.service;

import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.response.PricingPolicyResponse;

import java.util.List;

/**
 * scopeBuildingId: null = ADMIN (không giới hạn, thấy/sửa được mọi toà nhà + giá global).
 * Có giá trị = MANAGER, chỉ thấy/sửa được policy của toà nhà đó + policy global (đọc).
 */
public interface PricingPolicyService {
    PricingPolicyResponse createPolicy(CreatePricingPolicyRequest request, Long scopeBuildingId);
    PricingPolicyResponse getPolicy(Long id, Long scopeBuildingId);
    List<PricingPolicyResponse> getAllPolicies(Long scopeBuildingId);
    PricingPolicyResponse updatePolicy(Long id, CreatePricingPolicyRequest request, Long scopeBuildingId);
    void deletePolicy(Long id, Long scopeBuildingId);
    PricingPolicyResponse activatePolicy(Long id, Long scopeBuildingId);
}

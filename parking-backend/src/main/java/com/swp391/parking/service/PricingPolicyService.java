package com.swp391.parking.service;

import com.swp391.parking.dto.request.CreatePricingPolicyRequest;
import com.swp391.parking.dto.response.PricingPolicyResponse;

import java.util.List;

public interface PricingPolicyService {
    PricingPolicyResponse createPolicy(CreatePricingPolicyRequest request);
    PricingPolicyResponse getPolicy(Long id);
    List<PricingPolicyResponse> getAllPolicies();
    PricingPolicyResponse updatePolicy(Long id, CreatePricingPolicyRequest request);
    void deletePolicy(Long id);
    PricingPolicyResponse activatePolicy(Long id); // thêm dòng này
}
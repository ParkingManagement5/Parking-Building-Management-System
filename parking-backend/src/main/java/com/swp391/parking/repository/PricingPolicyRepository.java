package com.swp391.parking.repository;

import com.swp391.parking.entity.PricingPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface PricingPolicyRepository extends JpaRepository<PricingPolicy, Long> {
}
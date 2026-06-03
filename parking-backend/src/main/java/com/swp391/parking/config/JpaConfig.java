package com.swp391.parking.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Bật tính năng tự điền createdAt / updatedAt trong BaseEntity.
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}

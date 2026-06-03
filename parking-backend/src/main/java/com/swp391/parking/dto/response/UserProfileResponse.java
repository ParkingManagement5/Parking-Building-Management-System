package com.swp391.parking.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class UserProfileResponse {
    private Integer userId;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private Set<String> roles;
    private LocalDateTime createdAt;
}
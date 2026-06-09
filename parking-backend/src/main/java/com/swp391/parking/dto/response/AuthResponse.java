package com.swp391.parking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private String fullName;
    private String email;
    private Set<String> roles;   // ["ROLE_DRIVER"] hoặc ["ROLE_STAFF"]
}

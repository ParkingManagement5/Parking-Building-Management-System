package com.swp391.parking.security.service;

import com.swp391.parking.entity.User;
import com.swp391.parking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

/**
 * Spring Security dùng class này để load user khi xác thực.
 * Load theo username (hoặc email tùy bạn chọn).
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Không tìm thấy user: " + username));

        // Convert Role enum → GrantedAuthority với prefix "ROLE_"
        // Ví dụ: ADMIN → ROLE_ADMIN → dùng @PreAuthorize("hasRole('ADMIN')")
        var authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getRoleName().name()))
                .collect(Collectors.toList());

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPasswordHash(),
                User.UserStatus.ACTIVE.equals(user.getStatus()),  // enabled
                true,  // accountNonExpired
                true,  // credentialsNonExpired
                !User.UserStatus.LOCKED.equals(user.getStatus()), // accountNonLocked
                authorities
        );
    }
}

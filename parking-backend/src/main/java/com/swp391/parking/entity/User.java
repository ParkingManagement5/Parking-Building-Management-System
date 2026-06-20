package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Map với bảng `user` trong ERD.
 * Implement dùng cho Spring Security qua UserDetailsServiceImpl.
 */
@Entity
@Table(name = "users")   // đổi thành "users" để tránh conflict với reserved word "user" trong MySQL
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "email_verification_code", length = 10)
    private String emailVerificationCode;

    @Column(name = "email_verification_expires_at")
    private LocalDateTime emailVerificationExpiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private UserStatus status;

    // ── Relationship ─────────────────────────────────────────────────────────
    // Fetch EAGER để Spring Security load được roles ngay
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_role",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    // ── Enum status ──────────────────────────────────────────────────────────
    public enum UserStatus {
        PENDING, ACTIVE, INACTIVE, LOCKED
    }
}

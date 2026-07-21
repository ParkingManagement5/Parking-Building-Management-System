package com.swp391.parking.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "role")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Integer roleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_name", nullable = false, unique = true, length = 50)
    private RoleName roleName;

    public enum RoleName {
        ADMIN, MANAGER, STAFF, DRIVER
    }
}

package com.swp391.parking.repository;

import com.swp391.parking.entity.Role;
import com.swp391.parking.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    List<User> findByRolesRoleName(Role.RoleName roleName);

    List<User> findByRolesRoleNameAndAssignedBuilding_Id(Role.RoleName roleName, Long buildingId);
}

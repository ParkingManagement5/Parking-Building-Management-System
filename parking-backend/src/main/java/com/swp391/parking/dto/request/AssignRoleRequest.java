package com.swp391.parking.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignRoleRequest {
    private Integer userId;
    private String roleName;
}
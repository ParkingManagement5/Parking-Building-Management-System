package com.swp391.parking.repository;

import com.swp391.parking.entity.Request;
import com.swp391.parking.entity.Request.RequestStatus;
import com.swp391.parking.entity.Request.RequestType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequestRepository extends JpaRepository<Request, Integer> {

    List<Request> findByUser_UserId(Integer userId);
    List<Request> findByStatus(RequestStatus status);
    List<Request> findByRequestType(RequestType requestType);
    List<Request> findByAssignedStaff_UserId(Integer staffId);
}
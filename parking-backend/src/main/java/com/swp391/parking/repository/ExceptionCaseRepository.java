package com.swp391.parking.repository;

import com.swp391.parking.entity.ExceptionCase;
import com.swp391.parking.entity.ExceptionCase.ExceptionStatus;
import com.swp391.parking.entity.ExceptionCase.ExceptionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExceptionCaseRepository extends JpaRepository<ExceptionCase, Integer> {

    List<ExceptionCase> findBySessionId(Integer sessionId);

    List<ExceptionCase> findByRequestId(Integer requestId);

    List<ExceptionCase> findByStatus(ExceptionStatus status);

    List<ExceptionCase> findByExceptionType(ExceptionType exceptionType);

    List<ExceptionCase> findByResolvedBy(Integer resolvedBy);
}
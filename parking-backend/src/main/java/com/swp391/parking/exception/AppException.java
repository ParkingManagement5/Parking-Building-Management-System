package com.swp391.parking.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Exception tự định nghĩa cho business logic.
 * Throw từ Service, bắt tại GlobalExceptionHandler.
 *
 * Ví dụ dùng:
 *   throw new AppException(HttpStatus.NOT_FOUND, "Không tìm thấy slot");
 *   throw new AppException(HttpStatus.CONFLICT, "Slot đã được đặt");
 *   throw new AppException(HttpStatus.BAD_REQUEST, "Xe không thuộc khu vực này");
 */
@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;

    public AppException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }
}

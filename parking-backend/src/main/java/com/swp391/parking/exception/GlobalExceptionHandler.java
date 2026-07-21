package com.swp391.parking.exception;

import com.swp391.parking.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * Bắt tất cả exception ở mọi controller.
 * Không ai cần try-catch trong controller cả — throw từ service là đủ.
 */
@Slf4j
@SuppressWarnings("null")
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── Business exception (do mình throw) ─────────────────────────────────
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Void>> handleAppException(AppException ex) {
        log.warn("Business error [{}]: {}", ex.getStatus(), ex.getMessage());
        return ResponseEntity
                .status(ex.getStatus())
                .body(ApiResponse.error(ex.getMessage()));
    }

    // ── Validation lỗi (@Valid fail) ────────────────────────────────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        // Gom tất cả field lỗi thành 1 message: "email: không hợp lệ; password: quá ngắn"
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(message));
    }

    // ── 401 Unauthorized ────────────────────────────────────────────────────
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthException(AuthenticationException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Chưa đăng nhập hoặc token không hợp lệ"));
    }

    // ── 403 Forbidden ───────────────────────────────────────────────────────
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("Bạn không có quyền thực hiện thao tác này"));
    }

    // ── Catch-all 500 ───────────────────────────────────────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi hệ thống, vui lòng thử lại sau"));
    }
}

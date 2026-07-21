package com.swp391.parking.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Wrapper response chuẩn cho toàn bộ API.
 * Mọi controller đều phải return kiểu này.
 *
 * Ví dụ success:
 *   ApiResponse.success("Đặt chỗ thành công", bookingResponse)
 *
 * Ví dụ error (dùng trong GlobalExceptionHandler):
 *   ApiResponse.error("Slot không còn trống")
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)  // không trả field null ra JSON
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;

    // ── Static factory methods ──────────────────────────────────────────────

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message("Success")
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> success(String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .build();
    }
}

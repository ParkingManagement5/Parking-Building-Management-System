package com.swp391.parking.controller;

import com.swp391.parking.dto.request.OcrScanRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.OcrScanResponse;
import com.swp391.parking.service.OcrService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ocr")
@RequiredArgsConstructor
@Tag(name = "OCR", description = "Nhận diện biển số xe")
@SecurityRequirement(name = "bearerAuth")
public class OcrController {

    private final OcrService ocrService;

    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Tạo OCR scan",
            description = "confidence ≥ 0.85 → AUTO_APPROVED | < 0.85 → MANUAL_REVIEW | null plate → FAILED")
    public ResponseEntity<ApiResponse<OcrScanResponse>> scan(
            @Valid @RequestBody OcrScanRequest request) {
        return ResponseEntity.ok(ApiResponse.success(ocrService.createScan(request)));
    }

    @GetMapping("/pending-reviews")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Danh sách scan cần review")
    public ResponseEntity<ApiResponse<List<OcrScanResponse>>> pending() {
        return ResponseEntity.ok(ApiResponse.success(ocrService.getPendingReviews()));
    }

    @PutMapping("/{scanId}/review")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Staff approve / correct biển số",
            description = "Để trống correctedPlate nếu biển số đúng.")
    public ResponseEntity<ApiResponse<OcrScanResponse>> review(
            @PathVariable Long scanId,
            @RequestParam(required = false) String correctedPlate,
            @RequestParam Long staffUserId) {
        return ResponseEntity.ok(ApiResponse.success("Review thành công",
                ocrService.reviewScan(scanId, correctedPlate, staffUserId)));
    }

    @GetMapping("/{scanId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Xem chi tiết 1 scan")
    public ResponseEntity<ApiResponse<OcrScanResponse>> getOne(@PathVariable Long scanId) {
        return ResponseEntity.ok(ApiResponse.success(ocrService.getScan(scanId)));
    }
}

package com.swp391.parking.controller;

import com.swp391.parking.dto.request.OcrScanRequest;
import com.swp391.parking.dto.response.ApiResponse;
import com.swp391.parking.dto.response.OcrScanResponse;
import com.swp391.parking.entity.Role;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.UserRepository;
import com.swp391.parking.service.OcrService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping({"/api/ocr", "/api/v1/ocr"})
@RequiredArgsConstructor
@Tag(name = "OCR", description = "Nhận diện biển số xe")
@SecurityRequirement(name = "bearerAuth")
public class OcrController {

    private final OcrService ocrService;
    private final UserRepository userRepository;

    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Tạo OCR scan",
            description = "confidence ≥ 0.85 → AUTO_APPROVED | < 0.85 → MANUAL_REVIEW | null plate → FAILED")
    public ResponseEntity<ApiResponse<OcrScanResponse>> scan(
            @Valid @RequestBody OcrScanRequest request) {
        return ResponseEntity.ok(ApiResponse.success(ocrService.createScan(request)));
    }

    @PostMapping(value = "/scan-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Upload anh bien so va tao OCR scan")
    public ResponseEntity<ApiResponse<OcrScanResponse>> scanImage(
            @RequestPart("image") MultipartFile image,
            @RequestParam Long gateId,
            @RequestParam String triggerType,
            @RequestParam(required = false) Long sessionId) {
        return ResponseEntity.ok(ApiResponse.success(
                "OCR scan thanh cong",
                ocrService.scanImage(image, gateId, triggerType, sessionId)));
    }

    @GetMapping("/pending-reviews")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Danh sách scan cần review")
    public ResponseEntity<ApiResponse<List<OcrScanResponse>>> pending(Authentication authentication) {
        Long staffBuildingId = resolveStaffBuildingId(authentication);
        List<OcrScanResponse> result = staffBuildingId != null
                ? ocrService.getPendingReviews(staffBuildingId)
                : ocrService.getPendingReviews();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PutMapping("/{scanId}/review")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Staff approve / correct biển số",
            description = "Để trống correctedPlate nếu biển số đúng.")
    public ResponseEntity<ApiResponse<OcrScanResponse>> review(
            @PathVariable Long scanId,
            @RequestParam(required = false) String correctedPlate,
            @RequestParam Long staffUserId,
            Authentication authentication) {
        enforceStaffBuildingScope(scanId, authentication);
        return ResponseEntity.ok(ApiResponse.success("Review thành công",
                ocrService.reviewScan(scanId, correctedPlate, staffUserId)));
    }

    @GetMapping("/{scanId}")
    @PreAuthorize("hasAnyRole('STAFF','MANAGER','ADMIN')")
    @Operation(summary = "Xem chi tiết 1 scan")
    public ResponseEntity<ApiResponse<OcrScanResponse>> getOne(
            @PathVariable Long scanId, Authentication authentication) {
        enforceStaffBuildingScope(scanId, authentication);
        return ResponseEntity.ok(ApiResponse.success(ocrService.getScan(scanId)));
    }

    private boolean isStaff(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + Role.RoleName.STAFF.name()));
    }

    private Long resolveStaffBuildingId(Authentication authentication) {
        if (!isStaff(authentication)) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(u -> u.getAssignedBuilding() != null ? u.getAssignedBuilding().getId() : null)
                .orElse(null);
    }

    private void enforceStaffBuildingScope(Long scanId, Authentication authentication) {
        Long staffBuildingId = resolveStaffBuildingId(authentication);
        if (staffBuildingId == null) {
            return;
        }
        OcrScanResponse scan = ocrService.getScan(scanId);
        if (scan.getBuildingId() != null && !staffBuildingId.equals(scan.getBuildingId())) {
            throw new AppException(HttpStatus.NOT_FOUND, "Khong tim thay scan #" + scanId);
        }
    }
}

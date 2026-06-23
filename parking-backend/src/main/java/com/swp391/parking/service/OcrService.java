package com.swp391.parking.service;

import com.swp391.parking.dto.request.OcrScanRequest;
import com.swp391.parking.dto.response.OcrScanResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface OcrService {
    OcrScanResponse createScan(OcrScanRequest request);
    OcrScanResponse scanImage(MultipartFile image, Long gateId, String triggerType, Long sessionId);
    List<OcrScanResponse> getPendingReviews();
    OcrScanResponse reviewScan(Long scanId, String correctedPlate, Long staffUserId);
    OcrScanResponse getScan(Long scanId);
}

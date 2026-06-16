package com.swp391.parking.service;

import com.swp391.parking.dto.request.OcrScanRequest;
import com.swp391.parking.dto.response.OcrScanResponse;
import java.util.List;

public interface OcrService {
    OcrScanResponse createScan(OcrScanRequest request);
    List<OcrScanResponse> getPendingReviews();
    OcrScanResponse reviewScan(Long scanId, String correctedPlate, Long staffUserId);
    OcrScanResponse getScan(Long scanId);
}

package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.OcrScanRequest;
import com.swp391.parking.dto.response.OcrScanResponse;
import com.swp391.parking.entity.*;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.*;
import com.swp391.parking.service.OcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcrServiceImpl implements OcrService {

    private final OcrScanRepository ocrScanRepository;
    private final GateRepository gateRepository;          // BE2
    private final ParkingSessionRepository sessionRepository;

    @Value("${ocr.confidence-threshold:0.85}")
    private float confidenceThreshold;

    @Override
    @Transactional
    public OcrScanResponse createScan(OcrScanRequest request) {
        Gate gate = gateRepository.findById(request.getGateId())
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy gate #" + request.getGateId()));

        OcrScan.OcrScanBuilder builder = OcrScan.builder()
                .gate(gate)
                .detectedPlate(request.getDetectedPlate())
                .plateConfidenceScore(request.getConfidenceScore())
                .imagePath(request.getImagePath())
                .triggerType(OcrScan.TriggerType.valueOf(request.getTriggerType()))
                .isCorrected(false)
                .processStatus(determineStatus(request.getDetectedPlate(), request.getConfidenceScore()))
                .scannedAt(LocalDateTime.now());

        if (request.getSessionId() != null) {
            sessionRepository.findById(request.getSessionId()).ifPresent(builder::session);
        }

        OcrScan saved = ocrScanRepository.save(builder.build());
        log.info("OCR scan #{} plate={} confidence={} → {}",
                saved.getId(), saved.getDetectedPlate(),
                saved.getPlateConfidenceScore(), saved.getProcessStatus());
        return toResponse(saved);
    }

    @Override
    public List<OcrScanResponse> getPendingReviews() {
        return ocrScanRepository.findByProcessStatus(OcrScan.ProcessStatus.MANUAL_REVIEW)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public OcrScanResponse reviewScan(Long scanId, String correctedPlate, Long staffUserId) {
        OcrScan scan = ocrScanRepository.findById(scanId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy scan #" + scanId));

        boolean isCorrection = correctedPlate != null && !correctedPlate.isBlank()
                && !correctedPlate.equalsIgnoreCase(scan.getDetectedPlate());

        if (isCorrection) {
            scan.setCorrectedPlate(correctedPlate.toUpperCase().trim());
            scan.setIsCorrected(true);
            scan.setProcessStatus(
                    scan.getProcessStatus() == OcrScan.ProcessStatus.AUTO_APPROVED
                            ? OcrScan.ProcessStatus.CORRECTED_AFTER_APPROVAL
                            : OcrScan.ProcessStatus.STAFF_APPROVED);
        } else {
            scan.setProcessStatus(OcrScan.ProcessStatus.STAFF_APPROVED);
        }

        scan.setCorrectedByUserId(staffUserId);
        scan.setCorrectedAt(LocalDateTime.now());
        return toResponse(ocrScanRepository.save(scan));
    }

    @Override
    public OcrScanResponse getScan(Long scanId) {
        return toResponse(ocrScanRepository.findById(scanId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy scan #" + scanId)));
    }

    private OcrScan.ProcessStatus determineStatus(String plate, Float confidence) {
        if (plate == null || plate.isBlank() || confidence == null)
            return OcrScan.ProcessStatus.FAILED;
        return confidence >= confidenceThreshold
                ? OcrScan.ProcessStatus.AUTO_APPROVED
                : OcrScan.ProcessStatus.MANUAL_REVIEW;
    }

    private OcrScanResponse toResponse(OcrScan s) {
        String effective = (s.getIsCorrected() && s.getCorrectedPlate() != null)
                ? s.getCorrectedPlate() : s.getDetectedPlate();
        return OcrScanResponse.builder()
                .scanId(s.getId())
                .sessionId(s.getSession() != null ? s.getSession().getId() : null)
                .gateId(s.getGate() != null ? s.getGate().getId() : null)
                .imagePath(s.getImagePath())
                .detectedPlate(s.getDetectedPlate())
                .plateConfidenceScore(s.getPlateConfidenceScore())
                .correctedPlate(s.getCorrectedPlate())
                .isCorrected(s.getIsCorrected())
                .correctedByUserId(s.getCorrectedByUserId())
                .correctedAt(s.getCorrectedAt())
                .correctionReason(s.getCorrectionReason())
                .triggerType(s.getTriggerType().name())
                .processStatus(s.getProcessStatus().name())
                .scannedAt(s.getScannedAt())
                .effectivePlate(effective)
                .build();
    }
}

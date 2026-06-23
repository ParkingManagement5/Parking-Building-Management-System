package com.swp391.parking.service.impl;

import com.swp391.parking.dto.request.OcrScanRequest;
import com.swp391.parking.dto.response.OcrRecognitionResult;
import com.swp391.parking.dto.response.OcrScanResponse;
import com.swp391.parking.entity.*;
import com.swp391.parking.exception.AppException;
import com.swp391.parking.repository.*;
import com.swp391.parking.service.OcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcrServiceImpl implements OcrService {
    private static final Set<String> VALID_PROVINCES = Set.of(
            "11", "12", "14", "15", "16", "17", "18", "19",
            "20", "21", "22", "23", "24", "25", "26", "27", "28", "29",
            "30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
            "40", "41", "43", "47", "48", "49",
            "50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
            "60", "61", "62", "63", "64", "65", "66", "67", "68", "69",
            "70", "71", "72", "73", "74", "75", "76", "77", "78", "79",
            "80", "81", "82", "83", "84", "85", "86", "88", "89",
            "90", "92", "93", "94", "95", "97", "98", "99"
    );
    private static final Set<String> SPECIAL_SERIES = Set.of("CD", "HC", "KT", "LD", "MK", "NG", "NN", "QT", "T");
    private static final String SERIES_PATTERN = "(?:[A-Z]\\d|[A-Z]{1,2})";
    private static final Pattern PLATE_PATTERN = Pattern.compile(
            "(?<![A-Z0-9])(\\d{2})[-.]?(" + SERIES_PATTERN + ")[-.]?(\\d{4}|\\d{5}|\\d{3}[.]\\d{2})(?![A-Z0-9])"
    );

    private final OcrScanRepository ocrScanRepository;
    private final GateRepository gateRepository;          // BE2
    private final ParkingSessionRepository sessionRepository;
    private final OcrRecognitionClient ocrRecognitionClient;

    @Value("${ocr.confidence-threshold:0.85}")
    private float confidenceThreshold;

    @Value("${ocr.upload-dir:uploads/ocr}")
    private String uploadDir;

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
    @Transactional
    public OcrScanResponse scanImage(MultipartFile image, Long gateId, String triggerType, Long sessionId) {
        if (image == null || image.isEmpty()) {
            throw new AppException(HttpStatus.BAD_REQUEST, "Vui long chon anh bien so");
        }

        String imagePath = storeImage(image);
        OcrRecognitionResult result = ocrRecognitionClient.recognize(Path.of(imagePath), image.getOriginalFilename());

        OcrScanRequest request = new OcrScanRequest();
        request.setGateId(gateId);
        request.setTriggerType(triggerType);
        request.setSessionId(sessionId);
        request.setImagePath(imagePath);
        request.setDetectedPlate(normalizePlate(result.getPlate()));
        request.setConfidenceScore(result.getConfidence());

        return createScan(request);
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

    private String storeImage(MultipartFile image) {
        try {
            Path targetDir = Path.of(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(targetDir);

            String originalName = image.getOriginalFilename() == null ? "plate.jpg" : image.getOriginalFilename();
            String extension = "";
            int extensionStart = originalName.lastIndexOf('.');
            if (extensionStart >= 0 && extensionStart < originalName.length() - 1) {
                extension = originalName.substring(extensionStart).replaceAll("[^A-Za-z0-9.]", "");
            }

            Path target = targetDir.resolve(UUID.randomUUID() + extension).normalize();
            if (!target.startsWith(targetDir)) {
                throw new AppException(HttpStatus.BAD_REQUEST, "Ten file anh khong hop le");
            }

            Files.copy(image.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return target.toString();
        } catch (IOException ex) {
            throw new AppException(HttpStatus.INTERNAL_SERVER_ERROR, "Khong luu duoc anh OCR");
        }
    }

    private String normalizePlate(String plate) {
        if (plate == null) {
            return null;
        }
        String normalized = plate.toUpperCase(Locale.ROOT)
                .replace(" ", "")
                .replace("I", "1")
                .replace("O", "0")
                .replaceAll("[^A-Z0-9.-]", "");

        Matcher plateMatcher = PLATE_PATTERN.matcher(normalized);
        while (plateMatcher.find()) {
            String province = plateMatcher.group(1);
            String series = plateMatcher.group(2);
            String serial = plateMatcher.group(3).replace(".", "");
            if (!isSupportedPlate(province, series, serial)) {
                continue;
            }
            String prefix = formatPrefix(province, series);
            if (serial.length() == 5) {
                return prefix + "-" + serial.substring(0, 3) + "." + serial.substring(3);
            }
            return prefix + "-" + serial;
        }

        return null;
    }

    private boolean isSupportedPlate(String province, String series, String serial) {
        if (!VALID_PROVINCES.contains(province)) {
            return false;
        }
        if (serial.length() != 4 && serial.length() != 5) {
            return false;
        }
        if (SPECIAL_SERIES.contains(series)) {
            return serial.length() == 5;
        }
        return series.matches(SERIES_PATTERN);
    }

    private String formatPrefix(String province, String series) {
        return series.length() > 1 ? province + "-" + series : province + series;
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

    @Component
    @RequiredArgsConstructor
    static class OcrRecognitionClient {
        private final RestTemplateBuilder restTemplateBuilder;

        @Value("${ocr.engine-url:}")
        private String engineUrl;

        OcrRecognitionResult recognize(Path imagePath, String originalFilename) {
            if (engineUrl == null || engineUrl.isBlank()) {
                throw new AppException(HttpStatus.SERVICE_UNAVAILABLE,
                        "OCR engine chua chay. Hay bat ocr-service va cau hinh OCR_ENGINE_URL=http://localhost:8000/recognize");
            }

            OcrRecognitionResult result = callEngine(imagePath);
            if (result == null) {
                throw new AppException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Khong ket noi duoc OCR engine. Kiem tra ocr-service cong 8000");
            }

            return result;
        }

        private OcrRecognitionResult callEngine(Path imagePath) {
            try {
                RestTemplate restTemplate = restTemplateBuilder.build();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.MULTIPART_FORM_DATA);

                MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
                body.add("image", new FileSystemResource(imagePath));

                ResponseEntity<OcrRecognitionResult> response = restTemplate.postForEntity(
                        engineUrl,
                        new HttpEntity<>(body, headers),
                        OcrRecognitionResult.class
                );
                return response.getBody();
            } catch (RestClientException ex) {
                return null;
            }
        }
    }
}

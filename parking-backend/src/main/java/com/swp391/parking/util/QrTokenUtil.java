package com.swp391.parking.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class QrTokenUtil {

    @Value("${jwt.secret}")
    private String secret;

    private SecretKey getKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateQrToken(Long bookingId, String licensePlate,
                                  Long slotId, LocalDateTime expiredAt) {
        Date expiry = Date.from(expiredAt.atZone(ZoneId.systemDefault()).toInstant());
        return Jwts.builder()
                .subject("QR_BOOKING")
                .claims(Map.of(
                        "booking_id", bookingId,
                        "license_plate", licensePlate,
                        "slot_id", slotId
                ))
                .expiration(expiry)
                .signWith(getKey())
                .compact();
    }

    public String generateBookingQrToken(Long bookingId, String licensePlate,
                                         Long slotId, LocalDateTime expiredAt) {
        Date expiry = Date.from(expiredAt.atZone(ZoneId.systemDefault()).toInstant());
        return Jwts.builder()
                .subject("QR_BOOKING")
                .id(UUID.randomUUID().toString())
                .claims(Map.of(
                        "booking_id", bookingId,
                        "license_plate", licensePlate,
                        "slot_id", slotId
                ))
                .expiration(expiry)
                .signWith(getKey())
                .compact();
    }

    public String generateExitQrToken(Long sessionId, Long userId, String licensePlate,
                                      Long bookingId, LocalDateTime expiredAt) {
        long expiresAt = expiredAt.atZone(ZoneId.systemDefault()).toEpochSecond();
        String payload = String.join("|",
                "EXIT",
                String.valueOf(sessionId),
                String.valueOf(userId),
                String.valueOf(bookingId != null ? bookingId : 0L),
                String.valueOf(expiresAt),
                licensePlate != null ? licensePlate : ""
        );
        String encodedPayload = base64Url(payload.getBytes(StandardCharsets.UTF_8));
        String signature = signShort(encodedPayload);
        return "PEX." + encodedPayload + "." + signature;
    }

    public Long parseExitSessionId(String token) {
        if (token == null || !token.startsWith("PEX.")) {
            throw new JwtException("Invalid exit QR prefix");
        }

        String[] parts = token.split("\\.", 3);
        if (parts.length != 3) {
            throw new JwtException("Invalid exit QR format");
        }

        String expectedSignature = signShort(parts[1]);
        if (!expectedSignature.equals(parts[2])) {
            throw new JwtException("Invalid exit QR signature");
        }

        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        String[] values = payload.split("\\|", -1);
        if (values.length < 6 || !"EXIT".equals(values[0])) {
            throw new JwtException("Invalid exit QR payload");
        }

        long expiresAt = Long.parseLong(values[4]);
        if (Instant.now().getEpochSecond() > expiresAt) {
            throw new JwtException("Exit QR expired");
        }

        return Long.parseLong(values[1]);
    }

    public Claims parseQrToken(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValidQrToken(String token) {
        try {
            parseQrToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("QR token invalid: {}", e.getMessage());
            return false;
        }
    }

    private String signShort(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return base64Url(mac.doFinal(value.getBytes(StandardCharsets.UTF_8))).substring(0, 22);
        } catch (Exception e) {
            throw new JwtException("Cannot sign exit QR", e);
        }
    }

    private String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}

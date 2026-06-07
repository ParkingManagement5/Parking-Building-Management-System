package com.swp391.parking.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Map;

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
}

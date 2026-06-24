package com.swp391.parking.service.impl;

import com.swp391.parking.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public void sendPasswordResetOtp(String to, String username, String otp) {
        if (!StringUtils.hasText(mailUsername)) {
            log.warn("Email not configured. Password reset OTP for {} ({}) is {}", username, to, otp);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(to);
            message.setSubject("ParkSmart - Reset mat khau");
            message.setText("""
                    Hello %s,

                    Ma OTP de dat lai mat khau cua ban la: %s

                    Ma nay het han sau 10 phut.
                    Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.
                    """.formatted(username, otp));
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send password reset email to {}. OTP is {}", to, otp, ex);
        }
    }

    public void sendVerificationOtp(String to, String username, String otp) {
        if (!StringUtils.hasText(mailUsername)) {
            log.warn("Email is not configured. Verification OTP for {} ({}) is {}", username, to, otp);
            throw new AppException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Chua cau hinh email SMTP nen khong gui duoc OTP");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(to);
            message.setSubject("ParkSmart email verification");
            message.setText("""
                    Hello %s,

                    Your ParkSmart verification code is: %s

                    This code expires in 10 minutes.
                    """.formatted(username, otp));
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send verification email to {}. OTP is {}", to, otp, ex);
            throw new AppException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Gui email OTP that bai. Vui long kiem tra SMTP username/password");
        }
    }
}

package com.swp391.parking.service.impl;

import com.swp391.parking.entity.Booking;
import com.swp391.parking.entity.ParkingSession;
import com.swp391.parking.entity.Payment;
import com.swp391.parking.entity.User;
import com.swp391.parking.exception.AppException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.DecimalFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DecimalFormat MONEY_FORMAT = new DecimalFormat("#,##0.##");

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.frontend-base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public void sendPasswordResetOtp(String to, String username, String otp) {
        if (!StringUtils.hasText(mailUsername)) {
            log.warn("Email not configured. Password reset OTP for {} ({}) is {}", username, to, otp);
            throw new AppException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa cấu hình email SMTP nên không gửi được OTP đặt lại mật khẩu");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(to);
            message.setSubject("ParkSmart - Đặt lại mật khẩu");
            message.setText("""
                    Xin chào %s,

                    Mã OTP để đặt lại mật khẩu của bạn là: %s

                    Mã này hết hạn sau 10 phút.
                    Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
                    """.formatted(username, otp));
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send password reset email to {}. OTP is {}", to, otp, ex);
            throw new AppException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Gửi email OTP đặt lại mật khẩu thất bại. Vui lòng kiểm tra SMTP username/password");
        }
    }

    public void sendVerificationOtp(String to, String username, String otp) {
        if (!StringUtils.hasText(mailUsername)) {
            log.warn("Email is not configured. Verification OTP for {} ({}) is {}", username, to, otp);
            throw new AppException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa cấu hình email SMTP nên không gửi được OTP");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(to);
            message.setSubject("ParkSmart - Xác thực email");
            message.setText("""
                    Xin chào %s,

                    Mã xác thực ParkSmart của bạn là: %s

                    Mã này hết hạn sau 10 phút.
                    """.formatted(username, otp));
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send verification email to {}. OTP is {}", to, otp, ex);
            throw new AppException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Gửi email OTP thất bại. Vui lòng kiểm tra SMTP username/password");
        }
    }

    public void sendBookingQrEmail(User user, Booking booking) {
        if (!canSendBusinessEmail(user)) {
            return;
        }

        try {
            String bookingsUrl = normalizeBaseUrl(frontendBaseUrl) + "/driver/bookings";
            String qrToken = booking.getQrToken();
            String qrImageUrl = qrToken != null ? buildQrImageUrl(qrToken) : null;
            String html = """
                    <div style="font-family:Arial,sans-serif;background:#f6f8fb;padding:24px;color:#111827">
                      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
                        <div style="background:#0f172a;padding:24px 28px;color:#ffffff">
                          <div style="font-size:24px;font-weight:700">ParkSmart</div>
                          <div style="margin-top:6px;font-size:14px;color:#cbd5e1">QR vào bãi cho booking của bạn đã sẵn sàng</div>
                        </div>
                        <div style="padding:28px">
                          <p style="margin:0 0 16px">Xin chào <strong>%s</strong>,</p>
                          <p style="margin:0 0 18px">Bạn đã thanh toán cọc thành công cho booking <strong>#%s</strong>. Vui lòng đưa mã QR này cho nhân viên khi vào bãi.</p>
                          <div style="border:1px solid #dbeafe;background:#f8fbff;border-radius:14px;padding:18px 20px;margin:0 0 20px">
                            <div style="font-size:13px;color:#475569;margin-bottom:10px">Thông tin booking</div>
                            <div style="font-size:14px;line-height:1.8">
                              <div><strong>Biển số:</strong> %s</div>
                              <div><strong>Vị trí:</strong> %s</div>
                              <div><strong>Bắt đầu:</strong> %s</div>
                              <div><strong>Kết thúc:</strong> %s</div>
                              <div><strong>Cọc đã thanh toán:</strong> %s VND</div>
                            </div>
                          </div>
                          %s
                          <div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px dashed #cbd5e1">
                            <div style="font-size:12px;color:#64748b;margin-bottom:6px">QR token dự phòng</div>
                            <div style="font-size:12px;word-break:break-all;color:#0f172a">%s</div>
                          </div>
                          <div style="margin-top:22px">
                            <a href="%s" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Mở lịch sử đặt chỗ</a>
                          </div>
                        </div>
                      </div>
                    </div>
                    """.formatted(
                    escape(user.getFullName()),
                    booking.getId(),
                    escape(booking.getVehicle() != null ? booking.getVehicle().getLicensePlate() : "-"),
                    escape(booking.getSlot() != null ? booking.getSlot().getSlotCode() : "-"),
                    formatDateTime(booking.getBookingStartTime()),
                    formatDateTime(booking.getBookingEndTime()),
                    formatMoney(booking.getDepositAmount()),
                    renderQrBlock(qrImageUrl, "Booking QR"),
                    escape(qrToken),
                    bookingsUrl
            );

            sendHtmlEmail(user.getEmail(), "ParkSmart - QR vào bãi cho booking #" + booking.getId(), html);
        } catch (Exception ex) {
            log.warn("Failed to send booking QR email for booking #{} to {}", booking.getId(), user.getEmail(), ex);
        }
    }

    public void sendParkingReceiptEmail(User user, ParkingSession session, Payment payment) {
        if (!canSendBusinessEmail(user)) {
            return;
        }

        try {
            String paymentsUrl = normalizeBaseUrl(frontendBaseUrl) + "/driver/payments";
            String currentSessionUrl = normalizeBaseUrl(frontendBaseUrl) + "/driver/current-session";
            String html = """
                    <div style="font-family:Arial,sans-serif;background:#f6f8fb;padding:24px;color:#111827">
                      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
                        <div style="background:#052e16;padding:24px 28px;color:#ffffff">
                          <div style="font-size:24px;font-weight:700">ParkSmart</div>
                          <div style="margin-top:6px;font-size:14px;color:#bbf7d0">Biên lai thanh toán phí đỗ xe</div>
                        </div>
                        <div style="padding:28px">
                          <p style="margin:0 0 16px">Xin chào <strong>%s</strong>,</p>
                          <p style="margin:0 0 18px">Hệ thống đã ghi nhận thanh toán thành công cho phiên đỗ xe của bạn.</p>
                          <div style="border:1px solid #dcfce7;background:#f0fdf4;border-radius:14px;padding:18px 20px;margin:0 0 18px">
                            <div style="font-size:13px;color:#166534;margin-bottom:10px">Thông tin giao dịch</div>
                            <div style="font-size:14px;line-height:1.8">
                              <div><strong>Mã payment:</strong> #%s</div>
                              <div><strong>Session:</strong> #%s</div>
                              <div><strong>Biển số:</strong> %s</div>
                              <div><strong>Phương thức:</strong> %s</div>
                              <div><strong>Mã giao dịch:</strong> %s</div>
                              <div><strong>Thời gian thanh toán:</strong> %s</div>
                            </div>
                          </div>
                          <table style="width:100%%;border-collapse:collapse;margin:8px 0 20px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
                            <tr style="background:#f8fafc">
                              <th style="text-align:left;padding:12px 14px;border-bottom:1px solid #e5e7eb">Hạng mục</th>
                              <th style="text-align:right;padding:12px 14px;border-bottom:1px solid #e5e7eb">Số tiền</th>
                            </tr>
                            <tr>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb">Phí cơ bản</td>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right">%s VND</td>
                            </tr>
                            <tr>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb">Phí quá giờ</td>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right">%s VND</td>
                            </tr>
                            <tr>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb">Phụ thu</td>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right">%s VND</td>
                            </tr>
                            <tr>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb">Giảm giá</td>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right">-%s VND</td>
                            </tr>
                            <tr>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb">Trừ tiền cọc</td>
                              <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;text-align:right">-%s VND</td>
                            </tr>
                            <tr style="background:#f8fafc;font-weight:700">
                              <td style="padding:13px 14px">Tổng thanh toán</td>
                              <td style="padding:13px 14px;text-align:right">%s VND</td>
                            </tr>
                          </table>
                          <div style="font-size:14px;line-height:1.8;color:#334155">
                            <div><strong>Thời gian vào:</strong> %s</div>
                            <div><strong>Thời gian ra:</strong> %s</div>
                          </div>
                          <div style="margin-top:22px">
                            <a href="%s" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;margin-right:10px">Xem lịch sử thanh toán</a>
                            <a href="%s" style="display:inline-block;background:#e2e8f0;color:#0f172a;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">Mở current session</a>
                          </div>
                        </div>
                      </div>
                    </div>
                    """.formatted(
                    escape(user.getFullName()),
                    payment.getPaymentId(),
                    session.getId(),
                    escape(session.getVehicle() != null ? session.getVehicle().getLicensePlate() : "-"),
                    escape(payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : "-"),
                    escape(StringUtils.hasText(payment.getTransactionRef()) ? payment.getTransactionRef() : "-"),
                    formatDateTime(payment.getPaidAt()),
                    formatMoney(payment.getBaseFee()),
                    formatMoney(payment.getOvertimeFee()),
                    formatMoney(payment.getPenaltyFee()),
                    formatMoney(payment.getDiscount()),
                    formatMoney(payment.getDepositDeducted()),
                    formatMoney(payment.getTotalAmount()),
                    formatDateTime(session.getEntryTime()),
                    formatDateTime(session.getExitTime()),
                    paymentsUrl,
                    currentSessionUrl
            );

            sendHtmlEmail(user.getEmail(), "ParkSmart - Biên lai thanh toán #" + payment.getPaymentId(), html);
        } catch (Exception ex) {
            log.warn("Failed to send parking receipt email for payment #{} to {}", payment.getPaymentId(), user.getEmail(), ex);
        }
    }

    private boolean canSendBusinessEmail(User user) {
        if (!StringUtils.hasText(mailUsername)) {
            log.warn("Email not configured. Skip business email send.");
            return false;
        }
        if (user == null || !StringUtils.hasText(user.getEmail())) {
            log.warn("User/email missing. Skip business email send.");
            return false;
        }
        return true;
    }

    private void sendHtmlEmail(String to, String subject, String html) throws Exception {
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, false, StandardCharsets.UTF_8.name());
        helper.setFrom(mailUsername);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        mailSender.send(mimeMessage);
    }

    private String renderQrBlock(String qrImageUrl, String alt) {
        if (!StringUtils.hasText(qrImageUrl)) {
            return "";
        }
        return """
                <div style="text-align:center;margin:8px 0 20px">
                  <img src="%s" alt="%s" style="max-width:240px;width:100%%;height:auto;border:1px solid #e5e7eb;border-radius:14px;padding:10px;background:#ffffff" />
                  <div style="margin-top:10px;font-size:12px;color:#64748b">Neu email client chan hinh, ban van co the mo booking trong he thong de lay QR.</div>
                </div>
                """.formatted(qrImageUrl, escape(alt));
    }

    private String buildQrImageUrl(String qrData) {
        // ecc=L (muc sua loi thap nhat) giu QR du thua de camera dien thoai
        // quet on dinh, vi qrData la JWT dai (~200-400 ky tu) va muc mac dinh
        // cua api.qrserver.com se day module day dac hon can thiet o kich
        // thuoc 280x280.
        return "https://api.qrserver.com/v1/create-qr-code/?size=280x280&ecc=L&data="
                + URLEncoder.encode(qrData, StandardCharsets.UTF_8);
    }

    private String normalizeBaseUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return "http://localhost:5173";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private String formatMoney(BigDecimal amount) {
        return MONEY_FORMAT.format(amount != null ? amount : BigDecimal.ZERO);
    }

    private String formatDateTime(LocalDateTime value) {
        return value != null ? value.format(DATE_TIME_FORMATTER) : "-";
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value != null ? value : "-");
    }
}

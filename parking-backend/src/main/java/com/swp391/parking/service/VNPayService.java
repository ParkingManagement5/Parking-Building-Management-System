package com.swp391.parking.service;

import com.swp391.parking.config.VNPayConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class VNPayService {

    private static final DateTimeFormatter VNP_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VNPayConfig config;

    /**
     * Tạo URL thanh toán VNPay.
     * @param paymentId  ID của Payment record trong DB — dùng làm vnp_TxnRef
     * @param amount     Số tiền VND (không nhân 100 ở đây, sẽ nhân bên trong)
     * @param orderInfo  Mô tả đơn hàng (hiển thị trên trang VNPay)
     * @param ipAddr     IP của client
     */
    public String createPaymentUrl(Integer paymentId, BigDecimal amount, String orderInfo, String ipAddr) {
        String txnRef = paymentId + "-" + System.currentTimeMillis();
        String createDate = LocalDateTime.now().format(VNP_DATE_FMT);

        // VNPay nhận số tiền * 100 (đơn vị: đồng x100)
        long vnpAmount = amount.multiply(BigDecimal.valueOf(100)).longValue();

        TreeMap<String, String> params = new TreeMap<>();
        params.put("vnp_Version",   "2.1.0");
        params.put("vnp_Command",   "pay");
        params.put("vnp_TmnCode",   config.getTmnCode());
        params.put("vnp_Amount",    String.valueOf(vnpAmount));
        params.put("vnp_CurrCode",  "VND");
        params.put("vnp_TxnRef",    txnRef);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale",    "vn");
        params.put("vnp_ReturnUrl", config.getReturnUrl());
        params.put("vnp_CreateDate",createDate);
        params.put("vnp_IpAddr",    ipAddr != null ? ipAddr : "127.0.0.1");

        String hashData  = buildHashData(params);
        String secureHash = hmacSHA512(config.getHashSecret(), hashData);
        log.info("VNPay hashData: {}", hashData);
        log.info("VNPay secureHash: {}", secureHash);
        params.put("vnp_SecureHash", secureHash);

        String queryString = buildQueryString(params);
        String paymentUrl = config.getPayUrl() + "?" + queryString;

        log.info("VNPay URL created for payment #{}: txnRef={}", paymentId, txnRef);
        return paymentUrl;
    }

    /**
     * Xác minh chữ ký từ IPN / ReturnUrl của VNPay.
     * @param params  Tất cả query params VNPay gửi về (Map có thể mutate)
     * @return true nếu hash hợp lệ
     */
    public boolean verifyIpn(Map<String, String> params) {
        String receivedHash = params.remove("vnp_SecureHash");
        params.remove("vnp_SecureHashType");
        if (receivedHash == null) return false;

        TreeMap<String, String> sorted = new TreeMap<>(params);
        String hashData = buildHashData(sorted);
        String expectedHash = hmacSHA512(config.getHashSecret(), hashData);

        return expectedHash.equalsIgnoreCase(receivedHash);
    }

    /**
     * Parse paymentId từ vnp_TxnRef (format: "paymentId-timestamp")
     */
    public Integer parsePaymentId(String txnRef) {
        if (txnRef == null || !txnRef.contains("-")) {
            throw new IllegalArgumentException("vnp_TxnRef không hợp lệ: " + txnRef);
        }
        try {
            return Integer.parseInt(txnRef.split("-")[0]);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Không parse được paymentId từ txnRef: " + txnRef);
        }
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private String buildHashData(TreeMap<String, String> params) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                if (sb.length() > 0) sb.append('&');
                sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII))
                  .append('=')
                  .append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII));
            }
        }
        return sb.toString();
    }

    private String buildQueryString(TreeMap<String, String> params) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().isEmpty()) {
                if (sb.length() > 0) sb.append('&');
                sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.US_ASCII))
                  .append('=')
                  .append(URLEncoder.encode(entry.getValue(), StandardCharsets.US_ASCII));
            }
        }
        return sb.toString();
    }

    private String hmacSHA512(String key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tạo HMAC-SHA512", e);
        }
    }
}

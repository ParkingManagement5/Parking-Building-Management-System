import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { bookingApi } from "../../api/driver/bookingApi";
import { paymentApi } from "../../api/driver/paymentApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { markPaymentSync } from "../../utils/paymentSync";

const VNP_RESPONSE_MESSAGES = {
  "00": "Giao dịch thành công",
  "07": "Trừ tiền thành công nhưng giao dịch đang bị nghi ngờ.",
  "09": "Thẻ hoặc tài khoản chưa đăng ký Internet Banking.",
  "10": "Xác thực thẻ hoặc tài khoản không đúng quá 3 lần.",
  "11": "Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.",
  "12": "Thẻ hoặc tài khoản bị khoá.",
  "13": "Nhập sai OTP. Vui lòng thực hiện lại giao dịch.",
  "24": "Khách hàng huỷ giao dịch.",
  "51": "Tài khoản không đủ số dư.",
  "65": "Vượt quá hạn mức giao dịch trong ngày.",
  "75": "Ngân hàng thanh toán đang bảo trì.",
  "79": "Nhập sai mật khẩu quá số lần quy định.",
  "99": "Lỗi không xác định.",
};

function parseTargetId(orderInfo) {
  const match = String(orderInfo || "").match(/#(\d+)/);
  return match ? Number(match[1]) : null;
}

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [backendReady, setBackendReady] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const responseCode = params.get("vnp_ResponseCode");
  const txnRef = params.get("vnp_TxnRef");
  const amount = params.get("vnp_Amount");
  const transactionNo = params.get("vnp_TransactionNo");
  const orderInfo = params.get("vnp_OrderInfo");

  const isSuccess = responseCode === "00";
  const message = VNP_RESPONSE_MESSAGES[responseCode] || VNP_RESPONSE_MESSAGES["99"];
  const amountVnd = amount ? (parseInt(amount, 10) / 100).toLocaleString("vi-VN") : null;
  const isParkingFee = String(orderInfo || "").toLowerCase().includes("session");
  const successPath = isParkingFee ? "/driver/current-session" : "/driver/bookings";
  const targetId = useMemo(() => parseTargetId(orderInfo), [orderInfo]);

  useEffect(() => {
    if (!isSuccess) return;

    let cancelled = false;
    const maxAttempts = 6;

    async function waitForBackendConfirmation() {
      try {
        await paymentApi.confirmVnpayReturn(Object.fromEntries(params.entries()));
      } catch {
        // IPN may have already completed the state transition, or fallback may not be needed.
      }

      if (!targetId) {
        setBackendReady(true);
        return;
      }

      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt += 1) {
        try {
          if (isParkingFee) {
            const res = await driverSessionApi.getMySessions();
            const sessions = unwrapApiData(res.data, []);
            const session = sessions.find((item) => Number(item.sessionId) === targetId);
            if (session && String(session.status || "").toUpperCase() === "COMPLETED") {
              if (!cancelled) {
                markPaymentSync("parking_fee", targetId);
                setBackendReady(true);
                setSyncMessage("");
              }
              return;
            }
            if (!cancelled) {
              setSyncMessage("Đang đợi backend hoàn tất phiên đỗ xe sau khi VNPay xác nhận.");
            }
          } else {
            const res = await bookingApi.getMyBookings();
            const bookings = unwrapApiData(res.data, []);
            const booking = bookings.find((item) => Number(item.bookingId) === targetId);
            const ready =
              booking &&
              String(booking.status || "").toUpperCase() === "CONFIRMED" &&
              Boolean(booking.qrToken);
            if (ready) {
              if (!cancelled) {
                markPaymentSync("deposit", targetId);
                setBackendReady(true);
                setSyncMessage("");
              }
              return;
            }
            if (!cancelled) {
              setSyncMessage("Đang đợi backend xác nhận booking và sinh mã QR entry.");
            }
          }
        } catch {
          if (!cancelled) {
            setSyncMessage("Đang đồng bộ kết quả thanh toán từ backend...");
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!cancelled) {
        markPaymentSync(isParkingFee ? "parking_fee" : "deposit", targetId);
        setBackendReady(true);
        setSyncMessage(
          isParkingFee
            ? "VNPay đã báo thành công. Nếu phiên chưa cập nhật ngay, vui lòng mở lại Current Session sau vài giây."
            : "VNPay đã báo thành công. Nếu QR chưa hiện ngay, vui lòng mở lại Lịch sử đặt chỗ sau vài giây."
        );
      }
    }

    void waitForBackendConfirmation();

    return () => {
      cancelled = true;
    };
  }, [isParkingFee, isSuccess, params, targetId]);

  useEffect(() => {
    if (!isSuccess || !backendReady) return;

    const timer = setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          navigate(successPath, { replace: true });
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [backendReady, isSuccess, navigate, successPath]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg text-center space-y-6">
        <div className="flex justify-center">
          {isSuccess ? (
            <CheckCircle2 size={64} className="text-emerald-500" />
          ) : (
            <XCircle size={64} className="text-rose-500" />
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            {isSuccess ? "Thanh toán thành công" : "Thanh toán thất bại"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {(amountVnd || transactionNo || orderInfo) && (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-left space-y-2 text-sm">
            {orderInfo && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Nội dung</span>
                <span className="font-medium text-foreground text-right">{orderInfo}</span>
              </div>
            )}
            {amountVnd && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Số tiền</span>
                <span className="font-bold text-foreground">{amountVnd} VND</span>
              </div>
            )}
            {transactionNo && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Mã giao dịch</span>
                <span className="font-mono text-xs text-foreground">{transactionNo}</span>
              </div>
            )}
            {txnRef && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Mã đơn</span>
                <span className="font-mono text-xs text-foreground">{txnRef}</span>
              </div>
            )}
          </div>
        )}

        {isSuccess ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle size={14} className="animate-spin" />
            {backendReady
              ? `Chuyển về ${isParkingFee ? "Current Session" : "Lịch sử đặt chỗ"} sau ${countdown}s...`
              : (syncMessage || "Đang đợi backend xác nhận giao dịch...")}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Vui lòng quay lại và thử lại hoặc liên hệ nhân viên hỗ trợ.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(successPath, { replace: true })}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isParkingFee ? "Về Current Session" : "Về Lịch sử đặt chỗ"}
          </button>
          <button
            onClick={() => navigate("/driver", { replace: true })}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}

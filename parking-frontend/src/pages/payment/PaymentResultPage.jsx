import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { bookingApi } from "../../api/driver/bookingApi";
import { paymentApi } from "../../api/driver/paymentApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { unwrapApiData } from "../../utils/api";

const VNP_RESPONSE_MESSAGES = {
  "00": "Giao dich thanh cong",
  "07": "Tru tien thanh cong nhung giao dich dang bi nghi ngo.",
  "09": "The hoac tai khoan chua dang ky Internet Banking.",
  "10": "Xac thuc the hoac tai khoan khong dung qua 3 lan.",
  "11": "Da het han cho thanh toan. Vui long thuc hien lai giao dich.",
  "12": "The hoac tai khoan bi khoa.",
  "13": "Nhap sai OTP. Vui long thuc hien lai giao dich.",
  "24": "Khach hang huy giao dich.",
  "51": "Tai khoan khong du so du.",
  "65": "Vuot qua han muc giao dich trong ngay.",
  "75": "Ngan hang thanh toan dang bao tri.",
  "79": "Nhap sai mat khau qua so lan quy dinh.",
  "99": "Loi khong xac dinh.",
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
                setBackendReady(true);
                setSyncMessage("");
              }
              return;
            }
            if (!cancelled) {
              setSyncMessage("Dang doi backend hoan tat phien do xe sau khi VNPay xac nhan.");
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
                setBackendReady(true);
                setSyncMessage("");
              }
              return;
            }
            if (!cancelled) {
              setSyncMessage("Dang doi backend xac nhan booking va sinh ma QR entry.");
            }
          }
        } catch {
          if (!cancelled) {
            setSyncMessage("Dang dong bo ket qua thanh toan tu backend...");
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!cancelled) {
        setBackendReady(true);
        setSyncMessage(
          isParkingFee
            ? "VNPay da bao thanh cong. Neu phien chua cap nhat ngay, vui long mo lai Current Session sau vai giay."
            : "VNPay da bao thanh cong. Neu QR chua hien ngay, vui long mo lai Lich su dat cho sau vai giay."
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
            {isSuccess ? "Thanh toan thanh cong" : "Thanh toan that bai"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {(amountVnd || transactionNo || orderInfo) && (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-left space-y-2 text-sm">
            {orderInfo && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Noi dung</span>
                <span className="font-medium text-foreground text-right">{orderInfo}</span>
              </div>
            )}
            {amountVnd && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">So tien</span>
                <span className="font-bold text-foreground">{amountVnd} VND</span>
              </div>
            )}
            {transactionNo && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Ma giao dich</span>
                <span className="font-mono text-xs text-foreground">{transactionNo}</span>
              </div>
            )}
            {txnRef && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Ma don</span>
                <span className="font-mono text-xs text-foreground">{txnRef}</span>
              </div>
            )}
          </div>
        )}

        {isSuccess ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle size={14} className="animate-spin" />
            {backendReady
              ? `Chuyen ve ${isParkingFee ? "Current Session" : "Lich su dat cho"} sau ${countdown}s...`
              : (syncMessage || "Dang doi backend xac nhan giao dich...")}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Vui long quay lai va thu lai hoac lien he nhan vien ho tro.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => navigate(successPath, { replace: true })}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isParkingFee ? "Ve Current Session" : "Ve Lich su dat cho"}
          </button>
          <button
            onClick={() => navigate("/driver", { replace: true })}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Ve trang chu
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock3, LoaderCircle, MapPin, QrCode, ReceiptText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { paymentApi } from "../../api/driver/paymentApi";
import { unwrapApiData } from "../../utils/api";
import { clearPaymentSync, getPaymentSync } from "../../utils/paymentSync";
import {
  formatDateTime,
  getBookingStatus,
  getStatusClasses,
  getStatusLabel,
} from "./driverPortalUtils";

const CONFIRMED_CANCEL_WINDOW_MS = 10 * 60 * 1000;

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function shortToken(value) {
  if (!value) return "";
  if (value.length <= 28) return value;
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function getConfirmedCancelDeadline(booking) {
  const paidAt = booking?.depositPaidAt ? new Date(booking.depositPaidAt).getTime() : Number.NaN;
  if (!Number.isFinite(paidAt)) return null;
  return paidAt + CONFIRMED_CANCEL_WINDOW_MS;
}

function getCancelPolicy(booking) {
  const rawStatus = String(booking?.status || "").toUpperCase();
  if (rawStatus !== "CONFIRMED") {
    return { refundable: false, deadline: null };
  }

  const deadline = getConfirmedCancelDeadline(booking);
  if (deadline == null) {
    return { refundable: false, deadline: null };
  }

  return {
    refundable: deadline >= Date.now(),
    deadline,
  };
}

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingBookingId, setProcessingBookingId] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const paged = useMemo(() => bookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [bookings, page]);
  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE));

  async function loadBookings() {
    setLoading(true);
    setError("");
    try {
      const res = await bookingApi.getMyBookings();
      const nextBookings = unwrapApiData(res.data, []);
      const pendingSync = getPaymentSync("deposit");
      if (pendingSync) {
        const targetBooking = nextBookings.find((item) => Number(item.bookingId) === Number(pendingSync.targetId));
        const isReady =
          targetBooking &&
          String(targetBooking.status || "").toUpperCase() === "CONFIRMED" &&
          Boolean(targetBooking.qrToken);
        if (isReady) {
          clearPaymentSync("deposit");
        }
      }
      setBookings(nextBookings);
    } catch (loadError) {
      console.error("Failed to load booking history", loadError);
      setBookings([]);
      setError("Không tải được lịch sử đặt chỗ từ hệ thống.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBookingsSafe() {
      await loadBookings();
    }

    if (!cancelled) {
      void loadBookingsSafe();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pendingSync = getPaymentSync("deposit");
    if (!pendingSync) return undefined;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      void loadBookings();
      if (attempts >= 6 || !getPaymentSync("deposit")) {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  async function handlePayDeposit(booking) {
    // depositAmount = 0 → xác nhận miễn phí không qua VNPay
    if (!booking.depositAmount || booking.depositAmount <= 0) {
      try {
        setProcessingBookingId(booking.bookingId);
        setError("");
        const createRes = await paymentApi.createDeposit({
          bookingId: booking.bookingId,
          depositAmount: 0,
          paymentMethod: "CASH",
        });
        const payment = unwrapApiData(createRes.data, null);
        if (payment?.paymentId) await paymentApi.confirmDeposit(payment.paymentId);
        await loadBookings();
      } catch (e) {
        setError(e.response?.data?.message || "Không thể xác nhận booking.");
      } finally {
        setProcessingBookingId(null);
      }
      return;
    }

    // Có cọc → redirect sang VNPay
    try {
      setProcessingBookingId(booking.bookingId);
      setError("");
      const res = await paymentApi.createVnpayDepositUrl(booking.bookingId);
      const data = unwrapApiData(res.data, null);
      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        setError("Không tạo được URL thanh toán. Vui lòng thử lại.");
        setProcessingBookingId(null);
      }
    } catch (e) {
      console.error("VNPay deposit error", e);
      setError(e.response?.data?.message || "Không thể kết nối VNPay. Vui lòng thử lại.");
      setProcessingBookingId(null);
    }
  }

  async function handleCancelBooking(booking) {
    try {
      setProcessingBookingId(booking.bookingId);
      setError("");
      await bookingApi.cancel(booking.bookingId);
      await loadBookings();
    } catch (cancelError) {
      console.error("Failed to cancel booking", cancelError);
      setError(cancelError.response?.data?.message || "Không thể huỷ booking này.");
    } finally {
      setProcessingBookingId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Cổng tài xế
        </p>
        <h1 className="mt-1.5 text-2xl font-bold text-foreground">
          Lịch sử đặt chỗ
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Xem các booking đã tạo, bao gồm vị trí, thời gian và trạng thái.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Booking list */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tất cả đặt chỗ</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loading ? "Đang tải..." : `${bookings.length} bản ghi`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-5 py-10 text-sm text-muted-foreground">
            <LoaderCircle size={16} className="animate-spin" />
            Đang tải lịch sử đặt chỗ...
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Chưa có booking nào cho tài khoản này.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paged.map((item, index) => {
              const status = getBookingStatus(item);
              const rawStatus = String(item.status || "").toUpperCase();
              const isPendingPayment = rawStatus === "PENDING_PAYMENT";
              const isConfirmed = rawStatus === "CONFIRMED";
              const canRegenerateQr = isConfirmed && Boolean(item.qrToken) && !item.qrUsed;
              const cancelPolicy = getCancelPolicy(item);
              const canCancelConfirmed = isConfirmed;
              const canCancel = isPendingPayment || canCancelConfirmed;
              const showCancelWindowNotice = isConfirmed;

              return (
                <div key={item.bookingId || item.id || index} className="px-5 py-4 space-y-3">
                  {/* Main row */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: icon + booking info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ReceiptText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          Booking #{item.bookingId}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.licensePlate || "Xe"} &middot; {item.slotCode || "Ô"}
                        </p>
                      </div>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={status} />
                      {isPendingPayment && (
                        <button
                          onClick={() => void handlePayDeposit(item)}
                          disabled={processingBookingId === item.bookingId}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {processingBookingId === item.bookingId ? (
                            <><LoaderCircle size={12} className="animate-spin" /> Đang xử lý</>
                          ) : (
                            "Thanh toán cọc"
                          )}
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => void handleCancelBooking(item)}
                          disabled={processingBookingId === item.bookingId}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                        >
                          {processingBookingId === item.bookingId ? (
                            <><LoaderCircle size={12} className="animate-spin" /> Đang xử lý</>
                          ) : (
                            "Huỷ booking"
                          )}
                        </button>
                      )}
                      {canRegenerateQr && (
                        <button
                          onClick={async () => {
                            try {
                              setError("");
                              await bookingApi.regenerateQr(item.bookingId);
                              await loadBookings();
                            } catch (e) {
                              setError(e.response?.data?.message || "Không thể tạo lại QR.");
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
                        >
                          Tạo lại QR
                        </button>
                      )}
                    </div>
                  </div>

                  {showCancelWindowNotice && (
                    <div className={`ml-[52px] rounded-xl border px-3 py-2 text-xs ${
                      cancelPolicy.refundable
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}>
                      {cancelPolicy.refundable
                        ? "Hủy trong 10 phút sau khi thanh toán cọc sẽ được hoàn cọc."
                        : "Booking đã quá 10 phút sau khi thanh toán cọc. Bạn vẫn có thể hủy nhưng sẽ mất cọc."}
                    </div>
                  )}

                  {/* Detail grid */}
                  <div className="grid gap-3 sm:grid-cols-3 text-sm pl-[52px]">
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                        <MapPin size={13} />
                        <span className="text-xs">Vị trí</span>
                      </div>
                      <p className="font-medium text-foreground">{item.slotCode || "--"}</p>
                      <p className="text-xs text-muted-foreground">Đặt cọc: {item.depositAmount ?? 0}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                        <Clock3 size={13} />
                        <span className="text-xs">Thời gian</span>
                      </div>
                      <p className="font-medium text-foreground">{formatDateTime(item.bookingStartTime)}</p>
                      <p className="text-xs text-muted-foreground">Đến {formatDateTime(item.bookingEndTime)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tạo lúc {formatDateTime(item.createdAt)}</p>
                    </div>
                  </div>

                  {isConfirmed && item.depositPaidAt && (
                    <div className="ml-[52px] flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Cọc lúc {formatDateTime(item.depositPaidAt)}</span>
                      {cancelPolicy.deadline != null && (
                        <span className={cancelPolicy.refundable ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}>
                          {cancelPolicy.refundable
                            ? `Hoàn cọc nếu hủy trước ${formatDateTime(new Date(cancelPolicy.deadline).toISOString())}`
                            : `Đã qua mốc hoàn cọc từ ${formatDateTime(new Date(cancelPolicy.deadline).toISOString())}`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* QR section */}
                  {item.qrToken && (
                    <div className="ml-[52px] rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex size-64 shrink-0 items-center justify-center rounded-xl bg-white p-2">
                          {/* level="L" (thay vi "H"): token JWT rat dai, muc sua loi cao (H) bat
                              buoc chia o qua nho de chua du du phong — kho quet qua webcam nham
                              vao man hinh khac. Token nay la du lieu so, khong in giay/xuoc nen
                              khong can du phong cao, "L" giup o to hon, de quet hon nhieu. */}
                          <QRCodeSVG value={item.qrToken} size={240} level="L" includeMargin />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <QrCode size={15} />
                            Mã QR vào cổng
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Xuất trình mã QR này tại cổng vào sau khi đã thanh toán đặt cọc.
                          </p>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(item.qrToken)}
                            className="w-full rounded-lg bg-muted/60 px-3 py-2 text-left font-mono text-xs text-muted-foreground hover:bg-muted transition-colors break-all"
                            title="Nhấn để sao chép token"
                          >
                            {item.qrToken}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            Phát hành lúc {formatDateTime(item.qrIssuedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, PAGE_SIZE - paged.length) }, (_, index) => (
              <div key={`filler-${index}`} aria-hidden="true" className="invisible px-5 py-4">
                &nbsp;
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              ← Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`size-8 rounded-lg text-xs font-bold transition ${p === page ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

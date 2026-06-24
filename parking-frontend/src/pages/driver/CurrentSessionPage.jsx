import { useEffect, useState, useCallback } from "react";
import { AlertCircle, CreditCard, LoaderCircle, Navigation, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { unwrapApiData } from "../../utils/api";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
} from "./driverPortalUtils";

function shortToken(value) {
  if (!value) return "";
  if (value.length <= 28) return value;
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function resolveSessionStart(item) {
  return item?.entryTime || item?.startTime || item?.checkInTime || item?.createdAt || item?.bookingStartTime;
}

function resolveSessionEnd(item) {
  return item?.exitTime || item?.endTime || item?.checkOutTime || null;
}

const ACTIVE_BOOKING_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "WAITING_PAYMENT"];

function findActiveBooking(bookings) {
  return bookings.find((b) => {
    const status = String(b?.status || "").toUpperCase();
    return ACTIVE_BOOKING_STATUSES.includes(status);
  });
}

export default function CurrentSessionPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingExitQr, setGeneratingExitQr] = useState(false);
  const [exitQr, setExitQr] = useState(null);
  const [error, setError] = useState("");

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    setExitQr(null);
    try {
      const [sessionRes, bookingRes] = await Promise.all([
        driverSessionApi.getMySessions(),
        bookingApi.getMyBookings(),
      ]);
      const mySessions = unwrapApiData(sessionRes.data, []);
      const myBookings = unwrapApiData(bookingRes.data, []);

      // --- Ưu tiên 1: Session ACTIVE → hiện Exit QR ---
      const activeSession = mySessions.find(
        (s) => String(s.status || "").toUpperCase() === "ACTIVE"
      );
      if (activeSession) {
        setSession({ ...activeSession, source: "session", displayMode: "EXIT_QR" });
        return;
      }

      // --- Ưu tiên 2: Session WAITING_PAYMENT → chờ thanh toán ---
      const waitingSession = mySessions.find(
        (s) => String(s.status || "").toUpperCase() === "WAITING_PAYMENT"
      );
      if (waitingSession) {
        setSession({ ...waitingSession, source: "session", displayMode: "WAITING_PAYMENT" });
        return;
      }

      // --- Ưu tiên 3: Booking active ---
      const activeBooking = findActiveBooking(myBookings);
      if (activeBooking) {
        const bookingStatus = String(activeBooking.status || "").toUpperCase();

        if (bookingStatus === "CHECKED_IN" || bookingStatus === "WAITING_PAYMENT") {
          // Booking đã CHECKED_IN/WAITING_PAYMENT nhưng không có session match
          // → trạng thái lỗi, hiện thông báo chờ đồng bộ
          setSession({ ...activeBooking, source: "booking", displayMode: "SYNCING" });
          return;
        }

        if (bookingStatus === "CONFIRMED" && activeBooking.qrToken) {
          // Booking CONFIRMED + có QR → hiện Entry QR
          setSession({ ...activeBooking, source: "booking", displayMode: "ENTRY_QR" });
          return;
        }

        if (bookingStatus === "PENDING_PAYMENT") {
          // Booking chưa thanh toán cọc → chờ thanh toán
          setSession({ ...activeBooking, source: "booking", displayMode: "PENDING_DEPOSIT" });
          return;
        }

        if (bookingStatus === "CONFIRMED" && !activeBooking.qrToken) {
          // CONFIRMED nhưng QR đã hết hạn/bị filter → chờ QR mới
          setSession({ ...activeBooking, source: "booking", displayMode: "QR_EXPIRED" });
          return;
        }
      }

      // --- Không có gì active ---
      setSession(null);
    } catch (loadError) {
      console.error("Failed to load current session", loadError);
      setSession(null);
      setError(loadError.response?.data?.message || "Không tải được session hiện tại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
    const interval = setInterval(loadSession, 15000);
    return () => clearInterval(interval);
  }, [loadSession]);

  async function handleCreateExitQr() {
    if (!session?.sessionId) return;
    setGeneratingExitQr(true);
    setError("");
    try {
      const res = await driverSessionApi.createExitQr(session.sessionId);
      setExitQr(unwrapApiData(res.data, null));
    } catch (qrError) {
      console.error("Failed to create exit QR", qrError);
      setError(qrError.response?.data?.message || "Không tạo được Exit QR.");
    } finally {
      setGeneratingExitQr(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        Đang tải session hiện tại...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Không có phiên đỗ xe hoặc booking nào đang active.
        </p>
        <button
          type="button"
          onClick={() => navigate("/driver/book-slot")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Đặt chỗ mới
        </button>
      </div>
    );
  }

  const { displayMode } = session;
  const isSession = session.source === "session";

  const headerLabel =
    displayMode === "EXIT_QR" ? "ACTIVE SESSION" :
    displayMode === "WAITING_PAYMENT" ? "WAITING PAYMENT" :
    displayMode === "ENTRY_QR" ? "BOOKING - CONFIRMED" :
    displayMode === "PENDING_DEPOSIT" ? "BOOKING - PENDING PAYMENT" :
    displayMode === "QR_EXPIRED" ? "BOOKING - QR EXPIRED" :
    displayMode === "SYNCING" ? "SYNCING..." :
    "BOOKING";

  const badgeColor =
    displayMode === "EXIT_QR" ? "bg-emerald-400" :
    displayMode === "WAITING_PAYMENT" ? "bg-amber-400" :
    displayMode === "ENTRY_QR" ? "bg-blue-400" :
    displayMode === "PENDING_DEPOSIT" ? "bg-amber-400" :
    "bg-slate-400";

  const badgeLabel =
    displayMode === "EXIT_QR" ? "Active" :
    displayMode === "WAITING_PAYMENT" ? "Waiting payment" :
    displayMode === "ENTRY_QR" ? "Confirmed" :
    displayMode === "PENDING_DEPOSIT" ? "Pending payment" :
    displayMode === "QR_EXPIRED" ? "QR Expired" :
    displayMode === "SYNCING" ? "Syncing" :
    String(session.status || "").toLowerCase();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Header card */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-[#4338CA] p-7 text-white dark:to-[#312E81]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/60 text-xs mb-1">{headerLabel}</p>
            <h2 className="font-bold mb-1 text-[1.375rem]">
              {session.buildingName || session.parkingBuildingName || "Parking Building"}
            </h2>
            <p className="text-white/70 text-sm">
              {session.zoneName || "Zone"} - {session.slotCode || session.parkingSlotCode || "Slot"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs text-white dark:bg-white/10">
            <span className={`size-1.5 ${badgeColor} rounded-full animate-pulse`} />
            {badgeLabel}
          </span>
        </div>
        <div className="text-center mb-6">
          <div className="text-5xl font-bold font-mono mb-1">
            {formatDuration(
              resolveSessionStart(session),
              resolveSessionEnd(session) || new Date().toISOString()
            )}
          </div>
          <p className="text-white/60 text-sm">Duration</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">{isSession ? "Entry Time" : "Booking Start"}</p>
            <p className="font-semibold mt-0.5">
              {formatDateTime(resolveSessionStart(session))}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">Estimated Fee</p>
            <p className="font-semibold mt-0.5">
              {formatCurrency(session.amount || session.estimatedFee || session.totalAmount || session.depositAmount || 0)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">Rate</p>
            <p className="font-semibold mt-0.5">
              {session.rateLabel || "Live from backend"}
            </p>
          </div>
        </div>
      </div>

      {/* Vehicle + Slot info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Vehicle Info</h3>
          <div className="space-y-2">
            {[
              ["Plate", session.licensePlate || session.vehiclePlate || "Vehicle linked"],
              ["Status", badgeLabel],
              ["Start", formatDateTime(resolveSessionStart(session))],
              ["End", formatDateTime(resolveSessionEnd(session))],
            ].map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Slot Info</h3>
          <div className="space-y-2">
            {[
              ["Building", session.buildingName || session.parkingBuildingName || "Parking Building"],
              ["Floor", session.floorName || "Floor pending"],
              ["Zone", session.zoneName || "Zone pending"],
              ["Slot", session.slotCode || session.parkingSlotCode || "Slot pending"],
            ].map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action card - QR / Status */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center">
        <button
          type="button"
          onClick={() => navigate("/driver/parking-map")}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,0.28)] transition hover:bg-blue-500"
        >
          <Navigation size={16} />
          Open Parking Map
        </button>

        {/* ── WAITING_PAYMENT: xe đã ra, chờ staff thanh toán ── */}
        {displayMode === "WAITING_PAYMENT" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Chờ thanh toán</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Xe đã ra khỏi bãi. Staff đang xử lý thanh toán phí đỗ xe. Trang sẽ tự cập nhật khi hoàn tất.
            </p>
            <button
              type="button"
              onClick={() => navigate("/driver/payment-history")}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CreditCard size={14} />
              Xem lịch sử thanh toán
            </button>
          </>

        /* ── EXIT_QR: session ACTIVE, xe đang trong bãi → sinh Exit QR ── */
        ) : displayMode === "EXIT_QR" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-4">Exit QR Code</p>
            {exitQr?.qrToken ? (
              <>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <QRCodeSVG value={exitQr.qrToken} size={240} level="H" includeMargin />
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(exitQr.qrToken)}
                  className="mt-3 w-full rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted transition-colors text-left break-all"
                  title="Click to copy full token"
                >
                  {exitQr.qrToken}
                </button>
                <p className="text-xs text-muted-foreground mt-1">Click token to copy</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Đưa QR này cho staff ở cổng ra. Hết hạn lúc {formatDateTime(exitQr.expiresAt)}.
                </p>
              </>
            ) : (
              <>
                <p className="max-w-sm text-center text-xs text-muted-foreground">
                  Tạo QR khi bạn sẵn sàng ra cổng. Staff quét QR để xác nhận xe ra bãi.
                </p>
                <button
                  type="button"
                  onClick={() => void handleCreateExitQr()}
                  disabled={generatingExitQr}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {generatingExitQr ? (
                    <>
                      <LoaderCircle size={14} className="mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    "Tạo Exit QR"
                  )}
                </button>
              </>
            )}
          </>

        /* ── ENTRY_QR: booking CONFIRMED, chờ vào cổng ── */
        ) : displayMode === "ENTRY_QR" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-4">Entry QR Code</p>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <QRCodeSVG value={session.qrToken} size={240} level="H" includeMargin />
            </div>
            <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
              {shortToken(session.qrToken)}
            </div>
            <p className="max-w-sm text-center text-xs text-muted-foreground mt-3">
              Đưa QR này cho staff ở cổng vào. Sau khi staff quét xong, session sẽ chuyển sang ACTIVE và bạn có thể tạo Exit QR để ra.
            </p>
          </>

        /* ── PENDING_DEPOSIT: booking chưa thanh toán cọc ── */
        ) : displayMode === "PENDING_DEPOSIT" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Chờ thanh toán cọc</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Booking đã tạo nhưng chưa thanh toán cọc. Vui lòng thanh toán để nhận Entry QR.
              {session.depositAmount > 0 && (
                <span className="block mt-1 font-medium text-foreground">
                  Số tiền cọc: {formatCurrency(session.depositAmount)}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => navigate("/driver/payment-history")}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CreditCard size={14} />
              Thanh toán cọc
            </button>
          </>

        /* ── QR_EXPIRED: booking CONFIRMED nhưng QR hết hạn ── */
        ) : displayMode === "QR_EXPIRED" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">QR đã hết hạn</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Entry QR của booking này đã hết hạn. Liên hệ staff hoặc hủy booking để đặt lại.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await bookingApi.cancel(session.bookingId);
                  void loadSession();
                } catch (e) {
                  setError(e.response?.data?.message || "Không thể hủy booking.");
                }
              }}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500"
            >
              Hủy booking
            </button>
          </>

        /* ── SYNCING: booking CHECKED_IN/WAITING_PAYMENT nhưng thiếu session ── */
        ) : displayMode === "SYNCING" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Đang đồng bộ...</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Booking đang ở trạng thái {String(session.status || "").toUpperCase()} nhưng chưa thấy session tương ứng. Trang sẽ tự cập nhật.
            </p>
            <button
              type="button"
              onClick={() => void loadSession()}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <RefreshCw size={14} />
              Tải lại
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

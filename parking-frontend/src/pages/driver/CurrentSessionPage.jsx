import { useEffect, useState, useCallback } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { clearPaymentSync, getPaymentSync } from "../../utils/paymentSync";
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

const ACTIVE_BOOKING_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "WAITING_PAYMENT"];

function classifyBooking(booking) {
  const status = String(booking?.status || "").toUpperCase();
  if (status === "WAITING_PAYMENT") return "WAITING_PAYMENT_PENDING_SESSION";
  if (status === "CHECKED_IN") return "SYNCING";
  if (status === "CONFIRMED" && booking.qrToken) return "ENTRY_QR";
  if (status === "PENDING_PAYMENT") return "PENDING_DEPOSIT";
  if (status === "CONFIRMED" && !booking.qrToken) return "SYNCING";
  return null;
}

function buildDisplayItems(mySessions, myBookings) {
  const items = [];
  const sessionBookingIds = new Set();

  mySessions.forEach((s) => {
    const status = String(s.status || "").toUpperCase();
    if (status === "ACTIVE") {
      items.push({ ...s, source: "session", displayMode: "EXIT_QR", _key: `s-${s.sessionId}` });
      if (s.bookingId) sessionBookingIds.add(s.bookingId);
    } else if (status === "WAITING_PAYMENT") {
      items.push({ ...s, source: "session", displayMode: "WAITING_PAYMENT", _key: `s-${s.sessionId}` });
      if (s.bookingId) sessionBookingIds.add(s.bookingId);
    }
  });

  myBookings.forEach((b) => {
    const status = String(b?.status || "").toUpperCase();
    if (!ACTIVE_BOOKING_STATUSES.includes(status)) return;
    if (sessionBookingIds.has(b.bookingId)) return;
    const mode = classifyBooking(b);
    if (mode) {
      items.push({ ...b, source: "booking", displayMode: mode, _key: `b-${b.bookingId}` });
    }
  });

  return items;
}

const PACKAGE_LABELS = { DAILY: "Gói ngày", WEEKLY: "Gói tuần", MONTHLY: "Gói tháng" };

const BADGE_MAP = {
  EXIT_QR: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", label: "Đang đỗ" },
  WAITING_PAYMENT: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", label: "Chờ thanh toán" },
  WAITING_PAYMENT_PENDING_SESSION: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", label: "Chờ thanh toán" },
  ENTRY_QR: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300", label: "Đã xác nhận" },
  PENDING_DEPOSIT: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", label: "Chờ đặt cọc" },
  QR_EXPIRED: { bg: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300", label: "QR hết hạn" },
  SYNCING: { bg: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300", label: "Đang đồng bộ" },
};

function WaitingPaymentAction() {
  const navigate = useNavigate();

  return (
    <>
      <p className="text-sm font-semibold text-foreground">Chờ thanh toán phí đỗ xe</p>
      <p className="max-w-sm text-center text-xs text-muted-foreground mt-1">
        Staff đã ghi nhận xe ra cổng. Vui lòng thanh toán trực tiếp với nhân viên ở cổng ra để hoàn tất phiên.
      </p>
      <div className="mt-3 flex flex-col gap-2 w-full max-w-xs">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Staff sẽ thu tiền mặt hoặc đưa mã QR VNPay tại quầy thanh toán. Driver không tự tạo payment ở bước này.
        </div>
        <button type="button" onClick={() => navigate("/driver/payments")}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          Xem lịch sử thanh toán
        </button>
      </div>
    </>
  );
}


function SessionCard({ item, exitQrs, onCreateExitQr, onReload, onError, navigate, generatingId }) {
  const { displayMode } = item;
  const isSession = item.source === "session";
  const isPackage = Boolean(item.bookingType) && item.bookingType !== "HOURLY";
  const packageLabel = PACKAGE_LABELS[item.bookingType] || item.bookingType;
  const badge = BADGE_MAP[displayMode] || BADGE_MAP.SYNCING;
  const exitQr = exitQrs[item.sessionId] || null;

  const tiles = isPackage
    ? [
        [isSession ? "Giờ vào" : "Hẹn đến", isSession ? formatDateTime(item.entryTime) : formatDateTime(item.bookingStartTime || item.reservedAt || item.createdAt)],
        ["Loại gói", packageLabel],
        ["Hết hạn gói", item.bookingEndTime ? formatDateTime(item.bookingEndTime) : "—"],
      ]
    : [
        [isSession ? "Giờ vào" : "Hẹn đến", isSession ? formatDateTime(item.entryTime) : formatDateTime(item.bookingStartTime || item.reservedAt || item.createdAt)],
        [isSession ? "Phí tạm tính" : "Tính phí", isSession && item.calculatedFee != null ? formatCurrency(item.calculatedFee) : "Tính khi ra bãi"],
        ["Đơn giá", item.hourlyRate ? `${formatCurrency(item.hourlyRate)}/giờ` : "Theo loại xe"],
      ];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-600 p-6 text-white dark:border-emerald-500/20 dark:bg-emerald-900">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h2 className="text-lg font-bold">{item.buildingName || item.parkingBuildingName || "Bãi đỗ xe"}</h2>
            <p className="text-sm text-white/75 mt-0.5">{item.zoneName || "Khu vực"} - {item.slotCode || item.parkingSlotCode || "Chỗ"}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.bg}`}>{badge.label}</span>
            {isPackage && (
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">{packageLabel}</span>
            )}
          </div>
        </div>

        <div className="text-center mb-5">
          {isSession && item.entryTime ? (
            <>
              <div className="text-4xl font-bold font-mono">
                {formatDuration(item.entryTime, item.exitTime || new Date().toISOString())}
              </div>
              <p className="text-sm text-white/60 mt-1">Thời gian đỗ xe</p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">Chờ xe vào bãi</div>
              <p className="text-sm text-white/60 mt-1">Thời gian sẽ tính khi xe vào cổng</p>
            </>
          )}
        </div>

        {isPackage && (displayMode === "ENTRY_QR" || displayMode === "EXIT_QR") && (
          <div className="mb-3 rounded-xl border border-emerald-300/40 bg-white/10 px-3 py-2 text-center text-xs text-white/85">
            Đã thanh toán trọn gói · Vào/ra tự do trong kỳ hạn, không tính thêm phí
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-sm">
          {tiles.map(([label, val]) => (
            <div key={label} className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/60">{label}</p>
              <p className="font-semibold mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle + Slot details */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          {[
            ["Biển số", item.licensePlate || item.vehiclePlate || "Xe đã liên kết"],
            ["Tòa nhà", item.buildingName || item.parkingBuildingName || "Bãi đỗ xe"],
            ["Trạng thái", badge.label],
            ["Tầng", item.floorName || "Chờ xác nhận"],
            ["Khu vực", item.zoneName || "Chờ xác nhận"],
            ["Chỗ", item.slotCode || item.parkingSlotCode || "Chờ xác nhận"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Action area */}
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center">
        <button
          type="button"
          onClick={() => navigate("/driver/parking-map")}
          className="mb-5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Mở bản đồ bãi xe
        </button>

        {displayMode === "WAITING_PAYMENT" ? (
          <WaitingPaymentAction />
        ) : displayMode === "WAITING_PAYMENT_PENDING_SESSION" ? (
          <>
            <p className="text-sm font-semibold text-foreground">Chờ thanh toán phí đỗ xe</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground mt-1">
              Booking đã chuyển sang trạng thái chờ thanh toán nhưng danh sách session chưa đồng bộ kịp. Tải lại để lấy phiên thanh toán mới nhất.
            </p>
            <button type="button" onClick={onReload}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500">
              <RefreshCw size={14} /> Tải lại trạng thái
            </button>
          </>
        ) : displayMode === "EXIT_QR" ? (
          exitQr?.qrToken ? (
            <>
              <p className="text-sm font-semibold text-foreground mb-3">Mã QR ra bãi</p>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <QRCodeSVG value={exitQr.qrToken} size={200} level="H" includeMargin />
              </div>
              <button type="button" onClick={() => navigator.clipboard.writeText(exitQr.qrToken)}
                className="mt-3 w-full rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted text-left break-all">
                {exitQr.qrToken}
              </button>
              <p className="text-xs text-muted-foreground mt-2">Đưa QR cho staff ở cổng ra. Hết hạn lúc {formatDateTime(exitQr.expiresAt)}.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Mã QR ra bãi</p>
              <p className="max-w-sm text-center text-xs text-muted-foreground mt-1">Tạo QR khi bạn sẵn sàng ra cổng.</p>
              <button type="button" onClick={() => onCreateExitQr(item.sessionId)} disabled={generatingId === item.sessionId}
                className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">
                {generatingId === item.sessionId
                  ? <span className="inline-flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Đang tạo...</span>
                  : "Tạo Exit QR"}
              </button>
            </>
          )
        ) : displayMode === "ENTRY_QR" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-3">Mã QR vào bãi</p>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <QRCodeSVG value={item.qrToken} size={200} level="H" includeMargin />
            </div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">{shortToken(item.qrToken)}</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground mt-2">Đưa QR cho staff ở cổng vào. Sau khi quét, phiên chuyển sang ACTIVE.</p>
            {isPackage && (
              <p className="max-w-sm text-center text-xs text-muted-foreground mt-1">
                Đã thanh toán trọn gói {packageLabel.toLowerCase()} — dùng lại đúng QR này cho mỗi lần vào bãi trong kỳ hạn.
              </p>
            )}
          </>
        ) : displayMode === "PENDING_DEPOSIT" ? (
          <>
            <p className="text-sm font-semibold text-foreground">{isPackage ? "Chờ thanh toán trọn gói" : "Chờ thanh toán đặt cọc"}</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground mt-1">
              {isPackage
                ? "Chưa thanh toán phí gói. Vui lòng thanh toán trọn gói để nhận Entry QR."
                : "Chưa thanh toán cọc. Vui lòng thanh toán để nhận Entry QR."}
              {item.depositAmount > 0 && (
                <span className="block mt-1 font-medium text-foreground">
                  {isPackage ? "Phí trọn gói: " : "Số tiền cọc: "}{formatCurrency(item.depositAmount)}
                </span>
              )}
            </p>
            <button type="button" onClick={() => navigate("/driver/bookings")}
              className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              {isPackage ? "Thanh toán trọn gói" : "Thanh toán đặt cọc"}
            </button>
          </>
        ) : displayMode === "QR_EXPIRED" ? (
          <>
            <p className="text-sm font-semibold text-foreground">QR đã hết hạn</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground mt-1">Tạo lại QR mới (có hạn 2 giờ) hoặc huỷ booking.</p>
            <div className="mt-3 flex gap-3">
              <button type="button" onClick={async () => {
                try { onError(""); await bookingApi.regenerateQr(item.bookingId); onReload(); }
                catch (e) { onError(e.response?.data?.message || "Không thể tạo lại QR."); }
              }} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Tạo lại QR</button>
              <button type="button" onClick={async () => {
                try { await bookingApi.cancel(item.bookingId); onReload(); }
                catch (e) { onError(e.response?.data?.message || "Không thể huỷ booking."); }
              }} className="rounded-xl border border-rose-300 text-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-50">Huỷ booking</button>
            </div>
          </>
        ) : displayMode === "SYNCING" ? (
          <>
            <p className="text-sm font-semibold text-foreground">Đang đồng bộ...</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground mt-1">
              Trạng thái {String(item.status || "").toUpperCase()} nhưng chưa thấy session tương ứng. Trang sẽ tự cập nhật.
            </p>
            <button type="button" onClick={onReload}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              <RefreshCw size={14} /> Tải lại
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function CurrentSessionPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [exitQrs, setExitQrs] = useState({});
  const [error, setError] = useState("");

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionRes, bookingRes] = await Promise.all([
        driverSessionApi.getMySessions(),
        bookingApi.getMyBookings(),
      ]);
      const nextItems = buildDisplayItems(unwrapApiData(sessionRes.data, []), unwrapApiData(bookingRes.data, []));
      const pendingSync = getPaymentSync("parking_fee");
      if (pendingSync && !nextItems.some((item) => item.sessionId === pendingSync.targetId)) {
        clearPaymentSync("parking_fee");
      }
      setItems(nextItems);
    } catch (loadError) {
      console.error("Failed to load current session", loadError);
      setItems([]);
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

  useEffect(() => {
    const pendingSync = getPaymentSync("parking_fee");
    if (!pendingSync) return undefined;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts += 1;
      void loadSession();
      if (attempts >= 6 || !getPaymentSync("parking_fee")) {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [loadSession]);

  async function handleCreateExitQr(sessionId) {
    setGeneratingId(sessionId);
    setError("");
    try {
      const res = await driverSessionApi.createExitQr(sessionId);
      setExitQrs((prev) => ({ ...prev, [sessionId]: unwrapApiData(res.data, null) }));
    } catch (qrError) {
      console.error("Failed to create exit QR", qrError);
      setError(qrError.response?.data?.message || "Không tạo được Exit QR.");
    } finally {
      setGeneratingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Đang tải session hiện tại...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Không có phiên đỗ xe hoặc booking nào đang active.
        </p>
        <button type="button" onClick={() => navigate("/driver/booking")}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500">
          Đặt chỗ mới
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {items.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Bạn đang có {items.length} xe/booking active:
        </p>
      )}

      {items.map((item) => (
        <SessionCard
          key={item._key}
          item={item}
          exitQrs={exitQrs}
          onCreateExitQr={handleCreateExitQr}
          onReload={loadSession}
          onError={setError}
          navigate={navigate}
          generatingId={generatingId}
        />
      ))}
    </div>
  );
}

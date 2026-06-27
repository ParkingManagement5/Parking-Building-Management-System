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

const ACTIVE_BOOKING_STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN", "WAITING_PAYMENT"];

function classifyBooking(booking) {
  const status = String(booking?.status || "").toUpperCase();
  if (status === "CHECKED_IN" || status === "WAITING_PAYMENT") return "SYNCING";
  if (status === "CONFIRMED" && booking.qrToken) return "ENTRY_QR";
  if (status === "PENDING_PAYMENT") return "PENDING_DEPOSIT";
  if (status === "CONFIRMED" && !booking.qrToken) return "QR_EXPIRED";
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

function getHeaderLabel(mode) {
  if (mode === "EXIT_QR") return "ACTIVE SESSION";
  if (mode === "WAITING_PAYMENT") return "WAITING PAYMENT";
  if (mode === "ENTRY_QR") return "BOOKING - CONFIRMED";
  if (mode === "PENDING_DEPOSIT") return "BOOKING - PENDING PAYMENT";
  if (mode === "QR_EXPIRED") return "BOOKING - QR EXPIRED";
  if (mode === "SYNCING") return "SYNCING...";
  return "BOOKING";
}

function getBadge(mode) {
  const map = {
    EXIT_QR: { color: "bg-emerald-400", label: "Active" },
    WAITING_PAYMENT: { color: "bg-amber-400", label: "Waiting payment" },
    ENTRY_QR: { color: "bg-blue-400", label: "Confirmed" },
    PENDING_DEPOSIT: { color: "bg-amber-400", label: "Pending payment" },
    QR_EXPIRED: { color: "bg-slate-400", label: "QR Expired" },
    SYNCING: { color: "bg-slate-400", label: "Syncing" },
  };
  return map[mode] || { color: "bg-slate-400", label: "unknown" };
}

function SessionCard({ item, exitQrs, onCreateExitQr, onReload, onError, navigate, generatingId }) {
  const { displayMode } = item;
  const isSession = item.source === "session";
  const badge = getBadge(displayMode);
  const exitQr = exitQrs[item.sessionId] || null;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-[#4338CA] p-7 text-white dark:to-[#312E81]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/60 text-xs mb-1">{getHeaderLabel(displayMode)}</p>
            <h2 className="font-bold mb-1 text-[1.375rem]">
              {item.buildingName || item.parkingBuildingName || "Parking Building"}
            </h2>
            <p className="text-white/70 text-sm">
              {item.zoneName || "Zone"} - {item.slotCode || item.parkingSlotCode || "Slot"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs text-white dark:bg-white/10">
            <span className={`size-1.5 ${badge.color} rounded-full animate-pulse`} />
            {badge.label}
          </span>
        </div>
        <div className="text-center mb-6">
          {isSession && item.entryTime ? (
            <>
              <div className="text-5xl font-bold font-mono mb-1">
                {formatDuration(item.entryTime, item.exitTime || new Date().toISOString())}
              </div>
              <p className="text-white/60 text-sm">Thoi gian do xe (tu luc vao bai)</p>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold mb-1">Cho xe vao bai</div>
              <p className="text-white/60 text-sm">Thoi gian se tinh khi xe vao cong</p>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">{isSession ? "Entry Time" : "Hen den"}</p>
            <p className="font-semibold mt-0.5">
              {isSession ? formatDateTime(item.entryTime) : formatDateTime(item.bookingStartTime || item.reservedAt || item.createdAt)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">{isSession ? "Phi tam tinh" : "Tinh phi"}</p>
            <p className="font-semibold mt-0.5">
              {isSession && item.calculatedFee != null ? formatCurrency(item.calculatedFee) : "Tinh khi ra bai"}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">Don gia</p>
            <p className="font-semibold mt-0.5">
              {item.hourlyRate ? `${formatCurrency(item.hourlyRate)}/h` : "Theo loai xe"}
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
              ["Plate", item.licensePlate || item.vehiclePlate || "Vehicle linked"],
              ["Status", badge.label],
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
              ["Building", item.buildingName || item.parkingBuildingName || "Parking Building"],
              ["Floor", item.floorName || "Floor pending"],
              ["Zone", item.zoneName || "Zone pending"],
              ["Slot", item.slotCode || item.parkingSlotCode || "Slot pending"],
            ].map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action card */}
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center">
        <button
          type="button"
          onClick={() => navigate("/driver/parking-map")}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,0.28)] transition hover:bg-blue-500"
        >
          <Navigation size={16} />
          Open Parking Map
        </button>

        {displayMode === "WAITING_PAYMENT" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Cho thanh toan</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Xe da ra khoi bai. Staff dang xu ly thanh toan phi do xe.
            </p>
            <button type="button" onClick={() => navigate("/driver/payments")}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <CreditCard size={14} /> Xem lich su thanh toan
            </button>
          </>
        ) : displayMode === "EXIT_QR" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-4">Exit QR Code</p>
            {exitQr?.qrToken ? (
              <>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <QRCodeSVG value={exitQr.qrToken} size={240} level="H" includeMargin />
                </div>
                <button type="button" onClick={() => navigator.clipboard.writeText(exitQr.qrToken)}
                  className="mt-3 w-full rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted transition-colors text-left break-all"
                  title="Click to copy full token">
                  {exitQr.qrToken}
                </button>
                <p className="text-xs text-muted-foreground mt-1">Click token to copy</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Dua QR nay cho staff o cong ra. Het han luc {formatDateTime(exitQr.expiresAt)}.
                </p>
              </>
            ) : (
              <>
                <p className="max-w-sm text-center text-xs text-muted-foreground">
                  Tao QR khi ban san sang ra cong. Staff quet QR de xac nhan xe ra bai.
                </p>
                <button type="button" onClick={() => onCreateExitQr(item.sessionId)}
                  disabled={generatingId === item.sessionId}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                  {generatingId === item.sessionId ? (
                    <><LoaderCircle size={14} className="mr-2 animate-spin" /> Dang tao...</>
                  ) : "Tao Exit QR"}
                </button>
              </>
            )}
          </>
        ) : displayMode === "ENTRY_QR" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-4">Entry QR Code</p>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <QRCodeSVG value={item.qrToken} size={240} level="H" includeMargin />
            </div>
            <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
              {shortToken(item.qrToken)}
            </div>
            <p className="max-w-sm text-center text-xs text-muted-foreground mt-3">
              Dua QR nay cho staff o cong vao. Sau khi staff quet xong, session se chuyen sang ACTIVE.
            </p>
          </>
        ) : displayMode === "PENDING_DEPOSIT" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Cho thanh toan coc</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Booking da tao nhung chua thanh toan coc. Vui long thanh toan de nhan Entry QR.
              {item.depositAmount > 0 && (
                <span className="block mt-1 font-medium text-foreground">
                  So tien coc: {formatCurrency(item.depositAmount)}
                </span>
              )}
            </p>
            <button type="button" onClick={() => navigate("/driver/bookings")}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <CreditCard size={14} /> Thanh toan coc
            </button>
          </>
        ) : displayMode === "QR_EXPIRED" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">QR da het han</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Entry QR cua booking nay da het han. Tao lai QR moi (co han 2 gio) hoac huy booking.
            </p>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={async () => {
                try { onError(""); await bookingApi.regenerateQr(item.bookingId); onReload(); }
                catch (e) { onError(e.response?.data?.message || "Khong the tao lai QR."); }
              }} className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Tao lai QR
              </button>
              <button type="button" onClick={async () => {
                try { await bookingApi.cancel(item.bookingId); onReload(); }
                catch (e) { onError(e.response?.data?.message || "Khong the huy booking."); }
              }} className="inline-flex items-center justify-center rounded-xl border border-rose-300 text-rose-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-rose-50">
                Huy booking
              </button>
            </div>
          </>
        ) : displayMode === "SYNCING" ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Dang dong bo...</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Booking dang o trang thai {String(item.status || "").toUpperCase()} nhung chua thay session tuong ung. Trang se tu cap nhat.
            </p>
            <button type="button" onClick={onReload}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <RefreshCw size={14} /> Tai lai
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
      const mySessions = unwrapApiData(sessionRes.data, []);
      const myBookings = unwrapApiData(bookingRes.data, []);
      setItems(buildDisplayItems(mySessions, myBookings));
    } catch (loadError) {
      console.error("Failed to load current session", loadError);
      setItems([]);
      setError(loadError.response?.data?.message || "Khong tai duoc session hien tai.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
    const interval = setInterval(loadSession, 15000);
    return () => clearInterval(interval);
  }, [loadSession]);

  async function handleCreateExitQr(sessionId) {
    setGeneratingId(sessionId);
    setError("");
    try {
      const res = await driverSessionApi.createExitQr(sessionId);
      const qr = unwrapApiData(res.data, null);
      setExitQrs((prev) => ({ ...prev, [sessionId]: qr }));
    } catch (qrError) {
      console.error("Failed to create exit QR", qrError);
      setError(qrError.response?.data?.message || "Khong tao duoc Exit QR.");
    } finally {
      setGeneratingId(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        Dang tai session hien tai...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Khong co phien do xe hoac booking nao dang active.
        </p>
        <button type="button" onClick={() => navigate("/driver/booking")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          Dat cho moi
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {items.length > 1 ? (
        <div className="text-sm text-muted-foreground">
          Ban dang co {items.length} xe/booking active:
        </div>
      ) : null}

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

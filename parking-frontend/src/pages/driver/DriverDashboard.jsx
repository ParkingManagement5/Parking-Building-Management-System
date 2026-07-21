import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Bell, Clock3, Navigation, ReceiptText } from "lucide-react";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { paymentApi } from "../../api/driver/paymentApi";
import { notificationApi } from "../../api/notificationApi";
import { getUserId, getUsername } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
import { formatCurrency, formatDuration } from "./driverPortalUtils";

// Dashboard chi giu dung thu can biet NGAY khi mo app: viec can xu ly (chua
// thanh toan, booking chua hoan tat) uu tien tren cung, roi moi den phien
// dang do (thong tin, khong khan). Cac so lieu phu (so xe, chi tieu thang,
// lich su booking/thong bao) chuyen sang dung trang cua no thay vi nhoi het
// len trang chinh — tranh cam giac "qua nhieu thong tin".

function isOpenBooking(item) {
  const status = String(item?.status || item?.bookingStatus || "").toUpperCase();
  const qrUsed = item?.qrUsed === true || Boolean(item?.qrUsedAt);
  return status === "PENDING_PAYMENT" || (status === "CONFIRMED" && !qrUsed);
}

function resolveBookingStart(item) {
  return item?.bookingStartTime || item?.reservedAt || item?.createdAt || null;
}

function bookingPriority(item) {
  const status = String(item?.status || item?.bookingStatus || "").toUpperCase();
  if (status === "PENDING_PAYMENT") return 0;
  if (status === "CONFIRMED") return 1;
  return 2;
}

function pickActiveBooking(bookings) {
  const openBookings = bookings.filter(isOpenBooking);
  if (!openBookings.length) return null;
  return [...openBookings].sort((a, b) => {
    const priorityDiff = bookingPriority(a) - bookingPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    const startA = resolveBookingStart(a) ? new Date(resolveBookingStart(a)).getTime() : Number.MAX_SAFE_INTEGER;
    const startB = resolveBookingStart(b) ? new Date(resolveBookingStart(b)).getTime() : Number.MAX_SAFE_INTEGER;
    return startA - startB;
  })[0];
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [activeBooking, setActiveBooking] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [unpaidSession, setUnpaidSession] = useState(null);
  const [openBookingCount, setOpenBookingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const userId = getUserId();
        const [bookingsRes, sessionsRes, , notificationsRes] = await Promise.allSettled([
          bookingApi.getMyBookings(),
          driverSessionApi.getMySessions(),
          paymentApi.getMyPayments(),
          userId ? notificationApi.getByUser(userId) : Promise.resolve({ data: [] }),
        ]);
        if (cancelled) return;

        const bookings = bookingsRes.status === "fulfilled" ? unwrapApiData(bookingsRes.value.data, []) : [];
        const sessions = sessionsRes.status === "fulfilled" ? unwrapApiData(sessionsRes.value.data, []) : [];
        const notifications = notificationsRes.status === "fulfilled" ? unwrapApiData(notificationsRes.value.data, []) : [];

        setActiveBooking(pickActiveBooking(bookings));
        setActiveSession(sessions.find((s) => String(s.status || "").toUpperCase() === "ACTIVE") || null);
        setUnpaidSession(sessions.find((s) => String(s.status || "").toUpperCase() === "WAITING_PAYMENT") || null);
        setOpenBookingCount(bookings.filter(isOpenBooking).length);
        setUnreadCount(notifications.filter((n) => !n.isRead).length);
      } catch (error) {
        console.error("Load driver dashboard failed:", error);
      }
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  const hasAttention = Boolean(unpaidSession || activeBooking);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <p className="text-base text-muted-foreground">
        {greetingForNow()}, <span className="font-semibold text-foreground">{getUsername() || "bạn"}</span>
      </p>

      {hasAttention && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cần chú ý</p>

          {unpaidSession && (
            <div className="flex items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/25 dark:bg-rose-500/10">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-600 text-white">
                <AlertTriangle size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-rose-700 dark:text-rose-300">
                  Chưa thanh toán {formatCurrency(unpaidSession.calculatedFee || unpaidSession.totalAmount || 0)}
                </p>
                <p className="text-sm text-rose-700/80 dark:text-rose-300/70 mt-1">
                  Phiên đỗ tại {unpaidSession.slotCode || "chỗ đã đỗ"} · {unpaidSession.buildingName || "đã kết thúc"}
                </p>
              </div>
              <button type="button" onClick={() => navigate("/driver/payments")}
                className="shrink-0 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">
                Thanh toán ngay
              </button>
            </div>
          )}

          {activeBooking && (
            <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/25 dark:bg-amber-500/10">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-600 text-white">
                <Clock3 size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-amber-800 dark:text-amber-300">Booking chưa hoàn tất</p>
                <p className="text-sm text-amber-800/80 dark:text-amber-300/70 mt-1">
                  {activeBooking.buildingName || activeBooking.parkingBuildingName || "Bãi xe"} ·{" "}
                  {String(activeBooking.status || "").toUpperCase() === "PENDING_PAYMENT" ? "Chờ đặt cọc" : "Chờ vào bãi"}
                </p>
              </div>
              <button type="button" onClick={() => navigate("/driver/bookings")}
                className="shrink-0 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700">
                Xem chi tiết
              </button>
            </div>
          )}
        </div>
      )}

      {activeSession ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Xe đang đỗ</p>
          <div className="rounded-2xl border border-border bg-card p-8 border-l-4 border-l-primary">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" /> {activeSession.slotCode || "Đang đỗ"}
                </p>
                <h2 className="text-3xl font-semibold text-foreground mt-2">
                  {activeSession.licensePlate || activeSession.vehiclePlate || "Xe của bạn"}
                </h2>
                <p className="text-base text-muted-foreground mt-1">{activeSession.buildingName || "Bãi xe"}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-4xl font-semibold text-foreground tabular-nums">
                  {formatDuration(activeSession.entryTime || activeSession.startTime, new Date().toISOString())}
                </p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mt-1">Thời gian</p>
              </div>
            </div>
            <div className="mt-7 flex gap-3">
              <button type="button" onClick={() => navigate("/driver/current-session")}
                className="flex-1 rounded-xl border border-border py-3 text-base font-semibold text-foreground transition hover:bg-muted">
                Xem chi tiết
              </button>
              <button type="button"
                onClick={() => navigate("/driver/find-parking", { state: { view: "map", buildingId: activeSession.buildingId } })}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90">
                <Navigation size={18} /> Chỉ đường tới xe
              </button>
            </div>
          </div>
        </div>
      ) : !hasAttention && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-base text-muted-foreground mb-4">Bạn chưa có xe nào đang đỗ.</p>
          <button type="button" onClick={() => navigate("/driver/find-parking")}
            className="rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90">
            Tìm chỗ đỗ gần bạn
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => navigate("/driver/bookings")}
          className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-border bg-card py-4 text-base font-medium text-muted-foreground transition hover:bg-muted">
          <ReceiptText size={18} /> Booking &amp; lịch sử
          {openBookingCount > 0 && <span className="font-semibold text-foreground">({openBookingCount})</span>}
          <ArrowRight size={16} />
        </button>
        <button type="button" onClick={() => navigate("/driver/notifications")}
          className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-border bg-card py-4 text-base font-medium text-muted-foreground transition hover:bg-muted">
          <Bell size={18} /> Thông báo
          {unreadCount > 0 && <span className="font-semibold text-foreground">({unreadCount})</span>}
        </button>
      </div>
    </div>
  );
}

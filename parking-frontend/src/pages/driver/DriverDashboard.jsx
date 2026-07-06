import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { driverVehicleApi } from "../../api/driver/driverVehicleApi";
import { paymentApi } from "../../api/driver/paymentApi";
import { notificationApi } from "../../api/notificationApi";
import { getUserId } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
import {
  formatCurrency,
  formatDuration,
  formatRelativeTime,
  getBookingStatus,
  getStatusClasses,
} from "./driverPortalUtils";

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusClasses(status)}`}
    >
      {String(status || "pending").toLowerCase()}
    </span>
  );
}

function isOpenBooking(item) {
  const status = String(item?.status || item?.bookingStatus || "").toUpperCase();
  const qrUsed = item?.qrUsed === true || Boolean(item?.qrUsedAt);
  return status === "PENDING_PAYMENT" || (status === "CONFIRMED" && !qrUsed);
}

function resolveSessionStart(item) {
  return item?.entryTime || item?.startTime || item?.checkInTime || item?.createdAt || item?.bookingStartTime;
}

function resolveSessionEnd(item) {
  return item?.exitTime || item?.endTime || item?.checkOutTime || null;
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
    if (startA !== startB) return startA - startB;

    const createdA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createdB - createdA;
  })[0];
}

function resolveHeroMetric(record, isSessionRecord) {
  if (!record) return "--:--";
  if (isSessionRecord) {
    return formatDuration(resolveSessionStart(record), resolveSessionEnd(record) || new Date().toISOString());
  }

  const status = String(record?.status || record?.bookingStatus || "").toUpperCase();
  if (status === "PENDING_PAYMENT") return "Cho coc";
  if (status === "CONFIRMED") return "Cho vao";
  return "--:--";
}

function resolveHeroMetricLabel(record, isSessionRecord) {
  if (isSessionRecord) return "Thoi gian";

  const status = String(record?.status || record?.bookingStatus || "").toUpperCase();
  if (status === "PENDING_PAYMENT") return "Trang thai";
  if (status === "CONFIRMED") return "Dieu kien";
  return "Thoi gian";
}

function resolveHeroTitle(record, isSessionRecord) {
  if (!record) return "Chua co phien do xe";
  if (isSessionRecord) {
    return record?.slotCode ? `Xe dang do tai ${record.slotCode}` : "Xe dang do trong bai";
  }
  return record?.buildingName || record?.parkingBuildingName || "Cho xe vao bai";
}

function resolveHeroSubtitle(record, isSessionRecord) {
  if (!record) return "Tao booking de xem phien do xe hien tai tai day";
  const slotLabel = record?.slotCode || record?.parkingSlotCode || "Cho cho xac nhan";
  const plateLabel = record?.licensePlate || record?.vehiclePlate || "Xe da lien ket";

  if (isSessionRecord) {
    return `${slotLabel} - ${plateLabel}`;
  }

  const startLabel = resolveBookingStart(record) ? formatRelativeTime(resolveBookingStart(record)) : "Sap den luot";
  return `${slotLabel} - ${plateLabel} - ${startLabel}`;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { label: "Xe đã đăng ký", value: "0", action: "/driver/vehicles" },
    { label: "Booking đang mở", value: "0", action: "/driver/booking" },
    { label: "Phiên hiện tại", value: "--:--", action: "/driver/current-session" },
    { label: "Thông báo", value: "0", action: "/driver/notifications" },
    { label: "Chi tiêu tháng", value: "$0", action: "/driver/payments" },
  ]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [currentDriverSession, setCurrentDriverSession] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const userId = getUserId();
        const [vehiclesRes, bookingsRes, sessionsRes, paymentsRes, notificationsRes] =
          await Promise.allSettled([
            driverVehicleApi.getMyVehicles(),
            bookingApi.getMyBookings(),
            driverSessionApi.getMySessions(),
            paymentApi.getMyPayments(),
            userId ? notificationApi.getByUser(userId) : Promise.resolve({ data: [] }),
          ]);

        if (cancelled) return;

        const vehicles = vehiclesRes.status === "fulfilled" ? unwrapApiData(vehiclesRes.value.data, []) : [];
        const bookings = bookingsRes.status === "fulfilled" ? unwrapApiData(bookingsRes.value.data, []) : [];
        const sessions = sessionsRes.status === "fulfilled" ? unwrapApiData(sessionsRes.value.data, []) : [];
        const payments = paymentsRes.status === "fulfilled" ? unwrapApiData(paymentsRes.value.data, []) : [];
        const notifications = notificationsRes.status === "fulfilled" ? unwrapApiData(notificationsRes.value.data, []) : [];

        const active = pickActiveBooking(bookings);
        const activeSession = sessions.find((s) => String(s.status || "").toUpperCase() === "ACTIVE") || null;
        const waitingPaymentSession = sessions.find((s) => String(s.status || "").toUpperCase() === "WAITING_PAYMENT") || null;
        const currentSession = activeSession || waitingPaymentSession || null;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyExpenses = payments
          .filter((p) => String(p.paymentStatus || "").toUpperCase() === "PAID")
          .filter((p) => new Date(p.paidAt || p.createdAt || 0) >= monthStart)
          .reduce((sum, p) => sum + Number(p.amount || p.totalAmount || 0), 0);

        setStats([
          { label: "Xe đã đăng ký", value: String(vehicles.length), action: "/driver/vehicles" },
          { label: "Booking đang mở", value: String(bookings.filter(isOpenBooking).length), action: "/driver/booking" },
          {
            label: "Phiên hiện tại",
            value: currentSession
              ? formatDuration(resolveSessionStart(currentSession), resolveSessionEnd(currentSession) || new Date().toISOString())
              : "--:--",
            action: "/driver/current-session",
          },
          { label: "Thông báo", value: String(notifications.filter((n) => !n.isRead).length), action: "/driver/notifications" },
          { label: "Chi tiêu tháng", value: formatCurrency(monthlyExpenses), action: "/driver/payments" },
        ]);

        setActiveBooking(active);
        setCurrentDriverSession(currentSession);
        setRecentBookings(bookings.slice(0, 3));
        setRecentNotifications(notifications.slice(0, 4));
      } catch (error) {
        console.error("Load driver dashboard failed:", error);
      }
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  const heroRecord = currentDriverSession || activeBooking;
  const heroIsSession = Boolean(currentDriverSession);
  const heroStatus = currentDriverSession
    ? String(currentDriverSession.status || "").toUpperCase()
    : getBookingStatus(activeBooking);
  const heroTitle = heroRecord?.buildingName || heroRecord?.parkingBuildingName || "Chưa có phiên đỗ xe";
  const heroSubtitle = heroRecord
    ? `${heroRecord.slotCode || heroRecord.parkingSlotCode || "Chỗ chờ xác nhận"} - ${heroRecord.licensePlate || heroRecord.vehiclePlate || "Xe đã liên kết"}`
    : "Tạo booking để xem phiên đỗ xe hiện tại tại đây";
  const heroDuration = resolveHeroMetric(heroRecord, heroIsSession);
  const heroDurationLabel = resolveHeroMetricLabel(heroRecord, heroIsSession);
  const heroStatusLabel = currentDriverSession
    ? heroStatus.toLowerCase()
    : activeBooking ? getBookingStatus(activeBooking) : "waiting";
  const heroDisplayTitle = resolveHeroTitle(heroRecord, heroIsSession);
  const heroDisplaySubtitle = resolveHeroSubtitle(heroRecord, heroIsSession);

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.action)}
            className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
          >
            <div className="text-2xl font-bold text-foreground">{item.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Hero active session */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-600 p-6 text-white dark:border-emerald-500/20 dark:bg-emerald-900">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="text-xs text-white/70 mb-1">Phiên đỗ xe hiện tại</p>
            <h2 className="text-xl font-bold">{heroDisplayTitle}</h2>
            <p className="text-sm text-white/80 mt-0.5">{heroDisplaySubtitle}</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-center">
            <div className="text-2xl font-bold font-mono">{heroDuration}</div>
            <div className="text-xs text-white/60">{heroDurationLabel}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            ["Trạng thái", heroStatusLabel],
            ["Phí ước tính", formatCurrency((heroIsSession ? heroRecord?.calculatedFee : heroRecord?.depositAmount) || 0)],
            ["Biển số xe", heroRecord?.licensePlate || heroRecord?.vehiclePlate || "Chưa gán"],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl bg-white/10 p-3">
              <p className="text-xs text-white/60">{label}</p>
              <p className="text-sm font-semibold mt-0.5 capitalize">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent bookings + notifications */}
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">Booking gần đây</h3>
            <button onClick={() => navigate("/driver/bookings")} className="text-xs text-emerald-600 hover:underline">
              Xem tất cả
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentBookings.map((item, index) => (
              <div key={item.bookingId || item.id || index} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.buildingName || item.parkingBuildingName || "Parking Building"} - {item.slotCode || item.parkingSlotCode || "Slot"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.bookingDate || item.createdAt || "Vừa tạo"}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(item.depositAmount || 0)}
                  </p>
                  <StatusBadge status={getBookingStatus(item)} />
                </div>
              </div>
            ))}
            {recentBookings.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">Chưa có booking nào.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">Thông báo gần đây</h3>
            <button onClick={() => navigate("/driver/notifications")} className="text-xs text-emerald-600 hover:underline">
              Xem tất cả
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentNotifications.map((item, index) => (
              <div key={item.notificationId || index} className="py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.title || "Thông báo"}
                  </p>
                  {!item.isRead && <span className="size-2 rounded-full bg-emerald-500 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {item.body || item.message || item.content || "Không có chi tiết"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {formatRelativeTime(item.createdAt || item.sentAt)}
                </p>
              </div>
            ))}
            {recentNotifications.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">Chưa có thông báo nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

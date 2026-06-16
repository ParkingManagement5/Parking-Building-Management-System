import { useEffect, useState } from "react";
import {
  Bell,
  BookOpen,
  Car,
  ChevronRight,
  Clock,
  CreditCard,
  MapPin,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { bookingApi } from "../../api/driver/bookingApi";
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
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusClasses(
        status
      )}`}
    >
      {String(status || "pending").toLowerCase()}
    </span>
  );
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    {
      label: "Registered Vehicles",
      value: "0",
      icon: Car,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200",
      action: "/driver/vehicles",
    },
    {
      label: "Active Booking",
      value: "0",
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200",
      action: "/driver/booking",
    },
    {
      label: "Current Session",
      value: "--:--",
      icon: Clock,
      color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200",
      action: "/driver/current-session",
    },
    {
      label: "Notifications",
      value: "0",
      icon: Bell,
      color: "bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200",
      action: "/driver/notifications",
    },
    {
      label: "Monthly Expenses",
      value: "$0",
      icon: Wallet,
      color: "bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200",
      action: "/driver/payments",
    },
  ]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const userId = getUserId();
        const [vehiclesRes, bookingsRes, paymentsRes, notificationsRes] =
          await Promise.allSettled([
            driverVehicleApi.getMyVehicles(),
            bookingApi.getMyBookings(),
            paymentApi.getMyPayments(),
            userId ? notificationApi.getByUser(userId) : Promise.resolve({ data: [] }),
          ]);

        if (cancelled) {
          return;
        }

        const vehicles =
          vehiclesRes.status === "fulfilled" ? unwrapApiData(vehiclesRes.value.data, []) : [];
        const bookings =
          bookingsRes.status === "fulfilled" ? unwrapApiData(bookingsRes.value.data, []) : [];
        const payments =
          paymentsRes.status === "fulfilled" ? unwrapApiData(paymentsRes.value.data, []) : [];
        const notifications =
          notificationsRes.status === "fulfilled"
            ? unwrapApiData(notificationsRes.value.data, [])
            : [];

        const active = bookings.find((item) => {
          const status = getBookingStatus(item);
          return (
            status.includes("active") ||
            status.includes("confirmed") ||
            status.includes("pending")
          );
        }) || null;

        const monthlyExpenses = payments.reduce(
          (sum, item) => sum + Number(item.amount || item.totalAmount || item.fee || 0),
          0
        );

        setStats([
          {
            label: "Registered Vehicles",
            value: String(vehicles.length),
            icon: Car,
            color: "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200",
            action: "/driver/vehicles",
          },
          {
            label: "Active Booking",
            value: String(
              bookings.filter((item) => {
                const status = getBookingStatus(item);
                return (
                  status.includes("active") ||
                  status.includes("confirmed") ||
                  status.includes("pending")
                );
              }).length
            ),
            icon: BookOpen,
            color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200",
            action: "/driver/booking",
          },
          {
            label: "Current Session",
            value: active
              ? formatDuration(
                  active.checkInTime || active.startTime || active.createdAt,
                  active.checkOutTime || active.endTime || new Date().toISOString()
                )
              : "--:--",
            icon: Clock,
            color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200",
            action: "/driver/current-session",
          },
          {
            label: "Notifications",
            value: String(notifications.filter((item) => !item.isRead).length),
            icon: Bell,
            color: "bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200",
            action: "/driver/notifications",
          },
          {
            label: "Monthly Expenses",
            value: formatCurrency(monthlyExpenses),
            icon: CreditCard,
            color: "bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-200",
            action: "/driver/payments",
          },
        ]);

        setActiveBooking(active);
        setRecentBookings(bookings.slice(0, 3));
        setRecentNotifications(notifications.slice(0, 4));
      } catch (error) {
        console.error("Load driver dashboard failed:", error);
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.action)}
              className="rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm shadow-slate-950/5 transition-all hover:border-primary/20 hover:shadow-md hover:shadow-primary/10 dark:bg-slate-900/70 dark:shadow-black/10"
            >
              <div
                className={`size-9 rounded-xl flex items-center justify-center ${item.color} mb-3`}
              >
                <Icon size={16} />
              </div>
              <div className="text-xl font-bold text-foreground">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 p-6 text-white shadow-lg shadow-indigo-500/15 dark:border-indigo-500/20 dark:bg-gradient-to-r dark:from-[#161b33] dark:via-[#1d2450] dark:to-[#2a2160] dark:shadow-black/20">
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <p className="mb-1 text-xs text-white/75 dark:text-slate-300/80">Active Parking Session</p>
            <h2 className="font-bold mb-0.5 text-xl">
              {activeBooking?.buildingName ||
                activeBooking?.parkingBuildingName ||
                "No active session"}
            </h2>
            <p className="text-sm text-white/80 dark:text-slate-300/85">
              {activeBooking
                ? `${
                    activeBooking.slotCode ||
                    activeBooking.parkingSlotCode ||
                    "Slot pending"
                  } - ${
                    activeBooking.licensePlate ||
                    activeBooking.vehiclePlate ||
                    "Vehicle linked"
                  }`
                : "Create a booking to see your current parking session here"}
            </p>
          </div>

          <div className="min-w-[92px] rounded-xl border border-white/20 bg-white/12 px-4 py-2 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
            <div className="text-2xl font-bold font-mono">
              {activeBooking
                ? formatDuration(
                    activeBooking.checkInTime ||
                      activeBooking.startTime ||
                      activeBooking.createdAt,
                    activeBooking.checkOutTime ||
                      activeBooking.endTime ||
                      new Date().toISOString()
                  )
                : "--:--"}
            </div>
            <div className="text-xs text-white/70 dark:text-slate-400">Duration</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-xs text-white/70 dark:text-slate-400">Booking Status</p>
            <p className="font-semibold text-sm mt-0.5 capitalize">
              {activeBooking ? getBookingStatus(activeBooking) : "waiting"}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-xs text-white/70 dark:text-slate-400">Estimated Fee</p>
            <p className="font-semibold text-sm mt-0.5">
              {formatCurrency(
                activeBooking?.amount ||
                  activeBooking?.estimatedFee ||
                  activeBooking?.totalAmount ||
                  0
              )}
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-xs text-white/70 dark:text-slate-400">Vehicle</p>
            <p className="font-semibold text-sm mt-0.5">
              {activeBooking?.licensePlate || activeBooking?.vehiclePlate || "Not assigned"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="rounded-2xl border border-border/80 bg-card shadow-sm shadow-slate-950/5 dark:bg-slate-900/70 dark:shadow-black/10">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/80">
            <h3 className="font-semibold text-foreground text-sm">Recent Bookings</h3>
            <button
              onClick={() => navigate("/driver/bookings")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentBookings.map((item, index) => (
              <div
                key={item.bookingId || item.id || index}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-primary/[0.04]"
              >
                <div className="size-9 rounded-xl bg-muted/70 flex items-center justify-center shrink-0 dark:bg-white/5">
                  <MapPin size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.buildingName ||
                      item.parkingBuildingName ||
                      "Parking Building"}{" "}
                    - {item.slotCode || item.parkingSlotCode || "Slot"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.bookingDate || item.createdAt || "Recently created"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(item.amount || item.totalAmount || item.estimatedFee || 0)}
                  </p>
                  <StatusBadge status={getBookingStatus(item)} />
                </div>
              </div>
            ))}
            {recentBookings.length === 0 && (
              <div className="px-5 py-8 text-sm text-muted-foreground">
                No bookings returned from the backend yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card shadow-sm shadow-slate-950/5 dark:bg-slate-900/70 dark:shadow-black/10">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/80">
            <h3 className="font-semibold text-foreground text-sm">Recent Notifications</h3>
            <button
              onClick={() => navigate("/driver/notifications")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentNotifications.map((item, index) => (
              <div
                key={item.notificationId || index}
                className="px-5 py-4 transition-colors hover:bg-primary/[0.04]"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                      item.isRead
                        ? "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-300"
                        : "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
                    }`}
                  >
                    <Bell size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.title || "Notification"}
                      </p>
                      {!item.isRead && (
                        <span className="inline-block size-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.body || item.message || item.content || "No details"}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                      <Clock size={11} />
                      {formatRelativeTime(item.createdAt || item.sentAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {recentNotifications.length === 0 && (
              <div className="px-5 py-8 text-sm text-muted-foreground">
                No notifications returned from the backend yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

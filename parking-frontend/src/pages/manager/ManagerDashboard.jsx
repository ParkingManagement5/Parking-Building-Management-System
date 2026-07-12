import { useEffect, useState } from "react";
import { dashboardApi } from "../../api/manager/dashboardApi";
import { reportApi } from "../../api/manager/reportApi";
import { staffShiftApi } from "../../api/manager/staffShiftApi";
import { notificationApi } from "../../api/notificationApi";
import { getUserId } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { ManagerStatBar } from "../../ui/components/manager/ManagerUi";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  return unwrapApiData(payload, []);
}

function todayDateString() {
  // Dung thanh phan ngay-thang-nam theo local time — toISOString() quy ve
  // UTC se lui 1 ngay voi mui gio +7 (xem fix tuong tu o StaffShiftPage).
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function shiftTone(shiftName) {
  const n = (shiftName || "").toLowerCase();
  if (n.includes("sáng")) return "text-amber-600 dark:text-amber-300";
  if (n.includes("chiều")) return "text-blue-600 dark:text-blue-300";
  if (n.includes("đêm")) return "text-violet-600 dark:text-violet-300";
  return "text-muted-foreground";
}

const PIE_COLORS = ["#4F46E5", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444"];

export default function ManagerDashboard() {
  const [stats, setStats] = useState([
    { label: "Doanh thu hôm nay", value: "0đ", hint: "0 lượt xe", tone: "emerald" },
    { label: "Tỷ lệ lấp đầy", value: "0%", hint: "Theo thời gian thực", tone: "violet" },
    { label: "Số slot đỗ xe", value: "0", hint: "Đã cấu hình trong hệ thống", tone: "blue" },
    { label: "Tòa nhà", value: "0", hint: "Đang quản lý", tone: "emerald" },
    { label: "Bảng giá đang áp dụng", value: "0", hint: "Chính sách giá đang bật", tone: "amber" },
    { label: "Ca làm đã phân công", value: "0", hint: "Xem ở trang Ca làm việc", tone: "rose" },
  ]);
  const [slotTrend, setSlotTrend] = useState([]);
  const [vehicleMix, setVehicleMix] = useState([]);
  const [availabilityByBuilding, setAvailabilityByBuilding] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const today = todayDateString();
        const [dashRes, notifications, revenueRes, todayShiftsRes] = await Promise.all([
          dashboardApi.getManagerStats(),
          getUserId()
            ? notificationApi.getByUser(getUserId()).then((r) => asArray(r.data))
            : Promise.resolve([]),
          reportApi.getRevenue({ from: today, to: today }).catch(() => null),
          staffShiftApi.getByDate(today).catch(() => null),
        ]);

        if (cancelled) return;

        const d = dashRes.data?.data ?? dashRes.data ?? {};

        const totalSlots = d.totalSlots ?? 0;
        const availableSlots = d.availableSlots ?? 0;
        const occupancyRate = d.occupancyRatePercent ?? 0;
        const totalBuildings = d.totalBuildings ?? 0;
        const activePricingCount = d.activePricingCount ?? 0;
        const activeGateCount = d.activeGateCount ?? 0;
        const staffShifts = d.staffShiftCount ?? 0;
        const slotsByBuilding = d.slotsByBuilding ?? [];
        const vehicleTypeMix = d.vehicleTypeMix ?? [];

        const revenue = revenueRes ? unwrapApiData(revenueRes.data, {}) : {};
        const todayRevenue = revenue.totalRevenue ?? 0;
        const todaySessions = revenue.totalSessions ?? 0;

        setTodayShifts(todayShiftsRes ? asArray(todayShiftsRes.data) : []);

        setStats([
          {
            label: "Doanh thu hôm nay",
            value: formatCurrency(todayRevenue),
            hint: `${todaySessions} lượt xe`,
            tone: "emerald",
          },
          {
            label: "Tỷ lệ lấp đầy",
            value: `${occupancyRate}%`,
            hint: `${availableSlots} slot còn trống`,
            tone: "violet",
          },
          {
            label: "Số slot đỗ xe",
            value: String(totalSlots),
            hint: "Đã cấu hình trong hệ thống",
            tone: "blue",
          },
          {
            label: "Tòa nhà",
            value: String(totalBuildings),
            hint: `${activeGateCount} cổng đang hoạt động`,
            tone: "emerald",
          },
          {
            label: "Bảng giá đang áp dụng",
            value: String(activePricingCount),
            hint: `${vehicleTypeMix.length} loại xe`,
            tone: "amber",
          },
          {
            label: "Ca làm đã phân công",
            value: String(staffShifts),
            hint: "Xem ở trang Ca làm việc",
            tone: "rose",
          },
        ]);

        setSlotTrend(
          slotsByBuilding.map((b) => ({
            month: b.buildingName,
            totalSlots: b.totalSlots,
            availableSlots: b.availableSlots,
          }))
        );

        setVehicleMix(
          vehicleTypeMix.map((v) => ({ name: v.name, value: v.zoneCount }))
        );

        setAvailabilityByBuilding(
          slotsByBuilding.map((b) => ({
            day: b.buildingName,
            rate: b.availabilityRatePercent,
          }))
        );

        setRecentNotifications(notifications.slice(0, 5));
      } catch (error) {
        console.error("Failed to load manager dashboard", error);
      }
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-5">
      <ManagerStatBar items={stats} />

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Số lượng slot theo tòa nhà</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={slotTrend} barGap={4} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} iconType="circle" iconSize={8} />
              <Bar dataKey="totalSlots" name="Tổng slot" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={44} />
              <Bar dataKey="availableSlots" name="Slot trống" fill="#06B6D4" radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Tỷ lệ loại xe</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={vehicleMix} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {vehicleMix.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, "Zone"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {vehicleMix.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="text-xs text-muted-foreground">{item.name}</span>
                <span className="text-xs font-semibold text-foreground ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground text-sm mb-5">Tỷ lệ slot trống theo tòa nhà (%)</h3>
        {availabilityByBuilding.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
        ) : (
          <div className="space-y-4">
            {availabilityByBuilding.map((item) => (
              <div key={item.day}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{item.day}</span>
                  <span className="text-muted-foreground">{item.rate}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Thông báo gần đây</h3>
            <span className="text-xs text-muted-foreground">Hộp thư quản lý</span>
          </div>
          <div className="divide-y divide-border">
            {recentNotifications.map((item) => (
              <div key={item.notificationId} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className={`text-xs font-medium ${item.isRead ? "text-foreground" : "text-primary"}`}>{item.title}</p>
                    {!item.isRead && <span className="text-[10px] font-medium text-primary">Mới</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.body || item.message || "-"}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {String(item.createdAt || "").slice(0, 10)}
                </span>
              </div>
            ))}
            {recentNotifications.length === 0 && (
              <div className="px-5 py-8 text-sm text-muted-foreground">Không có thông báo nào.</div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Ca làm hôm nay</h3>
            <span className="text-xs text-muted-foreground">{todayShifts.length} người</span>
          </div>
          <div className="divide-y divide-border">
            {todayShifts.map((item) => (
              <div key={item.staffShiftId} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{item.userName}</p>
                  <p className="text-[11px] text-muted-foreground">{item.startTime} - {item.endTime}</p>
                </div>
                <span className={`text-xs font-semibold ${shiftTone(item.shiftName)}`}>{item.shiftName}</span>
              </div>
            ))}
            {todayShifts.length === 0 && (
              <div className="px-5 py-8 text-sm text-muted-foreground">Chưa có ai được xếp ca hôm nay.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

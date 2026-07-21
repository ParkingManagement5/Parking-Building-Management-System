import { useEffect, useState } from "react";
import { dashboardApi } from "../../api/manager/dashboardApi";
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
  Area,
  AreaChart,
} from "recharts";
import {
  Building2,
  DollarSign,
  Grid3x3,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  return unwrapApiData(payload, []);
}

const PIE_COLORS = ["#4F46E5", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444"];

export default function ManagerDashboard() {
  const [stats, setStats] = useState([
    { label: "Tỷ lệ lấp đầy", value: "0%", change: "Theo thời gian thực", trend: "up", icon: TrendingUp, color: "bg-indigo-50 text-indigo-600" },
    { label: "Số slot đỗ xe", value: "0", change: "Đã cấu hình trong hệ thống", trend: "up", icon: Grid3x3, color: "bg-violet-50 text-violet-600" },
    { label: "Tòa nhà", value: "0", change: "Đang quản lý", trend: "up", icon: Building2, color: "bg-blue-50 text-blue-600" },
    { label: "Bảng giá đang áp dụng", value: "0", change: "Chính sách giá đang bật", trend: "down", icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
  ]);
  const [slotTrend, setSlotTrend] = useState([]);
  const [vehicleMix, setVehicleMix] = useState([]);
  const [availabilityByBuilding, setAvailabilityByBuilding] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [staffShiftCount, setStaffShiftCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [dashRes, notifications] = await Promise.all([
          dashboardApi.getManagerStats(),
          getUserId()
            ? notificationApi.getByUser(getUserId()).then((r) => asArray(r.data))
            : Promise.resolve([]),
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

        setStats([
          {
            label: "Tỷ lệ lấp đầy",
            value: `${occupancyRate}%`,
            change: `${availableSlots} slot còn trống`,
            trend: "up",
            icon: TrendingUp,
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Số slot đỗ xe",
            value: String(totalSlots),
            change: "Đã cấu hình trong hệ thống",
            trend: "up",
            icon: Grid3x3,
            color: "bg-violet-50 text-violet-600",
          },
          {
            label: "Tòa nhà",
            value: String(totalBuildings),
            change: `${activeGateCount} cổng đang hoạt động`,
            trend: "up",
            icon: Building2,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Bảng giá đang áp dụng",
            value: String(activePricingCount),
            change: `${vehicleTypeMix.length} loại xe`,
            trend: "down",
            icon: DollarSign,
            color: "bg-emerald-50 text-emerald-600",
          },
        ]);

        setSlotTrend(
          slotsByBuilding.map((b) => ({
            month: b.buildingName,
            revenue: b.totalSlots,
            target: b.availableSlots,
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
        setStaffShiftCount(staffShifts);
      } catch (error) {
        console.error("Failed to load manager dashboard", error);
      }
    }

    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-card border border-border rounded-2xl p-4">
              <div className={`size-9 rounded-xl flex items-center justify-center ${item.color} mb-3`}>
                <Icon size={16} />
              </div>
              <div className="text-2xl font-bold text-foreground">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
              <div
                className={`flex items-center gap-1 text-xs mt-1 ${
                  item.trend === "up" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {item.trend === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {item.change}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Số lượng slot theo tòa nhà</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={slotTrend}>
              <defs>
                <linearGradient id="managerRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} fill="url(#managerRevGrad)" name="Tổng slot" />
              <Area type="monotone" dataKey="target" stroke="#06B6D4" strokeWidth={2} strokeDasharray="4 4" fill="none" name="Slot trống" />
            </AreaChart>
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
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={availabilityByBuilding}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => [`${value}%`, "Tỷ lệ trống"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
            <Bar dataKey="rate" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Thông báo gần đây</h3>
            <span className="text-xs text-muted-foreground">Hộp thư quản lý</span>
          </div>
          <div className="divide-y divide-border">
            {recentNotifications.map((item) => (
              <div key={item.notificationId} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-amber-100">
                  <Building2 size={12} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-medium text-foreground">{item.title}</p>
                    <span className="text-muted-foreground">·</span>
                    <p className="text-xs text-muted-foreground">{item.isRead ? "Đã đọc" : "Chưa đọc"}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.body || item.message || "-"}</p>
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

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Tổng quan vận hành</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="size-2 rounded-full shrink-0 bg-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Ca làm đã phân công</p>
                <p className="text-[10px] text-muted-foreground">Xem chi tiết ở trang Ca làm việc</p>
              </div>
              <span className="text-xs font-semibold text-foreground">{staffShiftCount}</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="size-2 rounded-full shrink-0 bg-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Tòa nhà đang theo dõi</p>
                <p className="text-[10px] text-muted-foreground">Tổng số tòa nhà trong hệ thống</p>
              </div>
              <span className="text-xs font-semibold text-foreground">{slotTrend.length}</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="size-2 rounded-full shrink-0 bg-violet-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Loại xe</p>
                <p className="text-[10px] text-muted-foreground">Phân bổ theo zone đã cấu hình</p>
              </div>
              <span className="text-xs font-semibold text-foreground">{vehicleMix.length}</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="size-2 rounded-full shrink-0 bg-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Bảng giá đang áp dụng</p>
                <p className="text-[10px] text-muted-foreground">Xem chi tiết ở trang Bảng giá</p>
              </div>
              <span className="text-xs font-semibold text-foreground">
                {stats.find((item) => item.label === "Bảng giá đang áp dụng")?.value || "0"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

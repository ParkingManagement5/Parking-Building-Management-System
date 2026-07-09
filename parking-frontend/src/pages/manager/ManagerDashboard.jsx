import { useEffect, useState } from "react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { gateApi } from "../../api/manager/gateApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { pricingPolicyApi } from "../../api/manager/pricingPolicyApi";
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
  Area,
  AreaChart,
} from "recharts";
import {
  Building2,
  Car,
  DollarSign,
  Grid3x3,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

function asArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return unwrapApiData(payload, []);
}

const PIE_COLORS = ["#4F46E5", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444"];

const getBuildingId = (item) => item?.buildingId ?? item?.id;
const getFloorId = (item) => item?.floorId ?? item?.id;
const getZoneId = (item) => item?.zoneId ?? item?.id;
const getVehicleTypeId = (item) => item?.vehicleTypeId ?? item?.id;

export default function ManagerDashboard() {
  const [stats, setStats] = useState([
    { label: "Occupancy Rate", value: "0%", change: "Live from slots", trend: "up", icon: TrendingUp, color: "bg-indigo-50 text-indigo-600" },
    { label: "Parking Slots", value: "0", change: "Configured in system", trend: "up", icon: Grid3x3, color: "bg-violet-50 text-violet-600" },
    { label: "Buildings", value: "0", change: "Managed buildings", trend: "up", icon: Building2, color: "bg-blue-50 text-blue-600" },
    { label: "Active Pricing", value: "0", change: "Enabled pricing policies", trend: "down", icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
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
        const [buildingRes, vehicleTypeRes, pricingRes, staffShiftRes] =
          await Promise.all([
            buildingApi.getAll(),
            vehicleTypeApi.getAll(),
            pricingPolicyApi.getAll(),
            staffShiftApi.getAll(),
          ]);

        const buildings = asArray(buildingRes.data);
        const vehicleTypes = asArray(vehicleTypeRes.data);
        const pricingPolicies = asArray(pricingRes.data);
        const staffShifts = asArray(staffShiftRes.data);

        const [floorResponses, gateResponses] = await Promise.all([
          Promise.all(buildings.map((item) => floorApi.getByBuilding(getBuildingId(item)))),
          Promise.all(buildings.map((item) => gateApi.getByBuilding(getBuildingId(item)))),
        ]);

        const floors = floorResponses.flatMap((res) => asArray(res.data));
        const gates = gateResponses.flatMap((res) => asArray(res.data));

        const zoneResponses = await Promise.all(
          floors.map((item) => zoneApi.getByFloor(getFloorId(item)))
        );
        const zones = zoneResponses.flatMap((res) => asArray(res.data));

        const slotResponses = await Promise.all(
          zones.map((item) => parkingSlotApi.getByZone(getZoneId(item)))
        );
        const slots = slotResponses.flatMap((res) => asArray(res.data));

        const userId = getUserId();
        const notifications = userId
          ? asArray((await notificationApi.getByUser(userId)).data)
          : [];

        if (cancelled) {
          return;
        }

        const availableCount = slots.filter((item) =>
          String(item.status || "").toUpperCase().includes("AVAILABLE")
        ).length;
        const occupancyRate = slots.length
          ? Math.round(((slots.length - availableCount) / slots.length) * 100)
          : 0;

        setStats([
          {
            label: "Occupancy Rate",
            value: `${occupancyRate}%`,
            change: `${availableCount} slots available`,
            trend: "up",
            icon: TrendingUp,
            color: "bg-indigo-50 text-indigo-600",
          },
          {
            label: "Parking Slots",
            value: String(slots.length),
            change: "Configured in system",
            trend: "up",
            icon: Grid3x3,
            color: "bg-violet-50 text-violet-600",
          },
          {
            label: "Buildings",
            value: String(buildings.length),
            change: `${gates.filter((item) => item.isActive !== false).length} active gates`,
            trend: "up",
            icon: Building2,
            color: "bg-blue-50 text-blue-600",
          },
          {
            label: "Active Pricing",
            value: String(pricingPolicies.filter((item) => item.isActive).length),
            change: `${vehicleTypes.length} vehicle types`,
            trend: "down",
            icon: DollarSign,
            color: "bg-emerald-50 text-emerald-600",
          },
        ]);

        setSlotTrend(
          buildings.map((building) => {
            const buildingId = getBuildingId(building);
            const buildingSlots = slots.filter(
              (slot) => (slot.zone?.floor?.building?.buildingId ?? slot.zone?.floor?.building?.id) === buildingId
            );

            return {
              month: building.name,
              revenue: buildingSlots.length,
              target: buildingSlots.filter((slot) =>
                String(slot.status || "").toUpperCase().includes("AVAILABLE")
              ).length,
            };
          })
        );

        const vehicleTypeCounts = zones.reduce((acc, zone) => {
          const vehicleTypeId = getVehicleTypeId(zone.vehicleType);
          const apiVehicleType = vehicleTypes.find((item) => getVehicleTypeId(item) === vehicleTypeId);
          const name = zone.vehicleType?.name || apiVehicleType?.name || "Unknown";
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {});

        setVehicleMix(
          Object.entries(vehicleTypeCounts).map(([name, value]) => ({
            name,
            value,
          }))
        );

        setAvailabilityByBuilding(
          buildings.map((building) => {
            const buildingId = getBuildingId(building);
            const buildingSlots = slots.filter(
              (slot) => (slot.zone?.floor?.building?.buildingId ?? slot.zone?.floor?.building?.id) === buildingId
            );
            const available = buildingSlots.filter((slot) =>
              String(slot.status || "").toUpperCase().includes("AVAILABLE")
            ).length;

            return {
              day: building.name,
              rate: buildingSlots.length
                ? Math.round((available / buildingSlots.length) * 100)
                : 0,
            };
          })
        );

        setRecentNotifications(notifications.slice(0, 5));
        setStaffShiftCount(staffShifts.length);
      } catch (error) {
        console.error("Failed to load manager dashboard", error);
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
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
          <h3 className="font-semibold text-foreground text-sm mb-5">Slot Inventory By Building</h3>
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
              <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} fill="url(#managerRevGrad)" name="Total slots" />
              <Area type="monotone" dataKey="target" stroke="#06B6D4" strokeWidth={2} strokeDasharray="4 4" fill="none" name="Available slots" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Vehicle Type Mix</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={vehicleMix} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {vehicleMix.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, "Zones"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
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
        <h3 className="font-semibold text-foreground text-sm mb-5">Available Slot Rate By Building (%)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={availabilityByBuilding}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} />
            <Tooltip formatter={(value) => [`${value}%`, "Availability"]} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
            <Bar dataKey="rate" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <div className="bg-card border border-border rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Recent Notifications</h3>
            <span className="text-xs text-muted-foreground">Manager inbox</span>
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
                    <p className="text-xs text-muted-foreground">{item.isRead ? "Read" : "Unread"}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.body || item.message || "-"}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {String(item.createdAt || "").slice(0, 10)}
                </span>
              </div>
            ))}
            {recentNotifications.length === 0 && (
              <div className="px-5 py-8 text-sm text-muted-foreground">No notifications found.</div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Operations Summary</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="size-2 rounded-full shrink-0 bg-emerald-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Staff shifts assigned</p>
                <p className="text-[10px] text-muted-foreground">Assignments from `/staff-shifts`</p>
              </div>
              <span className="text-xs font-semibold text-foreground">{staffShiftCount}</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="size-2 rounded-full shrink-0 bg-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Buildings tracked</p>
                <p className="text-[10px] text-muted-foreground">Returned from `/parking-buildings`</p>
              </div>
              <span className="text-xs font-semibold text-foreground">{slotTrend.length}</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="size-2 rounded-full shrink-0 bg-violet-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Vehicle categories</p>
                <p className="text-[10px] text-muted-foreground">Distribution across configured zones</p>
              </div>
              <span className="text-xs font-semibold text-foreground">{vehicleMix.length}</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className="size-2 rounded-full shrink-0 bg-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">Live pricing policies</p>
                <p className="text-[10px] text-muted-foreground">Visible in manager pricing page</p>
              </div>
              <span className="text-xs font-semibold text-foreground">
                {stats.find((item) => item.label === "Active Pricing")?.value || "0"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

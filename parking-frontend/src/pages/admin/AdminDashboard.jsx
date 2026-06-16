import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { unwrapApiData } from "../../utils/api";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatRoleLabel(value) {
  return String(value || "UNKNOWN").replace(/^ROLE_/, "");
}

function formatStatusLabel(value) {
  return String(value || "UNKNOWN").toUpperCase();
}

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    { label: "Total Users", value: "0", change: "Live from backend", icon: Users, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" },
    { label: "Active Users", value: "0", change: "Accounts with ACTIVE status", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" },
    { label: "Roles", value: "0", change: "Roles returned by API", icon: Shield, color: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300" },
    { label: "Inactive Users", value: "0", change: "Need review", icon: AlertTriangle, color: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" },
  ]);
  const [roleChart, setRoleChart] = useState([]);
  const [statusChart, setStatusChart] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          axiosClient.get("/users"),
          axiosClient.get("/roles"),
        ]);

        if (cancelled) {
          return;
        }

        const users = unwrapApiData(usersRes.data, []);
        const roles = unwrapApiData(rolesRes.data, []);

        const roleCounts = users.reduce((acc, user) => {
          const key = formatRoleLabel(user.role);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const statusCounts = users.reduce((acc, user) => {
          const key = formatStatusLabel(user.status);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        setStats([
          {
            label: "Total Users",
            value: String(users.length),
            change: "Live from backend",
            icon: Users,
            color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
          },
          {
            label: "Active Users",
            value: String(users.filter((item) => item.status === "ACTIVE").length),
            change: "Accounts with ACTIVE status",
            icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
          },
          {
            label: "Roles",
            value: String(roles.length),
            change: "Roles returned by API",
            icon: Shield,
            color: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
          },
          {
            label: "Inactive Users",
            value: String(users.filter((item) => item.status !== "ACTIVE").length),
            change: "Need review",
            icon: AlertTriangle,
            color: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
          },
        ]);

        setRoleChart(
          Object.entries(roleCounts).map(([name, usersCount]) => ({
            name,
            users: usersCount,
          }))
        );
        setStatusChart(
          Object.entries(statusCounts).map(([status, total]) => ({
            status,
            total,
          }))
        );
        setRecentUsers(users.slice(0, 6));
      } catch (error) {
        console.error("Load admin dashboard failed:", error);
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
              <div className="text-xs text-emerald-600 mt-1">{item.change}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">User Distribution By Role</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={roleChart}>
              <defs>
                <linearGradient id="adminRoleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
              <Area type="monotone" dataKey="users" stroke="#4F46E5" strokeWidth={2.5} fill="url(#adminRoleGrad)" name="Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground text-sm">Account Status</h3>
            <Activity size={13} className="text-muted-foreground" />
          </div>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={statusChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="total" fill="#06B6D4" radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-4">
            {statusChart.map((item) => (
              <div key={item.status} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                <div
                  className={`size-2 rounded-full shrink-0 ${
                    item.status === "ACTIVE"
                      ? "bg-emerald-500"
                      : item.status === "INACTIVE"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{item.status}</p>
                  <p className="text-[10px] text-muted-foreground">{item.total} accounts</p>
                </div>
                <span className="text-xs font-semibold text-foreground">{item.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Recent Users</h3>
          <span className="text-xs text-muted-foreground">Directly from `/users`</span>
        </div>
        <div className="divide-y divide-border">
          {recentUsers.map((user) => (
            <div key={user.userId} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-muted/30 transition-colors">
              <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                {String(user.fullName || user.username || "U")
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0] || "")
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-xs font-medium text-foreground">{user.fullName || user.username}</p>
                  <span className="text-muted-foreground">·</span>
                  <p className="text-xs text-muted-foreground">{formatRoleLabel(user.role)}</p>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {user.email || "No email"} · {formatStatusLabel(user.status)}
                </p>
              </div>
              <span className="text-xs text-emerald-600 whitespace-nowrap flex items-center gap-1">
                <TrendingUp size={11} />
                Live
              </span>
            </div>
          ))}
          {recentUsers.length === 0 && (
            <div className="px-5 py-8 text-sm text-muted-foreground">No users returned from backend.</div>
          )}
        </div>
      </div>
    </div>
  );
}

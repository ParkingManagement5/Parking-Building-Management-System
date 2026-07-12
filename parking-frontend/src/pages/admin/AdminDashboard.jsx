import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { unwrapApiData } from "../../utils/api";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ManagerStatBar } from "../../ui/components/manager/ManagerUi";

const STATUS_LABELS = { ACTIVE: "Đang hoạt động", INACTIVE: "Ngừng hoạt động", SUSPENDED: "Đã khóa" };

function formatRoleLabel(value) {
  return String(value || "UNKNOWN").replace(/^ROLE_/, "");
}

function formatStatusLabel(value) {
  return String(value || "UNKNOWN").toUpperCase();
}

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    { label: "Tổng người dùng", value: "0", hint: "Dữ liệu trực tiếp từ backend", tone: "blue" },
    { label: "Người dùng hoạt động", value: "0", hint: "Đang hoạt động", tone: "emerald" },
    { label: "Vai trò", value: "0", hint: "Vai trò lấy từ API", tone: "violet" },
    { label: "Ngừng hoạt động", value: "0", hint: "Cần rà soát lại", tone: "amber" },
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
            label: "Tổng người dùng",
            value: String(users.length),
            hint: "Dữ liệu trực tiếp từ backend",
            tone: "blue",
          },
          {
            label: "Người dùng hoạt động",
            value: String(users.filter((item) => item.status === "ACTIVE").length),
            hint: "Đang hoạt động",
            tone: "emerald",
          },
          {
            label: "Vai trò",
            value: String(roles.length),
            hint: "Vai trò lấy từ API",
            tone: "violet",
          },
          {
            label: "Ngừng hoạt động",
            value: String(users.filter((item) => item.status !== "ACTIVE").length),
            hint: "Cần rà soát lại",
            tone: "amber",
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
      <ManagerStatBar items={stats} />

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-5">Phân bổ người dùng theo vai trò</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={roleChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 12 }} />
              <Bar dataKey="users" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={56} name="Người dùng" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Trạng thái tài khoản</h3>
          <div className="space-y-2.5">
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
                  <p className="text-xs font-medium text-foreground truncate">{STATUS_LABELS[item.status] || item.status}</p>
                  <p className="text-[10px] text-muted-foreground">{item.total} tài khoản</p>
                </div>
                <span className="text-xs font-semibold text-foreground">{item.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Người dùng gần đây</h3>
          <span className="text-xs text-muted-foreground">Cập nhật trực tiếp</span>
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
                  {user.email || "Chưa có email"} · {STATUS_LABELS[formatStatusLabel(user.status)] || formatStatusLabel(user.status)}
                </p>
              </div>
              <span className="text-xs text-emerald-600 whitespace-nowrap flex items-center gap-1">
                <TrendingUp size={11} />
                Trực tiếp
              </span>
            </div>
          ))}
          {recentUsers.length === 0 && (
            <div className="px-5 py-8 text-sm text-muted-foreground">Chưa có dữ liệu người dùng.</div>
          )}
        </div>
      </div>
    </div>
  );
}

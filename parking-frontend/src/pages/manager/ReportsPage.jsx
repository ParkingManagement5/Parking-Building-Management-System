import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Car, X, BarChart2 } from "lucide-react";
import { reportApi } from "../../api/manager/reportApi";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerStatBar,
  ManagerPanel,
  ManagerRow,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function formatDuration(minutes) {
  if (minutes == null) return "—";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}p` : `${m}p`;
}

const GROUP_BY_OPTIONS = [
  { value: "DAY",   label: "Ngày" },
  { value: "WEEK",  label: "Tuần" },
  { value: "MONTH", label: "Tháng" },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.name === "Doanh thu" ? formatCurrency(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [groupBy, setGroupBy] = useState("DAY");
  const [timeSeries, setTimeSeries] = useState(null);
  const [tsLoading, setTsLoading] = useState(true);
  const [tsError, setTsError] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await reportApi.getRevenue(params);
      setReport(unwrapApiData(res.data, null));
    } catch (err) {
      console.error("Failed to load revenue report", err);
      setError(err.response?.data?.message || "Không tải được báo cáo doanh thu.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadTimeSeries() {
    setTsLoading(true);
    setTsError("");
    try {
      const params = { groupBy };
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await reportApi.getTimeSeries(params);
      setTimeSeries(unwrapApiData(res.data, null));
    } catch (err) {
      console.error("Failed to load time series", err);
      setTsError(err.response?.data?.message || "Không tải được biểu đồ.");
      setTimeSeries(null);
    } finally {
      setTsLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, [from, to]);

  useEffect(() => {
    void loadTimeSeries();
  }, [from, to, groupBy]);

  const byBuilding = report?.byBuilding || [];
  const byVehicleType = report?.byVehicleType || [];

  const chartData = (timeSeries?.series || []).map((p) => ({
    period: p.period,
    revenue: Number(p.revenue || 0),
    sessions: p.sessions || 0,
    avg: Number(p.avgFeePerSession || 0),
  }));

  const peakPoint = chartData.length > 0
    ? chartData.reduce((a, b) => (a.revenue >= b.revenue ? a : b))
    : null;
  const avgRevenue = chartData.length > 0
    ? chartData.reduce((s, p) => s + p.revenue, 0) / chartData.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Header + date filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Báo cáo Doanh thu & Lượt xe</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Lọc theo khoảng ngày.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <span className="text-xs text-muted-foreground">đến</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
          />
          {(from || to) && (
            <button
              onClick={() => { setFrom(""); setTo(""); }}
              className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} /> Xóa lọc
            </button>
          )}
          {loading && <span className="text-xs text-muted-foreground">Đang tải...</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      <ManagerStatBar
        items={[
          { label: "Tổng doanh thu", value: formatCurrency(report?.totalRevenue), hint: "Phí đã thu (PAID)", tone: "emerald" },
          { label: "Tổng lượt xe", value: report?.totalSessions ?? 0, hint: "Trong khoảng lọc", tone: "violet" },
          {
            label: "Doanh thu / lượt",
            value: formatCurrency(report?.totalSessions ? (report.totalRevenue || 0) / report.totalSessions : 0),
            hint: "Trung bình mỗi lượt",
            tone: "blue",
          },
        ]}
      />

      {/* ── Time-series chart ── */}
      <ManagerPanel
        title="Xu hướng Doanh thu"
        subtitle="Biểu đồ doanh thu và lượt xe theo thời gian"
        actions={
          <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
            {GROUP_BY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGroupBy(opt.value)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  groupBy === opt.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      >
        {tsError && (
          <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {tsError}
          </div>
        )}

        {/* Chart mini-stats */}
        {!tsLoading && chartData.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Doanh thu TB/{groupBy === "DAY" ? "ngày" : groupBy === "WEEK" ? "tuần" : "tháng"}</p>
              <p className="mt-1 text-base font-bold text-foreground">{formatCurrency(avgRevenue)}</p>
            </div>
            <div className="rounded-2xl bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Cao nhất</p>
              <p className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(peakPoint?.revenue)}</p>
              <p className="text-[10px] text-muted-foreground">{peakPoint?.period}</p>
            </div>
            <div className="rounded-2xl bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Số kỳ có dữ liệu</p>
              <p className="mt-1 text-base font-bold text-foreground">{chartData.length}</p>
            </div>
          </div>
        )}

        {tsLoading ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">Đang tải biểu đồ...</div>
        ) : chartData.length === 0 ? (
          <div className="flex h-52 flex-col items-center justify-center gap-2 text-muted-foreground">
            <BarChart2 size={32} className="opacity-30" />
            <p className="text-sm">Chưa có dữ liệu trong khoảng thời gian đã chọn</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
              />
              <YAxis
                yAxisId="sessions"
                orientation="right"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                name="Doanh thu"
                fill="var(--chart-3, #22c55e)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                yAxisId="sessions"
                dataKey="sessions"
                name="Lượt xe"
                fill="var(--chart-2, #2563eb)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ManagerPanel>

      {/* By building table */}
      <ManagerPanel>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Doanh thu & lượt xe theo tòa nhà</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Sắp xếp theo doanh thu giảm dần</p>
        </div>
        {byBuilding.length === 0 ? (
          <ManagerEmptyState title="Chưa có dữ liệu" description="Chưa có phiên đỗ xe nào trong khoảng thời gian đã chọn." />
        ) : (
          <ManagerDataTable columns={["Tòa nhà", "Doanh thu", "Lượt xe", "Thời gian đỗ TB"]}>
            {byBuilding.map((item) => (
              <ManagerRow key={item.buildingId}>
                <ManagerCell className="font-medium">{item.buildingName}</ManagerCell>
                <ManagerCell className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.revenue)}</ManagerCell>
                <ManagerCell>{item.sessionCount}</ManagerCell>
                <ManagerCell>{formatDuration(item.avgDurationMinutes)}</ManagerCell>
              </ManagerRow>
            ))}
          </ManagerDataTable>
        )}
      </ManagerPanel>

      {/* By vehicle type table */}
      <ManagerPanel>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Doanh thu theo loại xe</h2>
        </div>
        {byVehicleType.length === 0 ? (
          <ManagerEmptyState title="Chưa có dữ liệu" description="Chưa có doanh thu nào trong khoảng thời gian đã chọn." />
        ) : (
          <ManagerDataTable columns={["Loại xe", "Doanh thu", "Lượt xe"]}>
            {byVehicleType.map((item) => (
              <ManagerRow key={item.vehicleTypeName}>
                <ManagerCell className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Car size={13} className="text-muted-foreground" /> {item.vehicleTypeName}
                  </span>
                </ManagerCell>
                <ManagerCell className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.revenue)}</ManagerCell>
                <ManagerCell>{item.sessionCount}</ManagerCell>
              </ManagerRow>
            ))}
          </ManagerDataTable>
        )}
      </ManagerPanel>
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { revenueApi } from "../../api/manager/revenueApi";
import { DollarSign, TrendingUp, BarChart2, ChevronLeft } from "lucide-react";

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const PIE_COLORS = ["#00e676", "#00b0ff", "#ff9100", "#ea80fc", "#ff5252", "#69f0ae"];

function formatVND(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}
function formatVNDFull(v) {
  return new Intl.NumberFormat("vi-VN").format(v) + " ₫";
}

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-hover)",
      borderRadius: 10, padding: "10px 14px", boxShadow: "var(--shadow)",
    }}>
      <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--accent)", margin: 0, fontSize: 13 }}>{formatVNDFull(payload[0].value)}</p>
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-hover)",
      borderRadius: 10, padding: "10px 14px", boxShadow: "var(--shadow)",
    }}>
      <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{payload[0].name}</p>
      <p style={{ color: "var(--accent)", margin: 0, fontSize: 13 }}>{formatVNDFull(payload[0].value)}</p>
    </div>
  );
};

const selectStyle = {
  background: "var(--bg-elevated)", border: "1px solid var(--border)",
  borderRadius: 8, color: "var(--text)", padding: "7px 14px",
  fontSize: 14, cursor: "pointer", outline: "none",
};

export default function RevenueReportPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(null); // null = yearly view
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    revenueApi.getRevenue(year, month)
      .then((res) => setData(res.data?.data ?? res.data))
      .catch(() => setError("Failed to load revenue data."))
      .finally(() => setLoading(false));
  }, [year, month]);

  // Build chart data
  const isDailyView = month !== null;

  const chartData = isDailyView
    ? (() => {
        const daysInMonth = new Date(year, month, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const found = data?.dailyBreakdown?.find((r) => r.day === d);
          return { name: `${d}`, revenue: found ? Number(found.revenue) : 0 };
        });
      })()
    : Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const found = data?.monthlyBreakdown?.find((r) => r.month === m);
        return {
          name: MONTH_NAMES[m], revenue: found ? Number(found.revenue) : 0,
          _month: m,
        };
      });

  const vtData = (data?.vehicleTypeBreakdown ?? []).map((r) => ({
    name: r.vehicleType, value: Number(r.revenue), transactions: Number(r.transactions),
  }));

  const totalRevenue = Number(data?.totalRevenue ?? 0);
  const totalTxn = Number(data?.totalTransactions ?? 0);
  const activeCount = isDailyView
    ? (data?.dailyBreakdown?.length || 1)
    : (data?.monthlyBreakdown?.length || 1);
  const avgPerPeriod = activeCount ? Math.round(totalRevenue / activeCount) : 0;

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  // Click bar in yearly view → drill into that month
  const handleBarClick = (barData) => {
    if (!isDailyView && barData?._month) {
      setMonth(barData._month);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isDailyView && (
            <button
              onClick={() => setMonth(null)}
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text-secondary)", padding: "6px 10px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 13,
              }}
            >
              <ChevronLeft size={15} /> Back
            </button>
          )}
          <div>
            <h1>Revenue Report</h1>
            <p>
              {isDailyView
                ? `Daily breakdown — ${MONTH_NAMES_FULL[month]} ${year}`
                : "Monthly revenue breakdown and vehicle type statistics"}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Year</span>
          <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setMonth(null); }} style={selectStyle}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Month</span>
          <select
            value={month ?? ""}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : null)}
            style={selectStyle}
          >
            <option value="">All</option>
            {monthOptions.map((m) => <option key={m} value={m}>{MONTH_NAMES_FULL[m]}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>Loading...</div>
      )}
      {error && (
        <div style={{
          background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.3)",
          borderRadius: 10, padding: "12px 16px", color: "var(--danger)", marginBottom: 24,
        }}>{error}</div>
      )}

      {!loading && data && (
        <>
          {/* Stat cards */}
          <div className="stat-cards" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="stat-card">
              <div className="stat-card-icon green"><DollarSign size={22} /></div>
              <div>
                <span className="stat-card-label">Total Revenue</span>
                <span className="stat-card-value green-text" style={{ fontSize: "1.35rem" }}>
                  {formatVNDFull(totalRevenue)}
                </span>
                <span className="stat-card-change">
                  {isDailyView ? `${MONTH_NAMES_FULL[month]} ${year}` : `Year ${year}`}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon blue"><TrendingUp size={22} /></div>
              <div>
                <span className="stat-card-label">Total Transactions</span>
                <span className="stat-card-value">{totalTxn.toLocaleString()}</span>
                <span className="stat-card-change">Completed payments</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon orange"><BarChart2 size={22} /></div>
              <div>
                <span className="stat-card-label">
                  {isDailyView ? "Avg. per Day" : "Avg. per Month"}
                </span>
                <span className="stat-card-value orange-text" style={{ fontSize: "1.35rem" }}>
                  {formatVNDFull(avgPerPeriod)}
                </span>
                <span className="stat-card-change">Active periods only</span>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="chart-card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>
              {isDailyView
                ? `Daily Revenue — ${MONTH_NAMES_FULL[month]} ${year}`
                : `Monthly Revenue — ${year}`}
            </h3>
            {!isDailyView && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
                Click a bar to drill down by day
              </p>
            )}
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0]?.payload)}
                style={{ cursor: isDailyView ? "default" : "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false}
                  interval={isDailyView ? 1 : 0} />
                <YAxis tickFormatter={formatVND} tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="revenue" fill="#00e676" radius={[4, 4, 0, 0]}
                  activeBar={{ fill: "#69f0ae" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie + table */}
          {vtData.length > 0 ? (
            <div className="chart-card">
              <h3 style={{ fontWeight: 700, marginBottom: 20, color: "var(--text)" }}>
                Revenue by Vehicle Type — {year}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center" }}>
                <ResponsiveContainer width={240} height={240}>
                  <PieChart>
                    <Pie data={vtData} cx="50%" cy="50%" outerRadius={110} innerRadius={50}
                      dataKey="value" paddingAngle={3}>
                      {vtData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["Type", "Revenue", "Txn"].map((h, i) => (
                          <th key={i} style={{
                            textAlign: i === 0 ? "left" : "right", padding: "8px",
                            color: "var(--text-muted)", fontWeight: 500,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vtData.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ padding: "10px 8px", color: "var(--text)" }}>
                            <span style={{
                              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                              background: PIE_COLORS[idx % PIE_COLORS.length], marginRight: 8,
                            }} />
                            {row.name}
                          </td>
                          <td style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600, color: "var(--accent)" }}>
                            {formatVNDFull(row.value)}
                          </td>
                          <td style={{ textAlign: "right", padding: "10px 8px", color: "var(--text-muted)" }}>
                            {row.transactions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="chart-card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
              No payment data found for {isDailyView ? `${MONTH_NAMES_FULL[month]} ` : ""}{year}.
            </div>
          )}
        </>
      )}
    </div>
  );
}

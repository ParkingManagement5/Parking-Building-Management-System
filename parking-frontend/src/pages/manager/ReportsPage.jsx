import { useEffect, useState } from "react";
import { Car, CircleDollarSign, TrendingUp, X } from "lucide-react";
import { reportApi } from "../../api/manager/reportApi";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerStatCard,
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

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setError(err.response?.data?.message || "Khong tai duoc bao cao doanh thu.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, [from, to]);

  const byBuilding = report?.byBuilding || [];
  const byVehicleType = report?.byVehicleType || [];

  return (
    <div className="space-y-4">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <ManagerStatCard icon={CircleDollarSign} label="Tổng doanh thu" value={formatCurrency(report?.totalRevenue)} hint="Phí đỗ xe đã thu (PAID)" tone="emerald" />
        <ManagerStatCard icon={TrendingUp} label="Tổng lượt xe" value={report?.totalSessions ?? 0} hint="Phiên đỗ xe trong khoảng lọc" tone="violet" />
      </div>

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

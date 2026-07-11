import { useEffect, useState, useCallback } from "react";
import { staffRevenueApi } from "../../api/staff/staffRevenueApi";
import { unwrapApiData } from "../../utils/api";
import {
  StaffPageSection,
  StaffStatCard,
  StaffEmptyState,
} from "./StaffUi";
import { Banknote, Receipt, RefreshCw, Car } from "lucide-react";

const VND = (amount) =>
  Number(amount ?? 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });

const fmtTime = (isoStr) => {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const fmtDate = () =>
  new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export default function StaffRevenuePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await staffRevenueApi.getToday();
      setData(unwrapApiData(res.data, null));
      setLastRefresh(new Date());
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu doanh thu. Kiểm tra kết nối server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const transactions = data?.transactions ?? [];

  return (
    <div className="space-y-6 p-5 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Doanh thu hôm nay</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{fmtDate()}</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {lastRefresh && (
        <p className="text-xs text-muted-foreground">
          Cập nhật lúc {lastRefresh.toLocaleTimeString("vi-VN")}
        </p>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StaffStatCard
          icon={Banknote}
          label="Tổng doanh thu"
          value={loading ? "..." : VND(data?.totalRevenue ?? 0)}
          hint="Tổng phí đỗ xe đã thu hôm nay"
          tone="emerald"
        />
        <StaffStatCard
          icon={Car}
          label="Số phiên hoàn thành"
          value={loading ? "..." : (data?.sessionCount ?? 0)}
          hint="Lượt xe ra cổng và thanh toán xong"
          tone="blue"
        />
        <StaffStatCard
          icon={Receipt}
          label="Số giao dịch"
          value={loading ? "..." : (data?.transactionCount ?? 0)}
          hint="Tổng lượt thanh toán PARKING_FEE"
          tone="violet"
        />
      </div>

      {/* Transaction table */}
      <StaffPageSection
        title="Chi tiết giao dịch"
        subtitle="Các khoản phí đỗ xe đã thu trong ngày tại bãi của bạn"
      >
        {loading && transactions.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Đang tải dữ liệu...
          </div>
        ) : transactions.length === 0 ? (
          <StaffEmptyState
            title="Chưa có giao dịch nào"
            description="Hôm nay chưa có khoản phí đỗ xe nào được thanh toán tại bãi này."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">Biển số xe</th>
                  <th className="pb-2 pr-4 font-medium">Loại xe</th>
                  <th className="pb-2 pr-4 font-medium">Giờ thanh toán</th>
                  <th className="pb-2 pr-4 font-medium">Phương thức</th>
                  <th className="pb-2 text-right font-medium">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx, idx) => (
                  <tr key={tx.paymentId ?? idx} className="group hover:bg-muted/30">
                    <td className="py-3 pr-4 text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 pr-4 font-mono font-semibold text-foreground">
                      {tx.vehiclePlate || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {tx.vehicleType || "—"}
                    </td>
                    <td className="py-3 pr-4 text-foreground">
                      {fmtTime(tx.paidAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          tx.paymentMethod === "CASH"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                        }`}
                      >
                        {tx.paymentMethod === "CASH" ? "Tiền mặt" : "VNPay"}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {VND(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={5} className="pt-3 text-sm font-semibold text-foreground">
                    Tổng cộng
                  </td>
                  <td className="pt-3 text-right text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {VND(data?.totalRevenue ?? 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </StaffPageSection>
    </div>
  );
}

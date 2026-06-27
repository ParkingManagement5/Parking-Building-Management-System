import { useEffect, useState } from "react";
import { paymentApi } from "../../api/driver/paymentApi";
import { unwrapApiData } from "../../utils/api";
import { formatCurrency, formatDateTime, getStatusClasses } from "./driverPortalUtils";

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    async function loadPayments() {
      try {
        const res = await paymentApi.getMyPayments();
        setPayments(unwrapApiData(res.data, []));
      } catch (error) {
        console.error("Failed to load payments", error);
        setPayments([]);
      }
    }

    void loadPayments();
  }, []);

  const totalSpent = payments.reduce(
    (sum, item) => sum + Number(item.amount || item.totalAmount || 0),
    0
  );
  const averagePerVisit = payments.length ? totalSpent / payments.length : 0;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Tổng chi tiêu", value: formatCurrency(totalSpent), sub: "Từ hệ thống" },
          { label: "Giao dịch", value: String(payments.length), sub: "Bản ghi đã tải" },
          { label: "Trung bình / lần", value: formatCurrency(averagePerVisit), sub: "Tính trực tiếp" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Transaction table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Lịch sử giao dịch</h3>
          <button className="text-xs text-primary hover:underline">Tải CSV</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Giao dịch</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Mô tả</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Phương thức</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Số tiền</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((item) => (
                <tr key={item.paymentId || item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-mono font-medium text-foreground">
                      {item.paymentId || item.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.paidAt || item.createdAt)}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {item.bookingCode || item.bookingId || "Thanh toán liên kết"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground">
                    {item.method || item.paymentMethod || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold text-foreground">
                    {formatCurrency(item.amount || item.totalAmount || 0)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(
                        item.status || item.paymentStatus || "paid"
                      )}`}
                    >
                      {item.status || item.paymentStatus || "PAID"}
                    </span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Chưa có lịch sử thanh toán nào từ hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

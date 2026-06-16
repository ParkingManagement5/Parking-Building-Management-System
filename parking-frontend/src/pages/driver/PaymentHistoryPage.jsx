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
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Spent", value: formatCurrency(totalSpent), sub: "From backend" },
          { label: "Transactions", value: String(payments.length), sub: "Loaded records" },
          { label: "Avg per Visit", value: formatCurrency(averagePerVisit), sub: "Computed live" },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Transaction History</h3>
          <button className="text-xs text-primary hover:underline">Download CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Transaction</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Method</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
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
                    {item.bookingCode || item.bookingId || "Linked payment"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-foreground">
                    {item.method || item.paymentMethod || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm font-semibold text-foreground">
                    {formatCurrency(item.amount || item.totalAmount || 0)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
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
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No payment history returned from the backend.
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

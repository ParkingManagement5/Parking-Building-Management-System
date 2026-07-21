import { useEffect, useMemo, useState } from "react";
import { paymentApi } from "../../api/driver/paymentApi";
import { unwrapApiData } from "../../utils/api";
import { formatCurrency, formatDateTime, getStatusClasses } from "./driverPortalUtils";

function describePayment(item) {
  if (item.paymentType === "DEPOSIT") {
    return `Coc booking #${item.bookingId || "-"}`;
  }
  if (item.paymentType === "PARKING_FEE") {
    return `Phi do xe session #${item.sessionId || "-"}`;
  }
  return item.bookingCode || item.bookingId || "Thanh toan lien ket";
}

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const paidPayments = payments.filter(
    (item) => String(item.paymentStatus || item.status || "").toUpperCase() === "PAID"
  );
  const totalSpent = paidPayments.reduce(
    (sum, item) => sum + Number(item.amount || item.totalAmount || 0),
    0
  );
  const averagePerVisit = paidPayments.length ? totalSpent / paidPayments.length : 0;
  const paged = useMemo(() => payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [payments, page]);
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Tong chi tieu", value: formatCurrency(totalSpent), sub: "Chi tinh giao dich PAID" },
          { label: "Giao dich thanh cong", value: String(paidPayments.length), sub: `${payments.length} ban ghi tong cong` },
          { label: "Trung binh / lan", value: formatCurrency(averagePerVisit), sub: "Tren giao dich PAID" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Lich su giao dich</h3>
          <button className="text-xs text-primary hover:underline">Tai CSV</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Giao dich</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Mo ta</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Phuong thuc</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">So tien</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Trang thai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.map((item) => (
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
                    {describePayment(item)}
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
              {payments.length > 0 && Array.from({ length: Math.max(0, PAGE_SIZE - paged.length) }, (_, index) => (
                <tr key={`filler-${index}`} aria-hidden="true">
                  <td colSpan="5" className="px-5 py-3.5">&nbsp;</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Chua co lich su thanh toan nao tu he thong.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Truoc
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`size-8 rounded-lg text-xs font-bold transition ${p === page ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

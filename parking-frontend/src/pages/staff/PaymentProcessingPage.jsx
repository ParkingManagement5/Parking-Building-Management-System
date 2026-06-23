import { useEffect, useMemo, useState } from "react";
import { CreditCard, ReceiptText, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { paymentApi } from "../../api/driver/paymentApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { computeSessionFee, formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import {
  StaffEmptyState,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffSelect,
  StaffStatusBadge,
} from "./StaffUi";

export default function PaymentProcessingPage() {
  const [methodMap, setMethodMap] = useState({});
  const [pendingPaymentMap, setPendingPaymentMap] = useState({});
  const [sessions, setSessions] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [receipt, setReceipt] = useState(null);
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadPendingPayments();
  }, []);

  async function loadPendingPayments() {
    setLoading(true);
    setError("");
    try {
      const res = await sessionApi.getSessions({ status: "WAITING_PAYMENT" });
      const paidRes = await paymentApi.getByStatus("PAID");
      setSessions(unwrapApiData(res.data, []));
      setRecentPayments(unwrapApiData(paidRes.data, []).slice(0, 6));
    } catch (err) {
      console.error("Failed to load pending payments", err);
      setError(err.response?.data?.message || "Khong tai duoc danh sach cho thanh toan.");
    } finally {
      setLoading(false);
    }
  }

  function buildMockPaymentPayload(payment, session, amount) {
    return JSON.stringify({
      provider: "MOCK_PAY",
      paymentId: payment.paymentId,
      sessionId: session.sessionId,
      plate: session.licensePlate,
      amount,
      currency: "VND",
      purpose: "PARKING_FEE",
    });
  }

  const createMockPaymentQr = async (session) => {
    const amount = computeSessionFee(session.entryTime);
    const method = methodMap[session.sessionId] || "CASH";
    setProcessingId(session.sessionId);
    setError("");
    try {
      const paymentRes = await paymentApi.createParkingFee({
        sessionId: Number(session.sessionId),
        bookingId: session.bookingId || undefined,
        baseFee: amount,
        totalAmount: amount,
        paymentMethod: method,
      });
      const payment = unwrapApiData(paymentRes.data, null);
      setPendingPaymentMap((prev) => ({
        ...prev,
        [session.sessionId]: {
          payment,
          payload: buildMockPaymentPayload(payment, session, amount),
          amount,
        },
      }));
    } catch (err) {
      console.error("Create mock payment QR failed", err);
      setError(err.response?.data?.message || "Khong tao duoc QR thanh toan gia.");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmMockPayment = async (session) => {
    const pending = pendingPaymentMap[session.sessionId];
    if (!pending?.payment?.paymentId) return;

    const transactionRef = `MOCKPAY-${Date.now()}`;
    setProcessingId(session.sessionId);
    setError("");
    try {
      const paidRes = await paymentApi.confirmParkingFee(pending.payment.paymentId, transactionRef);
      const paid = unwrapApiData(paidRes.data, pending.payment);
      setReceipt({
        ...paid,
        licensePlate: session.licensePlate,
        slotCode: session.slotCode,
        entryTime: session.entryTime,
        exitTime: session.exitTime,
        transactionRef,
        durationFee: pending.amount,
      });
      setRecentPayments((prev) => [paid, ...prev].slice(0, 6));
      setPendingPaymentMap((prev) => {
        const next = { ...prev };
        delete next[session.sessionId];
        return next;
      });
      await loadPendingPayments();
    } catch (err) {
      console.error("Confirm mock payment failed", err);
      setError(err.response?.data?.message || "Khong xac nhan duoc thanh toan mock.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSessions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return sessions.filter((item) => {
      const matchesQuery =
        !keyword ||
        String(item.licensePlate || "").toLowerCase().includes(keyword) ||
        String(item.sessionId || "").toLowerCase().includes(keyword) ||
        String(item.slotCode || "").toLowerCase().includes(keyword);
      const method = methodMap[item.sessionId] || "CASH";
      const matchesMethod = methodFilter === "ALL" || method === methodFilter;
      return matchesQuery && matchesMethod;
    });
  }, [methodFilter, methodMap, query, sessions]);

  return (
    <div className="space-y-5">
      <StaffPageSection title="Pending Payments" subtitle="Backend sessions waiting for parking-fee payment">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search plate, session, or slot"
              className="w-full rounded-2xl border border-border bg-muted py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <StaffSelect value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
            <option value="ALL">All methods</option>
            <option value="CASH">Cash</option>
            <option value="VNPAY">VNPay</option>
          </StaffSelect>
          <StaffSecondaryButton type="button" onClick={loadPendingPayments} disabled={loading}>
            Refresh
          </StaffSecondaryButton>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {filteredSessions.length === 0 ? (
          <StaffEmptyState
            title={loading ? "Loading pending payments" : "No matching pending payments"}
            description="Sessions appear here after staff records vehicle exit."
            tone="success"
          />
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((item) => (
              <div key={item.sessionId} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                      <StaffStatusBadge tone="amber">waiting payment</StaffStatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Session #{item.sessionId} - Slot {item.slotCode} - {formatStaffDateTime(item.entryTime)}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[180px_140px_auto]">
                    <div className="rounded-2xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Current Fee</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatStaffCurrency(computeSessionFee(item.entryTime))}
                      </p>
                    </div>
                    <StaffSelect
                      value={methodMap[item.sessionId] || "CASH"}
                      onChange={(event) =>
                        setMethodMap((prev) => ({
                          ...prev,
                          [item.sessionId]: event.target.value,
                        }))
                      }
                    >
                      <option value="CASH">Cash</option>
                      <option value="VNPAY">VNPay</option>
                    </StaffSelect>
                    <StaffPrimaryButton
                      type="button"
                      onClick={() =>
                        pendingPaymentMap[item.sessionId]
                          ? confirmMockPayment(item)
                          : createMockPaymentQr(item)
                      }
                      disabled={processingId === item.sessionId}
                    >
                      {processingId === item.sessionId
                        ? "Processing..."
                        : pendingPaymentMap[item.sessionId]
                          ? "Confirm Mock Payment"
                          : "Create Payment QR"}
                    </StaffPrimaryButton>
                  </div>
                </div>
                {pendingPaymentMap[item.sessionId] ? (
                  <div className="mt-4 grid gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-4 md:grid-cols-[120px_1fr]">
                    <div className="rounded-2xl bg-white p-3">
                      <QRCodeSVG
                        value={pendingPaymentMap[item.sessionId].payload}
                        size={96}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Mock payment QR #{pendingPaymentMap[item.sessionId].payment.paymentId}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Customer scans this fake QR, then staff confirms mock payment to complete the session.
                      </p>
                      <p className="mt-2 break-all rounded-xl bg-background/80 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {pendingPaymentMap[item.sessionId].payload}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </StaffPageSection>

      {receipt ? (
        <StaffPageSection
          title="Latest Receipt"
          subtitle="Payment confirmation generated from the last processed session"
          action={
            <StaffSecondaryButton type="button" onClick={() => setReceipt(null)}>
              Clear Receipt
            </StaffSecondaryButton>
          }
        >
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-300">
                <ReceiptText size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Payment #{receipt.paymentId}</p>
                <p className="text-xs text-muted-foreground">{receipt.transactionRef || "No transaction reference"}</p>
              </div>
              <div className="ml-auto">
                <StaffStatusBadge tone="emerald">{String(receipt.paymentStatus || "paid").toLowerCase()}</StaffStatusBadge>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Plate", receipt.licensePlate || "--"],
                ["Session", `#${receipt.sessionId}`],
                ["Slot", receipt.slotCode || "--"],
                ["Method", receipt.paymentMethod || "--"],
                ["Entry", formatStaffDateTime(receipt.entryTime)],
                ["Exit", formatStaffDateTime(receipt.exitTime || receipt.paidAt)],
                ["Paid At", formatStaffDateTime(receipt.paidAt)],
                ["Total", formatStaffCurrency(receipt.totalAmount || receipt.durationFee)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </StaffPageSection>
      ) : null}

      <StaffPageSection title="Recent Payments" subtitle="Latest completed backend parking-fee receipts from this page">
        {recentPayments.length === 0 ? (
          <StaffEmptyState title="No recent payments" description="Paid records will appear after processing." />
        ) : (
          <div className="space-y-3">
            {recentPayments.map((item) => (
              <div key={item.paymentId} className="rounded-2xl border border-border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Payment #{item.paymentId}</p>
                      <p className="text-xs text-muted-foreground">
                        Session #{item.sessionId} - {item.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatStaffCurrency(item.totalAmount)}</p>
                    <p className="text-xs text-muted-foreground">{formatStaffDateTime(item.paidAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </StaffPageSection>
    </div>
  );
}

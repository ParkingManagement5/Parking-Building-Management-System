import { useEffect, useMemo, useState } from "react";
import { CreditCard, ReceiptText, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { paymentApi } from "../../api/driver/paymentApi";
import { pricingPolicyApi } from "../../api/manager/pricingPolicyApi";
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
  const [pricingPolicies, setPricingPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [vnpayQrMap, setVnpayQrMap] = useState({});

  useEffect(() => {
    void loadPendingPayments();
  }, []);

  useEffect(() => {
    const regularRefresh = setInterval(() => {
      void loadPendingPayments({ silent: true });
    }, 15000);

    return () => clearInterval(regularRefresh);
  }, []);

  useEffect(() => {
    if (Object.keys(vnpayQrMap).length === 0) return undefined;

    let attempts = 0;
    const fastRefresh = setInterval(() => {
      attempts += 1;
      void loadPendingPayments({ silent: true, auto: true });
      if (attempts >= 10) {
        clearInterval(fastRefresh);
      }
    }, 2000);

    return () => clearInterval(fastRefresh);
  }, [vnpayQrMap]);

  async function loadPendingPayments(options = {}) {
    const { silent = false, auto = false } = options;
    if (!silent) {
      setLoading(true);
      setError("");
    } else if (auto) {
      setIsAutoRefreshing(true);
    }
    try {
      const [res, paidRes, pricingRes] = await Promise.all([
        sessionApi.getSessions({ status: "WAITING_PAYMENT" }),
        paymentApi.getByStatus("PAID"),
        pricingPolicyApi.getAll(),
      ]);
      const waitingSessions = unwrapApiData(res.data, []);
      const restoredPayments = await loadExistingPendingPayments(waitingSessions);
      const activeSessionIds = new Set(waitingSessions.map((item) => String(item.sessionId)));
      const paidParkingFees = unwrapApiData(paidRes.data, []).filter(
        (item) =>
          item?.paymentType === "PARKING_FEE" &&
          item?.paymentStatus === "PAID" &&
          item?.sessionId != null
      );
      setSessions(waitingSessions);
      setPendingPaymentMap(restoredPayments);
      setVnpayQrMap((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([sessionId]) => activeSessionIds.has(String(sessionId)))
        )
      );
      setRecentPayments(paidParkingFees.slice(0, 6));
      const policies = unwrapApiData(pricingRes.data, []);
      setPricingPolicies(policies);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error("Failed to load pending payments", err);
      if (!silent) {
        setError(err.response?.data?.message || "Không tải được danh sách chờ thanh toán.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
      if (auto) {
        setIsAutoRefreshing(false);
      }
    }
  }

  async function loadExistingPendingPayments(waitingSessions) {
    const nextMethodMap = {};
    const entries = await Promise.all(
      waitingSessions.map(async (session) => {
        try {
          const res = await paymentApi.getBySessionId(session.sessionId);
          const payments = unwrapApiData(res.data, []);
          const payment = payments.find(
            (item) =>
              item?.paymentType === "PARKING_FEE" &&
              item?.paymentStatus === "PENDING"
          );
          if (payment?.paymentMethod) {
            nextMethodMap[session.sessionId] = payment.paymentMethod;
          }
          return payment ? [session.sessionId, buildPendingPaymentState(payment, session)] : null;
        } catch (err) {
          console.warn("Failed to load existing payment for session", session.sessionId, err);
          return null;
        }
      })
    );

    setMethodMap((prev) => ({
      ...prev,
      ...nextMethodMap,
    }));
    return Object.fromEntries(entries.filter(Boolean));
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

  function toAmount(value) {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  }

  function buildPendingPaymentState(payment, session) {
    const payableAmount = toAmount(payment.totalAmount);
    return {
      payment,
      payload: buildMockPaymentPayload(payment, session, payableAmount),
      amount: payableAmount,
    };
  }

  function resolveHourlyRate(session) {
    const policy = pricingPolicies.find(
      (p) => p.isActive && p.vehicleTypeId === session.vehicleTypeId
    );
    return Number(policy?.pricePerHour ?? 20000);
  }

  function getSessionPayableAmount(session) {
    if (session?.calculatedFee != null) {
      return toAmount(session.calculatedFee);
    }
    const rate = resolveHourlyRate(session);
    return toAmount(computeSessionFee(session.entryTime, session.exitTime, rate));
  }

  const createPayment = async (session) => {
    const method = methodMap[session.sessionId] || "CASH";
    setProcessingId(session.sessionId);
    setError("");

    if (method === "VNPAY") {
      try {
        const res = await paymentApi.createVnpayParkingFeeUrl(session.sessionId);
        const data = unwrapApiData(res.data, null);
        if (data?.autoConfirmed) {
          await loadPendingPayments();
        } else if (data?.paymentUrl) {
          setVnpayQrMap((prev) => ({ ...prev, [session.sessionId]: data.paymentUrl }));
          void loadPendingPayments({ silent: true, auto: true });
        }
      } catch (err) {
        setError(err.response?.data?.message || "Không tạo được URL VNPay.");
      } finally {
        setProcessingId(null);
      }
      return;
    }

    // CASH flow
    const rate = resolveHourlyRate(session);
    const amount = getSessionPayableAmount(session);
    const policy = pricingPolicies.find((p) => p.isActive && p.vehicleTypeId === session.vehicleTypeId);
    try {
      const paymentRes = await paymentApi.createParkingFee({
        sessionId: Number(session.sessionId),
        bookingId: session.bookingId || undefined,
        policyId: policy?.policyId || undefined,
        appliedRate: rate,
        baseFee: amount,
        totalAmount: amount,
        paymentMethod: method,
      });
      const payment = unwrapApiData(paymentRes.data, null);
      if (!payment?.paymentId) throw new Error("Backend payment response missing paymentId");
      setPendingPaymentMap((prev) => ({ ...prev, [session.sessionId]: buildPendingPaymentState(payment, session) }));
    } catch (err) {
      setError(err.response?.data?.message || "Không tạo được thanh toán.");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmCashPayment = async (session) => {
    const pending = pendingPaymentMap[session.sessionId];
    if (!pending?.payment?.paymentId) return;
    const transactionRef = `CASH-${Date.now()}`;
    setProcessingId(session.sessionId);
    setError("");
    try {
      const paidRes = await paymentApi.confirmParkingFee(pending.payment.paymentId, transactionRef);
      const paid = unwrapApiData(paidRes.data, pending.payment);
      setReceipt({ ...paid, licensePlate: session.licensePlate, slotCode: session.slotCode, entryTime: session.entryTime, exitTime: session.exitTime, transactionRef, durationFee: toAmount(paid.totalAmount ?? pending.amount) });
      setRecentPayments((prev) => [paid, ...prev].slice(0, 6));
      setPendingPaymentMap((prev) => { const next = { ...prev }; delete next[session.sessionId]; return next; });
      await loadPendingPayments();
    } catch (err) {
      setError(err.response?.data?.message || "Không xác nhận được thanh toán.");
    } finally {
      setProcessingId(null);
    }
  };

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const paged = useMemo(() => filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredSessions, page]);
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <StaffPageSection title="Pending Payments" subtitle="Backend sessions waiting for parking-fee payment">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_auto]">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search plate, session, or slot"
              className="w-full rounded-2xl border border-border bg-muted py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <StaffSelect value={methodFilter} onChange={(event) => { setMethodFilter(event.target.value); setPage(1); }}>
            <option value="ALL">All methods</option>
            <option value="CASH">Cash</option>
            <option value="VNPAY">VNPay</option>
          </StaffSelect>
          <StaffSecondaryButton type="button" onClick={() => void loadPendingPayments()} disabled={loading}>
            {isAutoRefreshing ? "Refreshing..." : "Refresh"}
          </StaffSecondaryButton>
        </div>

        {lastSyncedAt ? (
          <p className="mb-4 text-xs text-muted-foreground">
            {isAutoRefreshing ? "Auto refreshing payment status..." : "Last synced"}: {formatStaffDateTime(lastSyncedAt)}
          </p>
        ) : null}

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
            {paged.map((item) => (
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
                      <p className="text-xs text-muted-foreground">
                        {pendingPaymentMap[item.sessionId] ? "Payable Amount" : "Payment Amount"}
                      </p>
                      {(pendingPaymentMap[item.sessionId]
                        ? pendingPaymentMap[item.sessionId].amount
                        : getSessionPayableAmount(item)) === 0 ? (
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">0 VND</p>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Miễn phí</span>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {pendingPaymentMap[item.sessionId]
                            ? formatStaffCurrency(pendingPaymentMap[item.sessionId].amount)
                            : formatStaffCurrency(getSessionPayableAmount(item))}
                        </p>
                      )}
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
                        pendingPaymentMap[item.sessionId] && (methodMap[item.sessionId] || "CASH") === "CASH"
                          ? confirmCashPayment(item)
                          : createPayment(item)
                      }
                      disabled={processingId === item.sessionId}
                    >
                      {processingId === item.sessionId
                        ? "Processing..."
                        : pendingPaymentMap[item.sessionId] && (methodMap[item.sessionId] || "CASH") === "CASH"
                          ? pendingPaymentMap[item.sessionId].amount === 0
                            ? "Hoàn tất (Miễn phí)"
                            : "Xác nhận tiền mặt"
                          : (methodMap[item.sessionId] || "CASH") === "VNPAY"
                            ? "Tạo QR VNPay"
                            : "Tạo phiếu thu tiền mặt"}
                    </StaffPrimaryButton>
                  </div>
                </div>
                {vnpayQrMap[item.sessionId] ? (
                  <div className="mt-4 grid gap-4 rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-4 dark:border-blue-500/20 dark:bg-blue-500/5 md:grid-cols-[120px_1fr]">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <QRCodeSVG value={vnpayQrMap[item.sessionId]} size={96} level="M" includeMargin={false} />
                    </div>
                    <div className="min-w-0 flex flex-col justify-center gap-1">
                      <p className="text-sm font-semibold text-foreground">QR VNPay – Khách quét để thanh toán</p>
                      <p className="text-xs text-muted-foreground">Khách hàng dùng app ngân hàng hoặc VNPay quét mã này. Hệ thống tự xác nhận sau khi thanh toán.</p>
                      <button type="button" onClick={() => { setVnpayQrMap((p) => { const n = {...p}; delete n[item.sessionId]; return n; }); void loadPendingPayments(); }}
                        className="mt-2 self-start rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted">
                        Làm mới trạng thái
                      </button>
                    </div>
                  </div>
                ) : pendingPaymentMap[item.sessionId] ? (
                  <div className="mt-4 grid gap-4 rounded-2xl border border-dashed border-border bg-muted/20 p-4 md:grid-cols-[120px_1fr]">
                    <div className="rounded-2xl bg-white p-3">
                      <QRCodeSVG value={pendingPaymentMap[item.sessionId].payload} size={96} level="M" includeMargin={false} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Tiền mặt – Payment #{pendingPaymentMap[item.sessionId].payment.paymentId}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Thu tiền mặt từ khách, bấm "Xác nhận tiền mặt" để hoàn tất.</p>
                      <p className="mt-2 text-xs font-semibold text-foreground">
                        Số tiền: {formatStaffCurrency(pendingPaymentMap[item.sessionId].amount)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            {Array.from({ length: Math.max(0, PAGE_SIZE - paged.length) }, (_, index) => (
              <div key={`filler-${index}`} aria-hidden="true" className="invisible rounded-2xl border border-border p-4">
                &nbsp;
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              ← Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`size-8 rounded-lg text-xs font-bold transition ${p === page ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              Sau →
            </button>
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
                ["Total", formatStaffCurrency(receipt.totalAmount ?? receipt.durationFee)],
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

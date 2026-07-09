import { useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import {
  computeSessionFee,
  createPortalId,
  formatStaffCurrency,
  formatStaffDateTime,
  getStaffPortalState,
  updateStaffPortalState,
} from "./staffPortalState";
import {
  StaffEmptyState,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSelect,
  StaffStatusBadge,
} from "./StaffUi";

export default function PaymentProcessingPage() {
  const [methodMap, setMethodMap] = useState({});
  const [portalState, setPortalState] = useState(() => getStaffPortalState());
  const unpaidSessions = useMemo(
    () =>
      portalState.sessions.filter(
        (item) => item.status === "ACTIVE" && item.paymentStatus !== "PAID"
      ),
    [portalState.sessions]
  );

  const processPayment = (session) => {
    const amount = computeSessionFee(session.entryTime);
    const method = methodMap[session.sessionId] || "Cash";
    const now = new Date().toISOString();

    updateStaffPortalState((current) => ({
      ...current,
      sessions: current.sessions.map((item) =>
        item.sessionId === session.sessionId
          ? { ...item, feeAmount: amount, paymentStatus: "PAID" }
          : item
      ),
      payments: [
        {
          paymentId: createPortalId("PAY"),
          sessionId: session.sessionId,
          licensePlate: session.licensePlate,
          amount,
          method,
          status: "PAID",
          paidAt: now,
        },
        ...current.payments,
      ],
      activity: [
        {
          id: createPortalId("ACT"),
          plate: session.licensePlate,
          action: `Payment processed ${formatStaffCurrency(amount)}`,
          type: "payment",
          time: now,
        },
        ...current.activity,
      ],
    }));

    setPortalState(getStaffPortalState());
  };

  return (
    <div className="space-y-5">
      <StaffPageSection title="Pending Payments" subtitle="Handle unpaid active sessions before final exit">
        {unpaidSessions.length === 0 ? (
          <StaffEmptyState
            title="No unpaid active sessions"
            description="All current sessions have already been settled."
            tone="success"
          />
        ) : (
          <div className="space-y-3">
            {unpaidSessions.map((item) => (
              <div key={item.sessionId} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                      <StaffStatusBadge tone="amber">unpaid</StaffStatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.sessionId} • {item.gateName} • {formatStaffDateTime(item.entryTime)}
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
                      value={methodMap[item.sessionId] || "Cash"}
                      onChange={(event) =>
                        setMethodMap((prev) => ({
                          ...prev,
                          [item.sessionId]: event.target.value,
                        }))
                      }
                    >
                      <option value="Cash">Cash</option>
                      <option value="VNPay">VNPay</option>
                      <option value="Momo">Momo</option>
                      <option value="Banking">Banking</option>
                    </StaffSelect>
                    <StaffPrimaryButton type="button" onClick={() => processPayment(item)}>
                      Process Payment
                    </StaffPrimaryButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </StaffPageSection>

      <StaffPageSection title="Recent Payments" subtitle="Latest completed payment receipts in the staff workspace">
        <div className="space-y-3">
          {portalState.payments.slice(0, 6).map((item) => (
            <div key={item.paymentId} className="rounded-2xl border border-border px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.paymentId} • {item.method}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{formatStaffCurrency(item.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatStaffDateTime(item.paidAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </StaffPageSection>
    </div>
  );
}

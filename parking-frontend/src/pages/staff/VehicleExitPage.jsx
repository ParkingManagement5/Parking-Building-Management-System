import { useMemo, useState } from "react";
import { CheckCircle2, Receipt, Search } from "lucide-react";
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
  StaffInput,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffSelect,
  StaffStatusBadge,
} from "./StaffUi";

export default function VehicleExitPage() {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("Cash");
  const [portalState, setPortalState] = useState(() => getStaffPortalState());
  const [confirmed, setConfirmed] = useState(null);

  const activeSessions = useMemo(
    () => portalState.sessions.filter((item) => item.status === "ACTIVE"),
    [portalState.sessions]
  );
  const foundSession = useMemo(() => {
    if (!query.trim()) return null;
    const keyword = query.trim().toLowerCase();
    return (
      activeSessions.find(
        (item) =>
          String(item.licensePlate || "").toLowerCase().includes(keyword) ||
          String(item.sessionId || "").toLowerCase().includes(keyword)
      ) || null
    );
  }, [activeSessions, query]);

  const totalFee = foundSession ? computeSessionFee(foundSession.entryTime) : 0;

  const handleConfirmExit = () => {
    if (!foundSession) return;
    const now = new Date().toISOString();
    const payment = {
      paymentId: createPortalId("PAY"),
      sessionId: foundSession.sessionId,
      licensePlate: foundSession.licensePlate,
      amount: totalFee,
      method,
      status: "PAID",
      paidAt: now,
    };

    updateStaffPortalState((current) => ({
      ...current,
      sessions: current.sessions.map((item) =>
        item.sessionId === foundSession.sessionId
          ? {
              ...item,
              status: "COMPLETED",
              exitTime: now,
              feeAmount: totalFee,
              paymentStatus: "PAID",
            }
          : item
      ),
      payments: [payment, ...current.payments],
      activity: [
        {
          id: createPortalId("ACT"),
          plate: foundSession.licensePlate,
          action: `Exited and paid ${formatStaffCurrency(totalFee)}`,
          type: "payment",
          time: now,
        },
        ...current.activity,
      ],
    }));

    setPortalState(getStaffPortalState());
    setConfirmed({
      ...foundSession,
      amount: totalFee,
      paidAt: now,
      method,
    });
    setQuery("");
  };

  const recentPayments = portalState.payments.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <StaffPageSection
          title="Vehicle Exit Processing"
          subtitle="Search an active session, calculate the fee, then confirm checkout"
        >
          {!confirmed ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <StaffInput
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by license plate or session ID"
                  className="sm:flex-1"
                />
                <StaffPrimaryButton type="button" className="flex items-center justify-center gap-2 sm:w-44">
                  <Search size={15} />
                  Search
                </StaffPrimaryButton>
              </div>

              {!foundSession && query.trim() ? (
                <StaffEmptyState
                  title="No active session found"
                  description="Try a different license plate or process a new vehicle entry first."
                />
              ) : null}

              {foundSession ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{foundSession.sessionId}</p>
                        <p className="mt-1 text-xl font-bold text-foreground">{foundSession.licensePlate}</p>
                        <p className="text-sm text-muted-foreground">
                          {foundSession.gateName} • {foundSession.slotCode}
                        </p>
                      </div>
                      <StaffStatusBadge tone="emerald">active</StaffStatusBadge>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Entry Time</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {formatStaffDateTime(foundSession.entryTime)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Current Fee</p>
                      <p className="mt-1 font-semibold text-foreground">{formatStaffCurrency(totalFee)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <StaffSelect value={method} onChange={(event) => setMethod(event.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="VNPay">VNPay</option>
                      <option value="Momo">Momo</option>
                      <option value="Banking">Banking</option>
                    </StaffSelect>
                    <StaffPrimaryButton type="button" onClick={handleConfirmExit}>
                      Confirm Exit
                    </StaffPrimaryButton>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-3xl border border-border bg-background p-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Exit Completed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Payment was confirmed and the vehicle can leave the gate.
              </p>
              <div className="mt-5 space-y-2 rounded-2xl bg-muted/30 p-4 text-left">
                {[
                  ["Session", confirmed.sessionId],
                  ["Plate", confirmed.licensePlate],
                  ["Method", confirmed.method],
                  ["Amount", formatStaffCurrency(confirmed.amount)],
                  ["Paid At", formatStaffDateTime(confirmed.paidAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-3">
                <StaffSecondaryButton type="button" className="flex-1" onClick={() => setConfirmed(null)}>
                  Back
                </StaffSecondaryButton>
                <StaffPrimaryButton
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    setConfirmed(null);
                    setPortalState(getStaffPortalState());
                  }}
                >
                  Next Exit
                </StaffPrimaryButton>
              </div>
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Recent Payments" subtitle="Completed payment records from the staff workspace">
          {recentPayments.length === 0 ? (
            <StaffEmptyState
              title="No payments recorded"
              description="Completed exits will add payment records here."
            />
          ) : (
            <div className="space-y-3">
              {recentPayments.map((item) => (
                <div key={item.paymentId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.paymentId}</p>
                      <p className="text-base font-semibold text-foreground">{item.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">{item.method}</p>
                    </div>
                    <Receipt size={16} className="text-primary" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatStaffDateTime(item.paidAt)}</span>
                    <span className="font-semibold text-foreground">{formatStaffCurrency(item.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>
      </div>
    </div>
  );
}

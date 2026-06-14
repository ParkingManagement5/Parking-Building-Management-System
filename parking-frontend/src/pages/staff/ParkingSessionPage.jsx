import { useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  computeSessionFee,
  formatStaffCurrency,
  formatStaffDateTime,
  getStaffPortalState,
} from "./staffPortalState";
import { StaffEmptyState, StaffInput, StaffPageSection, StaffStatusBadge } from "./StaffUi";

export default function ParkingSessionPage() {
  const [keyword, setKeyword] = useState("");
  const sessions = getStaffPortalState().sessions;

  const filteredSessions = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter(
      (item) =>
        String(item.licensePlate || "").toLowerCase().includes(query) ||
        String(item.sessionId || "").toLowerCase().includes(query) ||
        String(item.gateName || "").toLowerCase().includes(query)
    );
  }, [sessions, keyword]);

  return (
    <div className="space-y-5">
      <StaffPageSection title="Parking Sessions" subtitle="Track active and completed session records in one view">
        <StaffInput
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Filter by plate, session ID, or gate"
          className="mb-4"
        />

        {filteredSessions.length === 0 ? (
          <StaffEmptyState
            title="No session records"
            description="Vehicle entry confirmations will populate this list."
          />
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((item) => (
              <div key={item.sessionId} className="rounded-2xl border border-border px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                      <StaffStatusBadge tone={item.status === "ACTIVE" ? "emerald" : "slate"}>
                        {item.status.toLowerCase()}
                      </StaffStatusBadge>
                      <StaffStatusBadge tone={item.paymentStatus === "PAID" ? "violet" : "amber"}>
                        {item.paymentStatus.toLowerCase()}
                      </StaffStatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.sessionId} • {item.gateName} • {item.slotCode}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                    <div className="rounded-2xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Entry</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{formatStaffDateTime(item.entryTime)}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Current Fee</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatStaffCurrency(item.status === "ACTIVE" ? computeSessionFee(item.entryTime) : item.feeAmount)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Exit</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{item.exitTime ? formatStaffDateTime(item.exitTime) : "Still parked"}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </StaffPageSection>

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Clock3 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Session Summary</p>
            <p className="text-xs text-muted-foreground">
              {sessions.filter((item) => item.status === "ACTIVE").length} active • {sessions.filter((item) => item.status === "COMPLETED").length} completed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

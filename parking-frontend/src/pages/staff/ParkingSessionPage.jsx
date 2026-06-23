import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import {
  computeSessionFee,
  formatStaffCurrency,
  formatStaffDateTime,
} from "./staffPortalState";
import { StaffEmptyState, StaffInput, StaffPageSection, StaffStatusBadge } from "./StaffUi";

export default function ParkingSessionPage() {
  const [keyword, setKeyword] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSessions() {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all([
        sessionApi.getSessions({ status: "ACTIVE" }),
        sessionApi.getSessions({ status: "WAITING_PAYMENT" }),
        sessionApi.getSessions({ status: "COMPLETED" }),
      ]);
      setSessions(responses.flatMap((res) => unwrapApiData(res.data, [])));
    } catch (err) {
      console.error("Failed to load parking sessions", err);
      setError(err.response?.data?.message || "Khong tai duoc danh sach session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter(
      (item) =>
        String(item.licensePlate || "").toLowerCase().includes(query) ||
        String(item.sessionId || "").toLowerCase().includes(query) ||
        String(item.slotCode || "").toLowerCase().includes(query)
    );
  }, [sessions, keyword]);

  return (
    <div className="space-y-5">
      <StaffPageSection title="Parking Sessions" subtitle="Track backend active, waiting-payment, and completed sessions">
        <StaffInput
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Filter by plate, session ID, or slot"
          className="mb-4"
        />

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {filteredSessions.length === 0 ? (
          <StaffEmptyState
            title={loading ? "Loading sessions" : "No session records"}
            description="Backend vehicle entry confirmations will populate this list."
          />
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((item) => (
              <div key={item.sessionId} className="rounded-2xl border border-border px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                      <StaffStatusBadge tone={item.status === "ACTIVE" ? "emerald" : item.status === "WAITING_PAYMENT" ? "amber" : "slate"}>
                        {String(item.status || "unknown").toLowerCase()}
                      </StaffStatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Session #{item.sessionId} - Slot {item.slotCode}
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
                        {formatStaffCurrency(item.status === "ACTIVE" || item.status === "WAITING_PAYMENT" ? computeSessionFee(item.entryTime) : 0)}
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
              {sessions.filter((item) => item.status === "ACTIVE").length} active - {sessions.filter((item) => item.status === "COMPLETED").length} completed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

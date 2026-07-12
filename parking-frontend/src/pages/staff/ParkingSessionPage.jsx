import { useEffect, useMemo, useState } from "react";
import { pricingPolicyApi } from "../../api/manager/pricingPolicyApi";
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
  const [pricingPolicies, setPricingPolicies] = useState([]);

  function resolveHourlyRate(session) {
    if (session?.hourlyRate != null) {
      return Number(session.hourlyRate);
    }
    const policy = pricingPolicies.find(
      (p) => p.isActive && p.vehicleTypeId === session?.vehicleTypeId
    );
    return Number(policy?.pricePerHour ?? 20000);
  }

  function resolveCurrentFee(session) {
    if (!session) return 0;
    if (session.status === "ACTIVE") {
      return computeSessionFee(session.entryTime, session.exitTime || new Date(), resolveHourlyRate(session));
    }
    if (session.calculatedFee != null) {
      return Number(session.calculatedFee);
    }
    return computeSessionFee(session.entryTime, session.exitTime || new Date(), resolveHourlyRate(session));
  }

  async function loadSessions() {
    setLoading(true);
    setError("");
    try {
      const [sessionResponses, pricingRes] = await Promise.all([
        Promise.all([
          sessionApi.getSessions({ status: "ACTIVE" }),
          sessionApi.getSessions({ status: "WAITING_PAYMENT" }),
          sessionApi.getSessions({ status: "COMPLETED" }),
        ]),
        pricingPolicyApi.getAll(),
      ]);
      setSessions(sessionResponses.flatMap((res) => unwrapApiData(res.data, [])));
      setPricingPolicies(unwrapApiData(pricingRes.data, []));
    } catch (err) {
      console.error("Failed to load parking sessions", err);
      setError(err.response?.data?.message || "Không tải được danh sách session.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions();
  }, []);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const paged = useMemo(() => filteredSessions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredSessions, page]);
  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));

  const activeCount = useMemo(() => sessions.filter((item) => item.status === "ACTIVE").length, [sessions]);
  const completedCount = useMemo(() => sessions.filter((item) => item.status === "COMPLETED").length, [sessions]);

  return (
    <div className="space-y-5">
      <StaffPageSection
        title="Parking Sessions"
        subtitle={`${activeCount} active · ${completedCount} completed · ${sessions.length} total`}
      >
        <StaffInput
          value={keyword}
          onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
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
            {paged.map((item) => (
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
                        {formatStaffCurrency(resolveCurrentFee(item))}
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
            {Array.from({ length: Math.max(0, PAGE_SIZE - paged.length) }, (_, index) => (
              <div key={`filler-${index}`} aria-hidden="true" className="invisible rounded-2xl border border-border px-4 py-4">
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
    </div>
  );
}

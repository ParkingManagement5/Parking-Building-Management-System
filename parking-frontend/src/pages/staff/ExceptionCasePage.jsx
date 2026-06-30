import { useEffect, useMemo, useState } from "react";
import { exceptionApi } from "../../api/staff/exceptionApi";
import { formatStaffDateTime } from "./staffPortalState";
import { StaffEmptyState, StaffPageSection, StaffPrimaryButton, StaffSecondaryButton, StaffStatusBadge } from "./StaffUi";
import { unwrapApiData } from "../../utils/api";
import OcrCorrectionPage from "./OcrCorrectionPage";

function exceptionMeta(type) {
  switch (type) {
    case "PLATE_UNVERIFIED":
      return {
        priority: "HIGH",
        priorityTone: "rose",
        recommendation: "Mo lai anh scan, xac minh bien so cuoi cung, neu van mo ho thi escalate manager.",
      };
    case "BOOKING_MISMATCH":
      return {
        priority: "HIGH",
        priorityTone: "amber",
        recommendation: "Doi chieu booking, bien xe, va QR. Khong cho xe vao neu khong khop.",
      };
    case "EXIT_VERIFICATION_FAILED":
    case "LOST_QR":
      return {
        priority: "HIGH",
        priorityTone: "rose",
        recommendation: "Kiem tra lai session/QR tai cong ra. Chi cho ra khi da xac minh hop le.",
      };
    case "SESSION_CONFLICT":
      return {
        priority: "MEDIUM",
        priorityTone: "amber",
        recommendation: "Mo session/booking lien quan va doi chieu voi xe thuc te truoc khi quyet dinh.",
      };
    case "SYSTEM_ERROR":
      return {
        priority: "HIGH",
        priorityTone: "violet",
        recommendation: "Retry flow neu co the, neu van loi thi chuyen ky thuat/manager.",
      };
    default:
      return {
        priority: "MEDIUM",
        priorityTone: "slate",
        recommendation: "Xem mo ta va xu ly theo tinh huong thuc te tai cong.",
      };
  }
}

export default function ExceptionCasePage() {
  const [activeCases, setActiveCases] = useState([]);
  const [resolvedCases, setResolvedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const paged = useMemo(() => activeCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [activeCases, page]);
  const totalPages = Math.max(1, Math.ceil(activeCases.length / PAGE_SIZE));

  useEffect(() => {
    void loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    setError("");
    try {
      const [openRes, progressRes, resolvedRes] = await Promise.all([
        exceptionApi.getByStatus("OPEN"),
        exceptionApi.getByStatus("IN_PROGRESS"),
        exceptionApi.getByStatus("RESOLVED"),
      ]);
      setActiveCases([
        ...unwrapApiData(openRes.data, []),
        ...unwrapApiData(progressRes.data, []),
      ]);
      setResolvedCases(unwrapApiData(resolvedRes.data, []));
    } catch (err) {
      console.error("Failed to load exception cases", err);
      setError(err.response?.data?.message || "Khong tai duoc danh sach exception.");
    } finally {
      setLoading(false);
    }
  }

  const assignToMe = async (item) => {
    const staffId = Number(localStorage.getItem("userId"));
    if (!staffId) {
      setError("Khong tim thay staff userId trong localStorage.");
      return;
    }

    setSavingId(item.exceptionId);
    setError("");
    try {
      await exceptionApi.assign(item.exceptionId, staffId);
      await loadCases();
    } catch (err) {
      console.error("Assign exception failed", err);
      setError(err.response?.data?.message || "Khong assign duoc exception.");
    } finally {
      setSavingId(null);
    }
  };

  const resolveCase = async (item) => {
    setSavingId(item.exceptionId);
    setError("");
    try {
      await exceptionApi.resolve(item.exceptionId);
      await loadCases();
    } catch (err) {
      console.error("Resolve exception failed", err);
      setError(err.response?.data?.message || "Khong resolve duoc exception.");
    } finally {
      setSavingId(null);
    }
  };

  const closeCase = async (item) => {
    setSavingId(item.exceptionId);
    setError("");
    try {
      await exceptionApi.close(item.exceptionId);
      await loadCases();
    } catch (err) {
      console.error("Close exception failed", err);
      setError(err.response?.data?.message || "Khong close duoc exception.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
    <StaffPageSection title="Operational Exceptions" subtitle="Review abnormal gate, plate, and session situations from backend">
      <div className="mb-4 flex justify-end">
        <StaffSecondaryButton type="button" onClick={loadCases} disabled={loading}>
          Refresh
        </StaffSecondaryButton>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {activeCases.length === 0 ? (
        <StaffEmptyState
          title={loading ? "Loading exception cases" : "No open exception cases"}
          description="New issues from entry, QR, OCR, or payment flows will appear here."
          tone="success"
        />
      ) : (
        <div className="space-y-4">
          {paged.map((item) => {
            const meta = exceptionMeta(item.exceptionType);
            return (
            <div key={item.exceptionId} className="rounded-2xl border border-border p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.exceptionType}</p>
                    <StaffStatusBadge tone={item.status === "IN_PROGRESS" ? "blue" : "amber"}>
                      {String(item.status).toLowerCase()}
                    </StaffStatusBadge>
                    <StaffStatusBadge tone={meta.priorityTone}>
                      {meta.priority}
                    </StaffStatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Exception #{item.exceptionId}
                    {item.sessionId ? ` - Session #${item.sessionId}` : ""}
                    {item.requestId ? ` - Request #${item.requestId}` : ""}
                    {" - "}
                    {formatStaffDateTime(item.createdAt)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                  <div className="mt-3 rounded-2xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Recommended action:</span> {meta.recommendation}
                  </div>
                  {item.resolvedBy ? (
                    <p className="mt-2 text-xs text-muted-foreground">Assigned/resolved by user #{item.resolvedBy}</p>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  {item.status === "OPEN" ? (
                    <StaffSecondaryButton
                      type="button"
                      onClick={() => assignToMe(item)}
                      disabled={savingId === item.exceptionId}
                    >
                      Assign to me
                    </StaffSecondaryButton>
                  ) : null}
                  {item.status === "IN_PROGRESS" ? (
                    <StaffPrimaryButton
                      type="button"
                      onClick={() => resolveCase(item)}
                      disabled={savingId === item.exceptionId}
                    >
                      {savingId === item.exceptionId ? "Saving..." : "Resolve"}
                    </StaffPrimaryButton>
                  ) : null}
                </div>
              </div>
            </div>
            );
          })}
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
    <StaffPageSection title="Resolved Gan Day" subtitle="Case da xu ly xong va cho dong ho so">
      {resolvedCases.length === 0 ? (
        <StaffEmptyState
          title={loading ? "Loading resolved cases" : "No resolved cases waiting to close"}
          description="Case RESOLVED se hien o day truoc khi dong ho so."
        />
      ) : (
        <div className="space-y-4">
          {resolvedCases.slice(0, 6).map((item) => {
            const meta = exceptionMeta(item.exceptionType);
            return (
              <div key={item.exceptionId} className="rounded-2xl border border-border p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{item.exceptionType}</p>
                      <StaffStatusBadge tone="emerald">resolved</StaffStatusBadge>
                      <StaffStatusBadge tone={meta.priorityTone}>{meta.priority}</StaffStatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Exception #{item.exceptionId}
                      {item.sessionId ? ` - Session #${item.sessionId}` : ""}
                      {item.requestId ? ` - Request #${item.requestId}` : ""}
                      {" - "}
                      {formatStaffDateTime(item.resolvedAt || item.createdAt)}
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex gap-3">
                    <StaffSecondaryButton
                      type="button"
                      onClick={() => closeCase(item)}
                      disabled={savingId === item.exceptionId}
                    >
                      {savingId === item.exceptionId ? "Saving..." : "Close"}
                    </StaffSecondaryButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </StaffPageSection>
    <OcrCorrectionPage />
    </div>
  );
}

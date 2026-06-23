import { useEffect, useState } from "react";
import { exceptionApi } from "../../api/staff/exceptionApi";
import { formatStaffDateTime } from "./staffPortalState";
import { StaffEmptyState, StaffPageSection, StaffPrimaryButton, StaffSecondaryButton, StaffStatusBadge } from "./StaffUi";
import { unwrapApiData } from "../../utils/api";
import OcrCorrectionPage from "./OcrCorrectionPage";

export default function ExceptionCasePage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    setError("");
    try {
      const [openRes, progressRes] = await Promise.all([
        exceptionApi.getByStatus("OPEN"),
        exceptionApi.getByStatus("IN_PROGRESS"),
      ]);
      setCases([
        ...unwrapApiData(openRes.data, []),
        ...unwrapApiData(progressRes.data, []),
      ]);
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

      {cases.length === 0 ? (
        <StaffEmptyState
          title={loading ? "Loading exception cases" : "No open exception cases"}
          description="New issues from entry, QR, OCR, or payment flows will appear here."
          tone="success"
        />
      ) : (
        <div className="space-y-4">
          {cases.map((item) => (
            <div key={item.exceptionId} className="rounded-2xl border border-border p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.exceptionType}</p>
                    <StaffStatusBadge tone={item.status === "IN_PROGRESS" ? "blue" : "amber"}>
                      {String(item.status).toLowerCase()}
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
                  <StaffPrimaryButton
                    type="button"
                    onClick={() => resolveCase(item)}
                    disabled={savingId === item.exceptionId}
                  >
                    {savingId === item.exceptionId ? "Saving..." : "Resolve"}
                  </StaffPrimaryButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StaffPageSection>
    <OcrCorrectionPage />
    </div>
  );
}

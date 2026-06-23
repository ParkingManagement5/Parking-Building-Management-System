import { useEffect, useState } from "react";
import { requestApi } from "../../api/driver/requestApi";
import { unwrapApiData } from "../../utils/api";
import { formatStaffDateTime } from "./staffPortalState";
import { StaffEmptyState, StaffPageSection, StaffPrimaryButton, StaffSecondaryButton, StaffStatusBadge } from "./StaffUi";

export default function RequestProcessingPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const [openRes, progressRes] = await Promise.all([
        requestApi.getByStatus("OPEN"),
        requestApi.getByStatus("IN_PROGRESS"),
      ]);
      setRequests([
        ...unwrapApiData(openRes.data, []),
        ...unwrapApiData(progressRes.data, []),
      ]);
    } catch (err) {
      console.error("Failed to load requests", err);
      setError(err.response?.data?.message || "Khong tai duoc danh sach request.");
    } finally {
      setLoading(false);
    }
  }

  const assignToMe = async (request) => {
    const staffId = Number(localStorage.getItem("userId"));
    if (!staffId) {
      setError("Khong tim thay staff userId trong localStorage.");
      return;
    }

    setSavingId(request.requestId);
    setError("");
    try {
      await requestApi.assign(request.requestId, staffId);
      await loadRequests();
    } catch (err) {
      console.error("Assign request failed", err);
      setError(err.response?.data?.message || "Khong assign duoc request.");
    } finally {
      setSavingId(null);
    }
  };

  const resolveRequest = async (request) => {
    setSavingId(request.requestId);
    setError("");
    try {
      await requestApi.resolve(request.requestId);
      await loadRequests();
    } catch (err) {
      console.error("Resolve request failed", err);
      setError(err.response?.data?.message || "Khong resolve duoc request.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <StaffPageSection title="Request Processing" subtitle="Handle real driver support requests from backend">
      <div className="mb-4 flex justify-end">
        <StaffSecondaryButton type="button" onClick={loadRequests} disabled={loading}>
          Refresh
        </StaffSecondaryButton>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {requests.length === 0 ? (
        <StaffEmptyState
          title={loading ? "Loading requests" : "No open requests"}
          description="Driver support requests will appear here when they are created."
          tone="success"
        />
      ) : (
        <div className="space-y-3">
          {requests.map((item) => (
            <div key={item.requestId} className="rounded-2xl border border-border p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.subject || item.requestType}</p>
                    <StaffStatusBadge tone={item.status === "IN_PROGRESS" ? "blue" : "amber"}>
                      {String(item.status).toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Request #{item.requestId} - {item.username || `User #${item.userId}`} - {formatStaffDateTime(item.createdAt)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                  {item.assignedStaffName ? (
                    <p className="mt-2 text-xs text-muted-foreground">Assigned to {item.assignedStaffName}</p>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  {item.status === "OPEN" ? (
                    <StaffSecondaryButton
                      type="button"
                      onClick={() => assignToMe(item)}
                      disabled={savingId === item.requestId}
                    >
                      Assign to me
                    </StaffSecondaryButton>
                  ) : null}
                  <StaffPrimaryButton
                    type="button"
                    onClick={() => resolveRequest(item)}
                    disabled={savingId === item.requestId}
                  >
                    {savingId === item.requestId ? "Saving..." : "Resolve"}
                  </StaffPrimaryButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">{requests.length} request(s) need staff action.</p>
    </StaffPageSection>
  );
}

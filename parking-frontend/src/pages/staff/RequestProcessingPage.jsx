import { useState } from "react";
import { createPortalId, formatStaffDateTime, getStaffPortalState, updateStaffPortalState } from "./staffPortalState";
import {
  StaffEmptyState,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffStatusBadge,
} from "./StaffUi";

export default function RequestProcessingPage() {
  const [requests, setRequests] = useState(() => getStaffPortalState().requests);

  const updateRequest = (request, status) => {
    const next = requests.map((item) =>
      item.requestId === request.requestId ? { ...item, status } : item
    );
    setRequests(next);
    updateStaffPortalState((current) => ({
      ...current,
      requests: next,
      activity: [
        {
          id: createPortalId("ACT"),
          plate: request.licensePlate,
          action: `Request ${request.requestId} marked as ${status.toLowerCase()}`,
          type: "update",
          time: new Date().toISOString(),
        },
        ...current.activity,
      ],
    }));
  };

  const pending = requests.filter((item) => item.status === "PENDING");

  return (
    <StaffPageSection title="Request Processing" subtitle="Handle driver support requests while waiting for dedicated request APIs">
      {requests.length === 0 ? (
        <StaffEmptyState
          title="No requests available"
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
                    <p className="text-sm font-semibold text-foreground">{item.type}</p>
                    <StaffStatusBadge tone={item.priority === "HIGH" ? "rose" : item.priority === "MEDIUM" ? "amber" : "slate"}>
                      {item.priority.toLowerCase()}
                    </StaffStatusBadge>
                    <StaffStatusBadge tone={item.status === "RESOLVED" ? "emerald" : "blue"}>
                      {item.status.toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.requestId} • {item.driverName} • {item.licensePlate} • {formatStaffDateTime(item.createdAt)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{item.content}</p>
                </div>

                {item.status === "PENDING" ? (
                  <div className="flex gap-3">
                    <StaffPrimaryButton type="button" onClick={() => updateRequest(item, "RESOLVED")}>
                      Resolve
                    </StaffPrimaryButton>
                    <StaffSecondaryButton type="button" onClick={() => updateRequest(item, "ESCALATED")}>
                      Escalate
                    </StaffSecondaryButton>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">{pending.length} request(s) still pending.</p>
    </StaffPageSection>
  );
}

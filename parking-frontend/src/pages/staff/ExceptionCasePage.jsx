import { useState } from "react";
import { createPortalId, formatStaffDateTime, getStaffPortalState, updateStaffPortalState } from "./staffPortalState";
import {
  StaffEmptyState,
  StaffPageSection,
  StaffPrimaryButton,
  StaffStatusBadge,
  StaffTextarea,
} from "./StaffUi";

export default function ExceptionCasePage() {
  const [cases, setCases] = useState(() => getStaffPortalState().exceptions);
  const [notes, setNotes] = useState({});

  const handleCase = (item) => {
    const nextCases = cases.map((entry) =>
      entry.caseId === item.caseId ? { ...entry, status: "HANDLED", resolutionNote: notes[item.caseId] || "" } : entry
    );
    setCases(nextCases);
    updateStaffPortalState((current) => ({
      ...current,
      exceptions: nextCases,
      activity: [
        {
          id: createPortalId("ACT"),
          plate: item.licensePlate,
          action: `Exception ${item.caseId} handled by staff`,
          type: "exception",
          time: new Date().toISOString(),
        },
        ...current.activity,
      ],
    }));
  };

  return (
    <StaffPageSection title="Exception Cases" subtitle="Review abnormal gate, plate, and session situations that need manual handling">
      {cases.length === 0 ? (
        <StaffEmptyState
          title="No exception cases"
          description="New issues from entry, QR, or OCR flows will appear here."
          tone="success"
        />
      ) : (
        <div className="space-y-4">
          {cases.map((item) => (
            <div key={item.caseId} className="rounded-2xl border border-border p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <StaffStatusBadge tone={item.severity === "HIGH" ? "rose" : "amber"}>
                      {item.severity.toLowerCase()}
                    </StaffStatusBadge>
                    <StaffStatusBadge tone={item.status === "HANDLED" ? "emerald" : "blue"}>
                      {item.status.toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.caseId} • {item.licensePlate} • {formatStaffDateTime(item.createdAt)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                </div>

                {item.status !== "HANDLED" ? (
                  <div className="w-full xl:w-[360px]">
                    <StaffTextarea
                      value={notes[item.caseId] || ""}
                      onChange={(event) =>
                        setNotes((prev) => ({
                          ...prev,
                          [item.caseId]: event.target.value,
                        }))
                      }
                      placeholder="Add handling note"
                    />
                    <StaffPrimaryButton type="button" onClick={() => handleCase(item)} className="mt-3 w-full">
                      Mark as Handled
                    </StaffPrimaryButton>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </StaffPageSection>
  );
}

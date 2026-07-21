import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createPortalId, formatStaffDateTime, getStaffPortalState, updateStaffPortalState } from "./staffPortalState";
import { StaffEmptyState, StaffInput, StaffPageSection, StaffPrimaryButton, StaffStatusBadge } from "./StaffUi";

export default function OcrCorrectionPage() {
  const [records, setRecords] = useState(() => getStaffPortalState().ocrRecords);

  const handleCorrect = (id, value) => {
    setRecords((prev) =>
      prev.map((item) => (item.id === id ? { ...item, correctedPlate: value.toUpperCase() } : item))
    );
  };

  const handleConfirm = (record) => {
    const corrected = record.correctedPlate || record.detectedPlate;
    const nextRecords = records.map((item) =>
      item.id === record.id ? { ...item, correctedPlate: corrected, status: "CONFIRMED" } : item
    );
    setRecords(nextRecords);

    updateStaffPortalState((current) => ({
      ...current,
      ocrRecords: nextRecords,
      activity: [
        {
          id: createPortalId("ACT"),
          plate: corrected,
          action: "OCR result corrected and confirmed",
          type: "update",
          time: new Date().toISOString(),
        },
        ...current.activity,
      ],
    }));
  };

  return (
    <StaffPageSection title="OCR Correction Queue" subtitle="Review low-confidence scans and confirm the final plate">
      {records.length === 0 ? (
        <StaffEmptyState
          title="No OCR records"
          description="Scanned OCR results will appear here automatically."
        />
      ) : (
        <div className="space-y-3">
          {records.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{item.detectedPlate}</p>
                    <StaffStatusBadge tone={item.status === "CONFIRMED" ? "emerald" : "amber"}>
                      {item.status.toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.confidence}% confidence • {formatStaffDateTime(item.scanTime)}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[320px]">
                  <StaffInput
                    value={item.correctedPlate}
                    onChange={(event) => handleCorrect(item.id, event.target.value)}
                    placeholder="Enter corrected plate"
                  />
                  <StaffPrimaryButton type="button" onClick={() => handleConfirm(item)} className="flex items-center justify-center gap-2">
                    <CheckCircle2 size={15} />
                    Confirm Result
                  </StaffPrimaryButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StaffPageSection>
  );
}

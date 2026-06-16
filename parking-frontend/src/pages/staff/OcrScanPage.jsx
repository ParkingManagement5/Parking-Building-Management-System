import { useState } from "react";
import { Camera, CheckCircle2, RefreshCw, ScanLine } from "lucide-react";
import {
  createPortalId,
  formatStaffDateTime,
  updateStaffPortalState,
} from "./staffPortalState";
import {
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffStatusBadge,
} from "./StaffUi";

function randomPlate() {
  return `${Math.floor(10 + Math.random() * 80)}A-${Math.floor(10000 + Math.random() * 89999)}`;
}

export default function OcrScanPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = () => {
    setScanning(true);

    window.setTimeout(() => {
      const confidence = 80 + Math.floor(Math.random() * 19);
      const record = {
        id: createPortalId("OCR"),
        detectedPlate: randomPlate(),
        correctedPlate: "",
        confidence,
        status: confidence >= 90 ? "CONFIRMED" : "PENDING",
        scanTime: new Date().toISOString(),
      };

      updateStaffPortalState((current) => ({
        ...current,
        ocrRecords: [record, ...current.ocrRecords],
        activity: [
          {
            id: createPortalId("ACT"),
            plate: record.detectedPlate,
            action: `OCR scan completed with ${record.confidence}% confidence`,
            type: "update",
            time: record.scanTime,
          },
          ...current.activity,
        ],
      }));

      setResult(record);
      setScanning(false);
    }, 1200);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <StaffPageSection title="OCR Camera Interface" subtitle="Capture and analyze a plate image from the gate camera">
          <div className="rounded-3xl bg-slate-950 p-5 text-center text-white dark:bg-[#020617]">
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-900 dark:bg-[#0f172a]">
              {scanning ? (
                <div className="space-y-3">
                  <div className="mx-auto size-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                  <p className="text-sm text-emerald-300">Analyzing license plate...</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/20">
                    <CheckCircle2 size={30} className="text-emerald-300" />
                  </div>
                  <p className="text-3xl font-bold tracking-wide">{result.detectedPlate}</p>
                  <p className="text-sm text-slate-300">{result.confidence}% confidence</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Camera size={38} className="mx-auto text-white/30" />
                  <p className="text-sm text-white/60">Camera feed ready</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <StaffPrimaryButton type="button" onClick={handleScan} disabled={scanning} className="flex flex-1 items-center justify-center gap-2">
              <ScanLine size={15} />
              {scanning ? "Scanning..." : "Capture & Scan"}
            </StaffPrimaryButton>
            <StaffSecondaryButton type="button" onClick={() => setResult(null)} className="flex items-center gap-2">
              <RefreshCw size={15} />
              Reset
            </StaffSecondaryButton>
          </div>
        </StaffPageSection>

        <StaffPageSection title="Latest OCR Result" subtitle="Low confidence records can be corrected in the OCR correction page">
          {result ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Detected Plate</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{result.detectedPlate}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="mt-1 font-semibold text-foreground">{result.confidence}%</p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <StaffStatusBadge tone={result.status === "CONFIRMED" ? "emerald" : "amber"}>
                      {result.status.toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{formatStaffDateTime(result.scanTime)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Capture a plate to see OCR details here.</p>
          )}
        </StaffPageSection>
      </div>
    </div>
  );
}

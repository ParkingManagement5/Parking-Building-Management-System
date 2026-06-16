import { useState } from "react";
import { CheckCircle2, QrCode, ShieldAlert } from "lucide-react";
import {
  createPortalId,
  formatStaffDateTime,
  getStaffPortalState,
  updateStaffPortalState,
} from "./staffPortalState";
import {
  StaffEmptyState,
  StaffInput,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffStatusBadge,
} from "./StaffUi";

function buildVerificationResult(code) {
  const cleaned = code.trim().toUpperCase();
  const state = getStaffPortalState();
  const existing = state.qrLogs.find((item) => item.bookingCode === cleaned);
  if (existing) {
    return existing;
  }

  return {
    id: createPortalId("QR"),
    bookingCode: cleaned,
    licensePlate: "30A-12345",
    driverName: "driver1",
    slotCode: "A1-C08",
    status: cleaned.startsWith("BK-") ? "VALID" : "REVIEW",
    verifiedAt: new Date().toISOString(),
  };
}

export default function QrVerificationPage() {
  const [qrCode, setQrCode] = useState("");
  const [result, setResult] = useState(null);

  const handleVerify = (event) => {
    event.preventDefault();
    if (!qrCode.trim()) return;
    const verification = buildVerificationResult(qrCode);
    setResult(verification);

    updateStaffPortalState((current) => ({
      ...current,
      qrLogs: [
        verification,
        ...current.qrLogs.filter((item) => item.bookingCode !== verification.bookingCode),
      ],
      activity: [
        {
          id: createPortalId("ACT"),
          plate: verification.licensePlate,
          action:
            verification.status === "VALID"
              ? `QR ${verification.bookingCode} verified successfully`
              : `QR ${verification.bookingCode} requires manual review`,
          type: verification.status === "VALID" ? "update" : "exception",
          time: verification.verifiedAt,
        },
        ...current.activity,
      ],
    }));
  };

  const qrLogs = getStaffPortalState().qrLogs.slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <StaffPageSection
          title="QR Verification"
          subtitle="Validate booking codes before allowing a vehicle to continue"
        >
          <form onSubmit={handleVerify} className="space-y-4">
            <StaffInput
              value={qrCode}
              onChange={(event) => setQrCode(event.target.value)}
              placeholder="Scan or enter booking code"
            />
            <div className="flex gap-3">
              <StaffPrimaryButton type="submit" className="flex-1">
                Verify QR
              </StaffPrimaryButton>
              <StaffSecondaryButton type="button" className="flex-1" onClick={() => setQrCode("")}>
                Clear
              </StaffSecondaryButton>
            </div>
          </form>

          {result ? (
            <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Booking Code</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{result.bookingCode}</p>
                </div>
                <StaffStatusBadge tone={result.status === "VALID" ? "emerald" : "amber"}>
                  {result.status.toLowerCase()}
                </StaffStatusBadge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="mt-1 font-semibold text-foreground">{result.driverName}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">License Plate</p>
                  <p className="mt-1 font-semibold text-foreground">{result.licensePlate}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Slot</p>
                  <p className="mt-1 font-semibold text-foreground">{result.slotCode}</p>
                </div>
                <div className="rounded-2xl bg-background p-4">
                  <p className="text-xs text-muted-foreground">Verified At</p>
                  <p className="mt-1 font-semibold text-foreground">{formatStaffDateTime(result.verifiedAt)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </StaffPageSection>

        <StaffPageSection title="Recent QR Logs" subtitle="Latest verification history kept in the staff workspace">
          {qrLogs.length === 0 ? (
            <StaffEmptyState
              title="No QR logs yet"
              description="Verified booking codes will appear here."
            />
          ) : (
            <div className="space-y-3">
              {qrLogs.map((item) => (
                <div key={item.id || item.bookingCode} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-muted">
                        {item.status === "VALID" ? (
                          <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300" />
                        ) : item.status === "REVIEW" ? (
                          <ShieldAlert size={16} className="text-amber-600 dark:text-amber-300" />
                        ) : (
                          <QrCode size={16} className="text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.bookingCode}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.driverName} • {item.licensePlate}
                        </p>
                      </div>
                    </div>
                    <StaffStatusBadge tone={item.status === "VALID" ? "emerald" : "amber"}>
                      {item.status.toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>
      </div>
    </div>
  );
}

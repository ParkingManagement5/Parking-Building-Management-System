import { useState } from "react";
import { CheckCircle2, QrCode, ShieldAlert } from "lucide-react";
import { bookingApi } from "../../api/driver/bookingApi";
import { unwrapApiData } from "../../utils/api";
import { formatStaffDateTime } from "./staffPortalState";
import {
  StaffEmptyState,
  StaffInput,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffStatusBadge,
} from "./StaffUi";

export default function QrVerificationPage() {
  const [qrCode, setQrCode] = useState("");
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!qrCode.trim()) return;

    setLoading(true);
    setError("");
    try {
      const res = await bookingApi.verifyQr(qrCode.trim());
      const booking = unwrapApiData(res.data, null);
      const verification = {
        id: `QR-${Date.now()}`,
        bookingCode: `Booking #${booking.bookingId}`,
        qrToken: qrCode.trim(),
        licensePlate: booking.licensePlate,
        driverName: `User #${booking.userId}`,
        slotCode: booking.slotCode,
        buildingName: booking.buildingName,
        status: "VALID",
        verifiedAt: new Date().toISOString(),
      };
      setResult(verification);
      setLogs((prev) => [verification, ...prev].slice(0, 5));
    } catch (err) {
      console.error("QR verification failed", err);
      const verification = {
        id: `QR-${Date.now()}`,
        bookingCode: qrCode.trim(),
        licensePlate: "--",
        driverName: "--",
        slotCode: "--",
        status: "REVIEW",
        verifiedAt: new Date().toISOString(),
        message: err.response?.data?.message || "QR khong hop le hoac da het han.",
      };
      setResult(verification);
      setLogs((prev) => [verification, ...prev].slice(0, 5));
      setError(verification.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <StaffPageSection
          title="QR Verification"
          subtitle="Validate a real booking QR token before processing entry"
        >
          <form onSubmit={handleVerify} className="space-y-4">
            <StaffInput
              value={qrCode}
              onChange={(event) => setQrCode(event.target.value)}
              placeholder="Scan or paste booking QR token"
            />
            <div className="flex gap-3">
              <StaffPrimaryButton type="submit" className="flex-1" disabled={loading}>
                {loading ? "Verifying..." : "Verify QR"}
              </StaffPrimaryButton>
              <StaffSecondaryButton type="button" className="flex-1" onClick={() => setQrCode("")}>
                Clear
              </StaffSecondaryButton>
            </div>
          </form>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {result ? (
            <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Booking</p>
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

        <StaffPageSection title="Recent QR Logs" subtitle="Latest verification attempts in this browser session">
          {logs.length === 0 ? (
            <StaffEmptyState
              title="No QR logs yet"
              description="Verified booking QR tokens will appear here."
            />
          ) : (
            <div className="space-y-3">
              {logs.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border px-4 py-3">
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
                          {item.driverName} - {item.licensePlate}
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

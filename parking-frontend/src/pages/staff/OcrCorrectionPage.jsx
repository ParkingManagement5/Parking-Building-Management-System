import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { ocrApi } from "../../api/staff/ocrApi";
import { unwrapApiData } from "../../utils/api";
import { formatStaffDateTime, updateStaffPortalState } from "./staffPortalState";
import { StaffEmptyState, StaffInput, StaffPageSection, StaffPrimaryButton, StaffSecondaryButton, StaffStatusBadge } from "./StaffUi";

function statusTone(status) {
  if (status === "AUTO_APPROVED" || status === "STAFF_APPROVED") return "emerald";
  if (status === "FAILED") return "rose";
  return "amber";
}

export default function OcrCorrectionPage() {
  const [records, setRecords] = useState([]);
  const [corrections, setCorrections] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    setError("");
    try {
      const res = await ocrApi.getPendingReviews();
      const items = unwrapApiData(res.data, []);
      setRecords(items);
      setCorrections(
        Object.fromEntries(
          items.map((item) => [item.scanId, item.correctedPlate || item.detectedPlate || ""])
        )
      );
    } catch (err) {
      console.error("Failed to load OCR reviews", err);
      setError(err.response?.data?.message || "Khong tai duoc OCR correction queue.");
    } finally {
      setLoading(false);
    }
  }

  const handleCorrect = (id, value) => {
    setCorrections((prev) => ({ ...prev, [id]: value.toUpperCase() }));
  };

  const handleConfirm = async (record) => {
    const correctedPlate = (corrections[record.scanId] || record.detectedPlate || "").trim().toUpperCase();
    if (!correctedPlate) {
      setError("Nhap bien so dung truoc khi confirm.");
      return;
    }

    setSavingId(record.scanId);
    setError("");
    try {
      const res = await ocrApi.review(record.scanId, {
        correctedPlate,
        staffUserId: Number(localStorage.getItem("userId")) || 0,
      });
      const reviewed = unwrapApiData(res.data, null);
      const plate = reviewed?.effectivePlate || correctedPlate;
      updateStaffPortalState((current) => ({
        ...current,
        latestOcrPlate: plate,
        latestOcrRecord: reviewed || {
          scanId: record.scanId,
          detectedPlate: record.detectedPlate,
          correctedPlate: plate,
        },
      }));
      await loadRecords();
    } catch (err) {
      console.error("OCR review failed", err);
      setError(err.response?.data?.message || "Khong luu duoc ket qua OCR.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <StaffPageSection title="OCR Correction Queue" subtitle="Review low-confidence backend scans and confirm the final plate">
      <div className="mb-4 flex justify-end">
        <StaffSecondaryButton type="button" onClick={loadRecords} disabled={loading} className="flex items-center gap-2">
          <RefreshCw size={15} />
          Refresh
        </StaffSecondaryButton>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {records.length === 0 ? (
        <StaffEmptyState
          title={loading ? "Loading OCR records" : "No OCR records need review"}
          description="Low-confidence scans will appear here automatically."
        />
      ) : (
        <div className="space-y-3">
          {records.map((item) => (
            <div key={item.scanId} className="rounded-2xl border border-border p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {item.detectedPlate || "UNKNOWN"}
                    </p>
                    <StaffStatusBadge tone={statusTone(item.processStatus)}>
                      {String(item.processStatus || "review").toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Math.round((item.plateConfidenceScore || 0) * 100)}% confidence - {formatStaffDateTime(item.scannedAt)}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.imagePath}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[320px]">
                  <StaffInput
                    value={corrections[item.scanId] || ""}
                    onChange={(event) => handleCorrect(item.scanId, event.target.value)}
                    placeholder="Enter corrected plate"
                  />
                  <StaffPrimaryButton
                    type="button"
                    onClick={() => handleConfirm(item)}
                    disabled={savingId === item.scanId}
                    className="flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={15} />
                    {savingId === item.scanId ? "Saving..." : "Confirm Result"}
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { exceptionApi } from "../../api/staff/exceptionApi";
import { gateApi } from "../../api/manager/gateApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { computeSessionFee, formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import { unwrapApiData } from "../../utils/api";
import { getAssignedBuildingId } from "../../utils/auth";
import {
  StaffEmptyState, StaffInput, StaffPageSection, StaffPrimaryButton,
  StaffSecondaryButton, StaffStatusBadge, StaffSelect,
} from "./StaffUi";
import OcrCorrectionPage from "./OcrCorrectionPage";

const EXIT_TYPES = ["EXIT_VERIFICATION_FAILED", "LOST_QR"];
const ENTRY_TYPES = ["BOOKING_MISMATCH", "PLATE_UNVERIFIED", "SYSTEM_ERROR", "SESSION_CONFLICT"];

function exceptionMeta(type) {
  switch (type) {
    case "PLATE_UNVERIFIED":
      return {
        priority: "HIGH", priorityTone: "rose",
        recommendation: "Xe dang cho xac nhan bien so. Sua bien so trong OCR Correction Queue bên dưới, sau đó tới cổng làm thủ công.",
        resolutionGuide: "Chinh bien so trong form OCR ben duoi. Sau khi xac nhan, vao trang Scan de tiep tuc cho xe vao.",
      };
    case "BOOKING_MISMATCH":
      return {
        priority: "HIGH", priorityTone: "amber",
        recommendation: "Doi chieu booking, bien xe, va QR. Khong cho xe vao neu khong khop.",
        resolutionGuide: "Kiem tra thu cong booking ID va bien so xe voi tai xe. Neu hop le, vao trang Scan de nhap tay cho xe vao.",
      };
    case "EXIT_VERIFICATION_FAILED":
      return {
        priority: "HIGH", priorityTone: "rose",
        recommendation: "Xe can ra cong nhung xac thuc that bai. Dung Force Exit neu da xac nhan xe.",
        resolutionGuide: "Chon cong ra va bam 'Cho xe ra' de ghi nhan xe ra va chuyen sang cho thanh toan.",
      };
    case "LOST_QR":
      return {
        priority: "HIGH", priorityTone: "rose",
        recommendation: "Tai xe mat QR. Xac nhan bien so xe khop voi session, sau do dung Force Exit.",
        resolutionGuide: "Xac nhan xe vat ly la xe dang co session. Chon cong ra va bam 'Cho xe ra'.",
      };
    case "SESSION_CONFLICT":
      return {
        priority: "MEDIUM", priorityTone: "amber",
        recommendation: "Xe bi xung dot session. Kiem tra tab Sessions de xem lich su session cua xe.",
        resolutionGuide: "Mo trang Sessions kiem tra xe nay. Neu session cu da ket thuc nhung chua duoc dong, xu ly tai do. Sau do vao Scan cho xe vao binh thuong.",
      };
    case "SYSTEM_ERROR":
      return {
        priority: "HIGH", priorityTone: "violet",
        recommendation: "Loi he thong. Kiem tra ket noi mang. Neu xe dang cho vao, vao trang Scan lam thu cong.",
        resolutionGuide: "Neu mat wifi: cho phuc hoi ket noi roi vao trang Scan nhap tay bien so. Neu xe khong co booking, dung Direct Walk-in.",
      };
    default:
      return {
        priority: "MEDIUM", priorityTone: "slate",
        recommendation: "Xem mo ta va xu ly theo tinh huong thuc te tai cong.",
        resolutionGuide: "Xu ly theo mo ta exception va danh dau da giai quyet sau khi hoan tat.",
      };
  }
}

export default function ExceptionCasePage() {
  const navigate = useNavigate();
  const [activeCases, setActiveCases] = useState([]);
  const [resolvedCases, setResolvedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const paged = useMemo(() => activeCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [activeCases, page]);
  const totalPages = Math.max(1, Math.ceil(activeCases.length / PAGE_SIZE));

  // Force Exit state (existing exception cards)
  const [gates, setGates] = useState([]);
  const [forceExitGateId, setForceExitGateId] = useState({});

  // ─── Báo cáo & Cho xe ra ──────────────────────────────────────────────
  const REPORT_TYPES = [
    { value: "LOST_QR",                  label: "Mất QR — xe không scan được QR ra" },
    { value: "EXIT_VERIFICATION_FAILED", label: "QR lỗi — scan thất bại hoặc QR hỏng" },
    { value: "SYSTEM_ERROR",             label: "Lỗi hệ thống — không xử lý được tự động" },
    { value: "OTHER",                    label: "Khác" },
  ];
  const [rPlate, setRPlate]         = useState("");
  const [rSession, setRSession]     = useState(null);
  const [rSearching, setRSearching] = useState(false);
  const [rSearchErr, setRSearchErr] = useState("");
  const [rType, setRType]           = useState("LOST_QR");
  const [rDesc, setRDesc]           = useState("");
  const [rGateId, setRGateId]       = useState("");
  const [rSubmitting, setRSubmitting] = useState(false);
  const [rResult, setRResult]       = useState(null);
  const [rError, setRError]         = useState("");
  const searchTimer = useRef(null);

  const exitGates = useMemo(
    () => gates.filter((g) => ["EXIT", "BOTH"].includes(String(g.gateType || "").toUpperCase())),
    [gates],
  );

  // Tìm session ACTIVE theo biển số (debounce 300ms)
  useEffect(() => {
    const raw = rPlate.trim().toUpperCase();
    if (raw.length < 3) { setRSession(null); setRSearchErr(""); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setRSearching(true); setRSearchErr(""); setRSession(null);
      try {
        const res = await sessionApi.getSessions({ status: "ACTIVE", keyword: raw });
        const list = unwrapApiData(res.data, []);
        const canonical = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const match = list.find((s) => canonical(s.licensePlate) === canonical(raw))
                   ?? list.find((s) => canonical(s.licensePlate).includes(canonical(raw)));
        if (match) { setRSession(match); }
        else { setRSearchErr("Không tìm thấy session ACTIVE cho biển số này."); }
      } catch { setRSearchErr("Lỗi khi tìm session."); }
      finally { setRSearching(false); }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [rPlate]);

  async function handleReportAndExit(e) {
    e.preventDefault();
    if (!rSession) { setRError("Chưa tìm thấy session."); return; }
    if (!rGateId)  { setRError("Chọn cổng ra."); return; }
    setRSubmitting(true); setRError("");
    try {
      const staffId = Number(localStorage.getItem("userId")) || 0;
      // 1. Force exit — bypass QR
      await sessionApi.exit(rSession.sessionId, {
        gateId: Number(rGateId),
        staffUserId: staffId,
        qrVerified: false,
        staffForceExit: true,
      });
      // 2. Tạo exception case để lưu lịch sử báo cáo
      await exceptionApi.create({
        sessionId: rSession.sessionId,
        bookingId: rSession.bookingId ?? null,
        exceptionType: rType,
        description: `[Staff báo cáo thủ công] ${rDesc || REPORT_TYPES.find((t) => t.value === rType)?.label || rType}`,
      });
      const fee = computeSessionFee(rSession.entryTime);
      setRResult({ licensePlate: rSession.licensePlate, sessionId: rSession.sessionId, fee });
      setRPlate(""); setRSession(null); setRDesc(""); setRGateId("");
      await loadCases();
    } catch (err) {
      setRError(err.response?.data?.message || "Xử lý thất bại.");
    } finally {
      setRSubmitting(false);
    }
  }

  useEffect(() => {
    void loadCases();
    void loadGates();
  }, []);

  async function loadGates() {
    const buildingId = getAssignedBuildingId();
    if (!buildingId) return;
    try {
      const res = await gateApi.getByBuilding(buildingId);
      const all = unwrapApiData(res.data, []);
      setGates(all.filter((g) => ["EXIT", "BOTH"].includes(String(g.gateType || "").toUpperCase())));
    } catch {
      // non-critical, gate dropdown just stays empty
    }
  }

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
    if (!staffId) { setError("Khong tim thay staff userId trong localStorage."); return; }
    setSavingId(item.exceptionId);
    setError("");
    try {
      await exceptionApi.assign(item.exceptionId, staffId);
      await loadCases();
    } catch (err) {
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
      setError(err.response?.data?.message || "Khong close duoc exception.");
    } finally {
      setSavingId(null);
    }
  };

  const forceExit = async (item) => {
    const gateId = forceExitGateId[item.exceptionId];
    if (!gateId) { setError("Chon cong ra truoc khi cho xe ra."); return; }
    const staffId = Number(localStorage.getItem("userId")) || 0;
    setSavingId(item.exceptionId);
    setError("");
    try {
      await sessionApi.exit(item.sessionId, { gateId: Number(gateId), staffUserId: staffId, qrVerified: false });
      await exceptionApi.resolve(item.exceptionId);
      await loadCases();
    } catch (err) {
      setError(err.response?.data?.message || "Force exit that bai.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════════════
          BÁO CÁO SỰ CỐ XE RA — nhập biển → tính phí → cho xe ra
      ══════════════════════════════════════════════════════════════ */}
      <StaffPageSection
        title="Báo cáo sự cố & Cho xe ra"
        subtitle="Dùng khi xe không scan được QR ra cổng hoặc gặp lỗi hệ thống — staff xác nhận thủ công"
      >
        {rResult ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10 space-y-3">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">Xe đã ra cổng thành công</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Biển số</span>
              <span className="font-mono font-bold text-foreground">{rResult.licensePlate}</span>
              <span className="text-muted-foreground">Session</span>
              <span className="text-foreground">#{rResult.sessionId}</span>
              <span className="text-muted-foreground">Tổng tiền cần thanh toán</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{formatStaffCurrency(rResult.fee)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Báo cáo đã được lưu. Yêu cầu driver thanh toán tại quầy hoặc qua VNPay.</p>
            <div className="flex gap-3">
              <StaffSecondaryButton type="button" onClick={() => setRResult(null)}>Báo cáo xe khác</StaffSecondaryButton>
              <StaffPrimaryButton type="button" onClick={() => navigate("/staff/payments")}>Đến trang thanh toán</StaffPrimaryButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReportAndExit} className="space-y-4">
            {/* Tìm xe */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Biển số xe</label>
              <div className="flex gap-2">
                <StaffInput
                  value={rPlate}
                  onChange={(e) => setRPlate(e.target.value.toUpperCase())}
                  placeholder="VD: 51A12345"
                  className="flex-1"
                />
                {rSearching && <span className="self-center text-xs text-muted-foreground">Đang tìm...</span>}
              </div>
              {rSearchErr && <p className="mt-1 text-xs text-rose-600">{rSearchErr}</p>}
            </div>

            {/* Thông tin session */}
            {rSession && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10 grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Session</span>
                <span className="font-medium text-foreground">#{rSession.sessionId}</span>
                <span className="text-muted-foreground">Biển số</span>
                <span className="font-mono font-bold text-foreground">{rSession.licensePlate}</span>
                <span className="text-muted-foreground">Vào lúc</span>
                <span className="text-foreground">{formatStaffDateTime(rSession.entryTime)}</span>
                <span className="text-muted-foreground">Slot</span>
                <span className="text-foreground">{rSession.slotCode || "—"}</span>
                {rSession.bookingId && (
                  <>
                    <span className="text-muted-foreground">Booking</span>
                    <span className="text-foreground">#{rSession.bookingId}</span>
                  </>
                )}
                <span className="text-muted-foreground font-semibold">Phí ước tính</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatStaffCurrency(computeSessionFee(rSession.entryTime))}
                </span>
              </div>
            )}

            {/* Loại sự cố */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Loại sự cố</label>
              <StaffSelect value={rType} onChange={(e) => setRType(e.target.value)}>
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </StaffSelect>
            </div>

            {/* Mô tả */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Mô tả chi tiết <span className="text-muted-foreground font-normal">(không bắt buộc)</span>
              </label>
              <textarea
                value={rDesc}
                onChange={(e) => setRDesc(e.target.value)}
                rows={2}
                placeholder="VD: Driver trình bày mất điện thoại, không có QR. Staff xác nhận biển số khớp."
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {/* Cổng ra */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Cổng ra</label>
              <StaffSelect value={rGateId} onChange={(e) => setRGateId(e.target.value)}>
                <option value="">— Chọn cổng ra —</option>
                {exitGates.map((g) => (
                  <option key={g.gateId || g.id} value={g.gateId || g.id}>
                    {g.gateName || g.gateCode || `Gate ${g.gateId || g.id}`}
                  </option>
                ))}
                {exitGates.length === 0 && <option disabled>Không có cổng ra (chưa gán building)</option>}
              </StaffSelect>
            </div>

            {rError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {rError}
              </div>
            )}

            <StaffPrimaryButton
              type="submit"
              disabled={rSubmitting || !rSession || !rGateId}
              className="w-full"
            >
              {rSubmitting ? "Đang xử lý..." : "Gửi báo cáo & Cho xe ra"}
            </StaffPrimaryButton>
          </form>
        )}
      </StaffPageSection>

      <StaffPageSection title="Operational Exceptions" subtitle="Review abnormal gate, plate, and session situations from backend">
        <div className="mb-4 flex justify-end">
          <StaffSecondaryButton type="button" onClick={loadCases} disabled={loading}>Refresh</StaffSecondaryButton>
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
              const isExitType = EXIT_TYPES.includes(item.exceptionType);
              const isEntryType = ENTRY_TYPES.includes(item.exceptionType);
              const canForceExit = isExitType && item.sessionId && item.status === "IN_PROGRESS";
              const saving = savingId === item.exceptionId;

              return (
                <div key={item.exceptionId} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.exceptionType}</p>
                        <StaffStatusBadge tone={item.status === "IN_PROGRESS" ? "blue" : "amber"}>
                          {String(item.status).toLowerCase()}
                        </StaffStatusBadge>
                        <StaffStatusBadge tone={meta.priorityTone}>{meta.priority}</StaffStatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Exception #{item.exceptionId}
                        {item.sessionId ? ` · Session #${item.sessionId}` : ""}
                        {item.bookingId ? ` · Booking #${item.bookingId}` : ""}
                        {" · "}{formatStaffDateTime(item.createdAt)}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>

                      {/* Resolution guidance for IN_PROGRESS */}
                      {item.status === "IN_PROGRESS" && (
                        <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
                          <span className="font-semibold">Hướng xử lý: </span>{meta.resolutionGuide}
                        </div>
                      )}

                      {/* BOOKING_MISMATCH: booking still unprocessed warning */}
                      {item.status === "IN_PROGRESS" && item.exceptionType === "BOOKING_MISMATCH" && item.bookingId && (
                        <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                            ⚠ Booking #{item.bookingId} chưa được xử lý
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Booking này vẫn đang ở trạng thái CONFIRMED nhưng chưa có session. Vào trang Scan, nhập biển số xe, hệ thống sẽ tìm thấy Booking #{item.bookingId}. Xác nhận cho xe vào <span className="font-semibold">trước</span> khi bấm &ldquo;Đã xử lý xong&rdquo;.
                          </p>
                        </div>
                      )}

                      {/* Force Exit panel for EXIT type with sessionId */}
                      {canForceExit && (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-200 mb-2">Force Exit — Session #{item.sessionId}</p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <StaffSelect
                              value={forceExitGateId[item.exceptionId] || ""}
                              onChange={(e) => setForceExitGateId((prev) => ({ ...prev, [item.exceptionId]: e.target.value }))}
                              className="flex-1 text-xs"
                            >
                              <option value="">-- Chon cong ra --</option>
                              {gates.map((g) => (
                                <option key={g.gateId || g.id} value={g.gateId || g.id}>
                                  {g.gateName || g.gateCode || `Gate ${g.gateId || g.id}`}
                                </option>
                              ))}
                              {gates.length === 0 && <option disabled>Khong co cong ra (chua gan building)</option>}
                            </StaffSelect>
                            <StaffPrimaryButton
                              type="button"
                              onClick={() => forceExit(item)}
                              disabled={saving || !forceExitGateId[item.exceptionId]}
                            >
                              {saving ? "Dang xu ly..." : "Cho xe ra"}
                            </StaffPrimaryButton>
                          </div>
                        </div>
                      )}

                      {item.resolvedBy ? (
                        <p className="mt-2 text-xs text-muted-foreground">Assigned/resolved by user #{item.resolvedBy}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {/* OPEN: assign */}
                      {item.status === "OPEN" && (
                        <StaffSecondaryButton type="button" onClick={() => assignToMe(item)} disabled={saving}>
                          Assign to me
                        </StaffSecondaryButton>
                      )}

                      {/* IN_PROGRESS: action buttons based on type */}
                      {item.status === "IN_PROGRESS" && !canForceExit && isEntryType && (
                        <StaffSecondaryButton type="button" onClick={() => navigate("/staff/scan")}>
                          Toi cong scan
                        </StaffSecondaryButton>
                      )}
                      {item.status === "IN_PROGRESS" && isEntryType && item.exceptionType === "SESSION_CONFLICT" && (
                        <StaffSecondaryButton type="button" onClick={() => navigate("/staff/sessions")}>
                          Xem sessions
                        </StaffSecondaryButton>
                      )}
                      {item.status === "IN_PROGRESS" && !canForceExit && (
                        <StaffPrimaryButton type="button" onClick={() => resolveCase(item)} disabled={saving}>
                          {saving ? "Saving..." : "Da xu ly xong"}
                        </StaffPrimaryButton>
                      )}
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
                        {item.sessionId ? ` · Session #${item.sessionId}` : ""}
                        {item.bookingId ? ` · Booking #${item.bookingId}` : ""}
                        {" · "}{formatStaffDateTime(item.resolvedAt || item.createdAt)}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex gap-3">
                      <StaffSecondaryButton type="button" onClick={() => closeCase(item)} disabled={savingId === item.exceptionId}>
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

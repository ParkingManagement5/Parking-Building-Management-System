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

const EXIT_TYPES = ["EXIT_VERIFICATION_FAILED", "LOST_QR"];
const ENTRY_TYPES = ["BOOKING_MISMATCH", "PLATE_UNVERIFIED", "SYSTEM_ERROR", "SESSION_CONFLICT"];

const EXCEPTION_STATUS_LABELS = {
  OPEN: "Đang mở",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
};

function exceptionStatusLabel(status) {
  return EXCEPTION_STATUS_LABELS[String(status || "").toUpperCase()] || status;
}

const EXCEPTION_TYPE_LABELS = {
  PLATE_UNVERIFIED: "Chưa xác minh biển số",
  BOOKING_MISMATCH: "Booking không khớp",
  EXIT_VERIFICATION_FAILED: "Xác thực ra cổng thất bại",
  LOST_QR: "Mất QR",
  SESSION_CONFLICT: "Xung đột session",
  SYSTEM_ERROR: "Lỗi hệ thống",
};

function exceptionTypeLabel(type) {
  return (
    EXCEPTION_TYPE_LABELS[String(type || "").toUpperCase()] ||
    String(type || "").replace(/_/g, " ")
  );
}

function exceptionMeta(type) {
  switch (type) {
    case "PLATE_UNVERIFIED":
      return {
        priority: "HIGH", priorityTone: "rose",
        recommendation: "Xe đang chờ xác nhận biển số. Quay lại trang Scan và nhập tay biển số để tiếp tục cho xe vào.",
        resolutionGuide: "Vào trang Scan, dùng Nhập tay để xác nhận biển số đúng, sau đó tiếp tục quy trình cho xe vào.",
      };
    case "BOOKING_MISMATCH":
      return {
        priority: "HIGH", priorityTone: "amber",
        recommendation: "Đối chiếu booking, biển xe, và QR. Không cho xe vào nếu không khớp.",
        resolutionGuide: "Kiểm tra thủ công booking ID và biển số xe với tài xế. Nếu hợp lệ, vào trang Scan để nhập tay cho xe vào.",
      };
    case "EXIT_VERIFICATION_FAILED":
      return {
        priority: "HIGH", priorityTone: "rose",
        recommendation: "Xe cần ra cổng nhưng xác thực thất bại. Dùng Force Exit nếu đã xác nhận xe.",
        resolutionGuide: "Chọn cổng ra và bấm 'Cho xe ra' để ghi nhận xe ra và chuyển sang chờ thanh toán.",
      };
    case "LOST_QR":
      return {
        priority: "HIGH", priorityTone: "rose",
        recommendation: "Tài xế mất QR. Xác nhận biển số xe khớp với session, sau đó dùng Force Exit.",
        resolutionGuide: "Xác nhận xe vật lý là xe đang có session. Chọn cổng ra và bấm 'Cho xe ra'.",
      };
    case "SESSION_CONFLICT":
      return {
        priority: "MEDIUM", priorityTone: "amber",
        recommendation: "Xe bị xung đột session. Kiểm tra tab Sessions để xem lịch sử session của xe.",
        resolutionGuide: "Mở trang Sessions kiểm tra xe này. Nếu session cũ đã kết thúc nhưng chưa được đóng, xử lý tại đó. Sau đó vào Scan cho xe vào bình thường.",
      };
    case "SYSTEM_ERROR":
      return {
        priority: "HIGH", priorityTone: "violet",
        recommendation: "Lỗi hệ thống. Kiểm tra kết nối mạng. Nếu xe đang chờ vào, vào trang Scan làm thủ công.",
        resolutionGuide: "Nếu mất wifi: chờ phục hồi kết nối rồi vào trang Scan nhập tay biển số. Nếu xe không có booking, dùng Direct Walk-in.",
      };
    default:
      return {
        priority: "MEDIUM", priorityTone: "slate",
        recommendation: "Xem mô tả và xử lý theo tình huống thực tế tại cổng.",
        resolutionGuide: "Xử lý theo mô tả exception và đánh dấu đã giải quyết sau khi hoàn tất.",
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
  // Exit QR da bo hoan toan (xe ra chi con xac minh bang bien so) nen bo
  // "LOST_QR" khoi danh sach tao MOI (van giu trong EXCEPTION_TYPE_LABELS/
  // EXIT_TYPES/exceptionMeta o tren de hien thi dung cho cac case cu da tao
  // tu truoc khi bo QR) - va doi lai chu "EXIT_VERIFICATION_FAILED" cho dung
  // ly do that su gio la xac minh bien so, khong con la loi scan QR nua.
  const REPORT_TYPES = [
    { value: "EXIT_VERIFICATION_FAILED", label: "Không xác minh được xe — biển số không khớp hoặc không đọc được" },
    { value: "SYSTEM_ERROR",             label: "Lỗi hệ thống — không xử lý được tự động" },
    { value: "OTHER",                    label: "Khác" },
  ];
  const [rPlate, setRPlate]         = useState("");
  const [rSession, setRSession]     = useState(null);
  const [rSearching, setRSearching] = useState(false);
  const [rSearchErr, setRSearchErr] = useState("");
  const [rType, setRType]           = useState("EXIT_VERIFICATION_FAILED");
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
      setError(err.response?.data?.message || "Không tải được danh sách exception.");
    } finally {
      setLoading(false);
    }
  }

  const assignToMe = async (item) => {
    const staffId = Number(localStorage.getItem("userId"));
    if (!staffId) { setError("Không tìm thấy staff userId trong localStorage."); return; }
    setSavingId(item.exceptionId);
    setError("");
    try {
      await exceptionApi.assign(item.exceptionId, staffId);
      await loadCases();
    } catch (err) {
      setError(err.response?.data?.message || "Không assign được exception.");
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
      setError(err.response?.data?.message || "Không resolve được exception.");
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
      setError(err.response?.data?.message || "Không close được exception.");
    } finally {
      setSavingId(null);
    }
  };

  const forceExit = async (item) => {
    const gateId = forceExitGateId[item.exceptionId];
    if (!gateId) { setError("Chọn cổng ra trước khi cho xe ra."); return; }
    const staffId = Number(localStorage.getItem("userId")) || 0;
    setSavingId(item.exceptionId);
    setError("");
    try {
      await sessionApi.exit(item.sessionId, { gateId: Number(gateId), staffUserId: staffId, qrVerified: false });
      await exceptionApi.resolve(item.exceptionId);
      await loadCases();
    } catch (err) {
      setError(err.response?.data?.message || "Force exit thất bại.");
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

      <StaffPageSection title="Sự cố vận hành" subtitle="Xem lại các tình huống bất thường về cổng, biển số và phiên đỗ xe từ hệ thống">
        <div className="mb-4 flex justify-end">
          <StaffSecondaryButton type="button" onClick={loadCases} disabled={loading}>Làm mới</StaffSecondaryButton>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {activeCases.length === 0 ? (
          <StaffEmptyState
            title={loading ? "Đang tải danh sách sự cố" : "Không có sự cố nào đang mở"}
            description="Sự cố mới từ luồng vào bãi, quét QR, OCR, hoặc thanh toán sẽ hiện ở đây."
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
                        <p className="text-sm font-semibold text-foreground">{exceptionTypeLabel(item.exceptionType)}</p>
                        <StaffStatusBadge tone={item.status === "IN_PROGRESS" ? "blue" : "amber"}>
                          {exceptionStatusLabel(item.status)}
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
                              <option value="">-- Chọn cổng ra --</option>
                              {gates.map((g) => (
                                <option key={g.gateId || g.id} value={g.gateId || g.id}>
                                  {g.gateName || g.gateCode || `Gate ${g.gateId || g.id}`}
                                </option>
                              ))}
                              {gates.length === 0 && <option disabled>Không có cổng ra (chưa gán building)</option>}
                            </StaffSelect>
                            <StaffPrimaryButton
                              type="button"
                              onClick={() => forceExit(item)}
                              disabled={saving || !forceExitGateId[item.exceptionId]}
                            >
                              {saving ? "Đang xử lý..." : "Cho xe ra"}
                            </StaffPrimaryButton>
                          </div>
                        </div>
                      )}

                      {item.resolvedBy ? (
                        <p className="mt-2 text-xs text-muted-foreground">Đã giao/xử lý bởi người dùng #{item.resolvedBy}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {/* OPEN: assign */}
                      {item.status === "OPEN" && (
                        <StaffSecondaryButton type="button" onClick={() => assignToMe(item)} disabled={saving}>
                          Nhận xử lý
                        </StaffSecondaryButton>
                      )}

                      {/* IN_PROGRESS: action buttons based on type */}
                      {item.status === "IN_PROGRESS" && !canForceExit && isEntryType && (
                        <StaffSecondaryButton type="button" onClick={() => navigate("/staff/scan")}>
                          Tới cổng scan
                        </StaffSecondaryButton>
                      )}
                      {item.status === "IN_PROGRESS" && isEntryType && item.exceptionType === "SESSION_CONFLICT" && (
                        <StaffSecondaryButton type="button" onClick={() => navigate("/staff/sessions")}>
                          Xem sessions
                        </StaffSecondaryButton>
                      )}
                      {item.status === "IN_PROGRESS" && !canForceExit && (
                        <StaffPrimaryButton type="button" onClick={() => resolveCase(item)} disabled={saving}>
                          {saving ? "Đang lưu..." : "Đã xử lý xong"}
                        </StaffPrimaryButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, PAGE_SIZE - paged.length) }, (_, index) => (
              <div key={`filler-${index}`} aria-hidden="true" className="invisible rounded-2xl border border-border p-4">
                &nbsp;
              </div>
            ))}
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

      <StaffPageSection title="Đã xử lý gần đây" subtitle="Case đã xử lý xong và chờ đóng hồ sơ">
        {resolvedCases.length === 0 ? (
          <StaffEmptyState
            title={loading ? "Đang tải case đã xử lý" : "Chưa có case nào chờ đóng hồ sơ"}
            description="Case RESOLVED sẽ hiện ở đây trước khi đóng hồ sơ."
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
                        <p className="text-sm font-semibold text-foreground">{exceptionTypeLabel(item.exceptionType)}</p>
                        <StaffStatusBadge tone="emerald">Đã xử lý</StaffStatusBadge>
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
                        {savingId === item.exceptionId ? "Đang lưu..." : "Đóng"}
                      </StaffSecondaryButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </StaffPageSection>
    </div>
  );
}

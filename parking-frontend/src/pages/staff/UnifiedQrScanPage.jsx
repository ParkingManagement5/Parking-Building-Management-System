import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserQRCodeReader } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import {
  AlertTriangle, Camera, CheckCircle2, CreditCard, ImageUp, LogIn, LogOut,
  QrCode, RefreshCw, Search, ScanLine, Video, VideoOff, X, XCircle,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { gateApi } from "../../api/manager/gateApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { exceptionApi } from "../../api/staff/exceptionApi";
import { ocrApi } from "../../api/staff/ocrApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { computeSessionFee, formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import { getAssignedBuildingId, getAssignedBuildingName } from "../../utils/auth";
import {
  StaffInput, StaffPageSection, StaffPrimaryButton, StaffSecondaryButton,
  StaffSelect, StaffStatusBadge,
} from "./StaffUi";

const LOW_CONFIDENCE_PROCESS_STATUS = "MANUAL_REVIEW";
const PACKAGE_LABELS = { DAILY: "Gói ngày", WEEKLY: "Gói tuần", MONTHLY: "Gói tháng" };

// TRY_HARDER: chiu bo them CPU moi lan de doc duoc ca QR mo/nghieng/nho — bu lai
// bang cach quet dong hon (xem QR_SCAN_OPTIONS ben duoi) thay vi quet nhieu lan/giay
// nhung moi lan deu bo cuoc som.
const QR_HINTS = new Map([[DecodeHintType.TRY_HARDER, true]]);
// Mac dinh thu vien la 500ms/lan (2 lan/giay) — cam giac rat cham khi dua camera
// vao ma QR. Giam xuong 120ms (~8 lan/giay) de bat ma ngay khi vua can net.
const QR_SCAN_OPTIONS = { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 250 };

function canonicalPlate(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

// Uu tien series dang "chu+so" (vd "H7", giong het PLATE_PATTERN/SERIES_PATTERN
// ben ocr-service/main.py) truoc dang "chu don" — dung dinh dang xe may pho
// bien nhat khi phai doan (xem ghi chu trong normalizePlateDisplay ben duoi).
const PLATE_STRUCTURE_RE = /^(\d{2})((?:[A-Z]\d|[A-Z]{1,2}))(\d{4}|\d{5})$/;

// Dung y het quy uoc format_prefix ben ocr-service/main.py: series 1 chu
// (bien oto pho bien, vd "A") KHONG co gach ngang giua ma tinh va chu ("18A"),
// chi series 2 ky tu (chu+so xe may hoac 2 chu dac biet) moi co gach ("18-H7").
// QUAN TRONG: thieu quy tac nay se lam ham nay KHONG idempotent — chuan hoa
// 1 gia tri DA DUNG lai ra gia tri khac (vd "18A-123.45" -> "18-A-123.45"),
// va vi ham nay bi goi 2 lan lien tiep trong luong xac nhan OCR confidence
// thap (handleLowConfidenceConfirm -> proceedWithResolvedPlate), lan chuan
// hoa thu 2 doc nham chuoi sai do thanh sai hoan toan ("18-A1-2345").
function platePrefix(province, series) {
  return series.length > 1 ? `${province}-${series}` : `${province}${series}`;
}

function normalizePlateDisplay(value) {
  const rawUpper = String(value ?? "").toUpperCase();

  // Neu staff da tu go dau gach/cham dung ngay ranh gioi serial (vd
  // "77H7-7060" hoac "51F-12345"), DUNG DUNG ranh gioi do — day la tin hieu
  // dang tin cay nhat. Bien so VN co truong hop go lien KHONG THE phan biet
  // chac chan bang regex (vd "77H77060" co the la series "H7" + serial 4 so
  // kieu xe may, HOAC "51F12345" co the la series "F" (1 chu, kieu oto pho
  // bien) + serial 5 so "12345" — ca 2 deu la dinh dang that, chi khac o
  // loai xe) — nen buoc nay uu tien tuyet doi neu staff da tu tach ro.
  const withSeparator = rawUpper.replace(/\s+/g, "")
    .match(/^(\d{2})([A-Z]{1,2}\d?)[-.]((?:\d{3}[-.]\d{2})|\d{4,5})$/);
  if (withSeparator) {
    const [, province, series, serialRaw] = withSeparator;
    const serial = serialRaw.replace(/[-.]/g, "");
    const prefix = platePrefix(province, series);
    return serial.length === 5 ? `${prefix}-${serial.slice(0, 3)}.${serial.slice(3)}` : `${prefix}-${serial}`;
  }

  const canonical = canonicalPlate(value);
  if (!canonical) return "";

  // Go lien khong dau: doan theo cau truc tinh+series+serial (uu tien
  // "chu+so" 4 so kieu xe may). Van co the sai voi bien oto dang "chu don +
  // serial 5 so" (vd "51F12345" doan thanh "51-F1-2345" thay vi dung phai la
  // "51-F-123.45") — neu gap truong hop nay, go them dau gach ngay sau chu de
  // chac chan (nhanh "co dau" o tren).
  const structured = canonical.match(PLATE_STRUCTURE_RE);
  if (structured) {
    const [, province, series, serial] = structured;
    const prefix = platePrefix(province, series);
    return serial.length === 5
      ? `${prefix}-${serial.slice(0, 3)}.${serial.slice(3)}`
      : `${prefix}-${serial}`;
  }

  return rawUpper.replace(/\s+/g, "");
}

export default function UnifiedScanPage() {
  const navigate = useNavigate();
  const assignedId = getAssignedBuildingId();
  const assignedLabel = getAssignedBuildingName();

  // Step: 1=scan plate, 2=detect+QR, 3=confirm done
  const [step, setStep] = useState(1);

  // OCR
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [plate, setPlate] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [platePreview, setPlatePreview] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPlate, setManualPlate] = useState("");
  const [manualEntryError, setManualEntryError] = useState("");
  const [manualExitSuggestions, setManualExitSuggestions] = useState([]);
  const [manualExitLoading, setManualExitLoading] = useState(false);
  const [pendingLowConfidenceScan, setPendingLowConfidenceScan] = useState(null);
  const [lowConfidencePlate, setLowConfidencePlate] = useState("");
  const [lowConfidenceError, setLowConfidenceError] = useState("");
  const [showLowConfidenceReview, setShowLowConfidenceReview] = useState(false);
  const [creatingException, setCreatingException] = useState(false);

  // Lookup
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupType, setLookupType] = useState(null);
  // "EXIT" | "BOOKING" | "WALKIN" | "UNREGISTERED" | "BLOCKED"
  const [lookupData, setLookupData] = useState(null);

  // Vehicle type — bat buoc chon cho xe walk-in chua dang ky, de phan loai
  // dung slot size + dung bang gia (PricingPolicy theo vehicleTypeId).
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [walkInVehicleTypeId, setWalkInVehicleTypeId] = useState("");

  // QR (for booking entry + exit)
  const [qrToken, setQrToken] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const qrVideoRef = useRef(null);
  const qrReaderRef = useRef(null);
  const qrControlsRef = useRef(null);
  const [qrCameraOn, setQrCameraOn] = useState(false);
  const [qrScanError, setQrScanError] = useState("");

  // Gate — buildingId cố định theo assignedBuilding, không cho đổi
  const buildingId = assignedId || "";
  const [gates, setGates] = useState([]);
  const [gateId, setGateId] = useState("");
  const [scopeError, setScopeError] = useState("");

  // Process
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Filtered gates based on lookup type
  const filteredGates = useMemo(() => {
    if (lookupType === "EXIT") return gates.filter((g) => ["EXIT", "BOTH"].includes(String(g.gateType || "").toUpperCase()));
    return gates.filter((g) => ["ENTRY", "BOTH"].includes(String(g.gateType || "").toUpperCase()));
  }, [gates, lookupType]);
  const bookingStatus = String(lookupData?.status || "").toUpperCase();
  const isConfirmedBooking = lookupType === "BOOKING" && bookingStatus === "CONFIRMED";
  const isPendingPaymentBooking = lookupType === "BOOKING" && bookingStatus === "PENDING_PAYMENT";
  const isPackageBooking = lookupType === "BOOKING" && Boolean(lookupData?.bookingType) && lookupData.bookingType !== "HOURLY";
  const packageBookingLabel = isPackageBooking ? (PACKAGE_LABELS[lookupData.bookingType] || lookupData.bookingType) : null;

  useEffect(() => { loadVehicleTypes(); return () => stopCamera(); }, []);

  async function loadVehicleTypes() {
    try {
      const res = await vehicleTypeApi.getAll();
      const types = unwrapApiData(res.data, []).filter((t) => t.isActive !== false);
      setVehicleTypes(types);
    } catch {
      setVehicleTypes([]);
    }
  }

  useEffect(() => {
    if (!buildingId) return;
    let c = false;
    (async () => {
      try {
        const res = await gateApi.getActiveByBuilding(buildingId);
        if (!c) {
          const g = unwrapApiData(res.data, []);
          setGates(g);
          setGateId(String(g[0]?.gateId || g[0]?.id || ""));
          setScopeError(g.length ? "" : "Toà nhà hiện tại chưa có cổng active. Liên hệ Manager để thêm cổng.");
        }
      } catch (err) {
        if (!c) {
          setGates([]);
          setScopeError(err.response?.data?.message || "Không tải được danh sách cổng cho toà nhà hiện tại.");
        }
      }
    })();
    return () => { c = true; };
  }, [buildingId]);

  useEffect(() => {
    if (filteredGates.length && !filteredGates.find((g) => String(g.gateId || g.id) === gateId))
      setGateId(String(filteredGates[0]?.gateId || filteredGates[0]?.id || ""));
  }, [filteredGates]);

  async function proceedWithResolvedPlate(rawPlate, nextConfidence = null) {
    const normalizedPlate = normalizePlateDisplay(rawPlate);
    setLookupType(null);
    setLookupData(null);
    setQrToken("");
    setError("");
    setOcrError("");
    setWalkInVehicleTypeId("");
    setPlate(normalizedPlate);
    setConfidence(nextConfidence);
    await autoLookup(normalizedPlate);
    setStep(2);
  }

  function openLowConfidenceReview(scanData, detectedPlate, detectedConfidence) {
    setPendingLowConfidenceScan(scanData);
    setLowConfidencePlate(detectedPlate);
    setLowConfidenceError("");
    setConfidence(detectedConfidence);
    setShowLowConfidenceReview(true);
  }

  function closeLowConfidenceReview() {
    setShowLowConfidenceReview(false);
    setLowConfidenceError("");
  }

  function buildExceptionContext(exceptionType, reasonOverride = "") {
    const currentGate = gates.find((g) => String(g.gateId || g.id) === String(gateId));
    const gateLabel = currentGate?.gateName || currentGate?.gateCode || `Cổng ${gateId || "?"}`;
    const segments = [
      `Lý do: ${reasonOverride || error || ocrError || "Staff không thể hoàn tất luồng scan thường."}`,
      `Cổng: ${gateLabel}`,
      `Toà nhà: ${assignedLabel || buildingId || "N/A"}`,
      `Biển số OCR/Cuối: ${plate || pendingLowConfidenceScan?.detectedPlate || "UNKNOWN"}`,
      pendingLowConfidenceScan?.detectedPlate ? `Biển số phát hiện: ${pendingLowConfidenceScan.detectedPlate}` : null,
      pendingLowConfidenceScan?.plateConfidenceScore != null
        ? `Độ tin cậy: ${Math.round((pendingLowConfidenceScan.plateConfidenceScore || 0) * 100)}%`
        : confidence != null
          ? `Độ tin cậy: ${confidence}%`
          : null,
      `Loại tra cứu: ${lookupType || "UNRESOLVED"}`,
      lookupData?.sessionId ? `Phiên: #${lookupData.sessionId}` : null,
      lookupData?.bookingId ? `Booking: #${lookupData.bookingId}` : null,
      qrToken.trim() ? "QR: có" : "QR: không có",
      pendingLowConfidenceScan?.scanId ? `Quét OCR: #${pendingLowConfidenceScan.scanId}` : null,
    ].filter(Boolean);

    return {
      exceptionType,
      sessionId: lookupData?.sessionId ? Number(lookupData.sessionId) : null,
      bookingId: lookupData?.bookingId ? Number(lookupData.bookingId) : null,
      requestId: null,
      description: segments.join(" | "),
    };
  }

  function deriveExceptionType() {
    if (lookupType === "BOOKING") return "BOOKING_MISMATCH";
    if (lookupType === "EXIT") return "EXIT_VERIFICATION_FAILED";
    if (lookupType === "BLOCKED") return "SESSION_CONFLICT";
    if (pendingLowConfidenceScan) return "PLATE_UNVERIFIED";
    if (error) return "SYSTEM_ERROR";
    return "OTHER";
  }

  async function createExceptionCase(exceptionType, reasonOverride = "") {
    setCreatingException(true);
    setError("");
    setOcrError("");
    setManualEntryError("");
    setLowConfidenceError("");
    try {
      await exceptionApi.create(buildExceptionContext(exceptionType, reasonOverride));
      closeLowConfidenceReview();
      closeManualEntry();
      resetAll();
      setResult({
        type: "EXCEPTION",
        sessionId: lookupData?.sessionId || pendingLowConfidenceScan?.scanId || "N/A",
        licensePlate: plate || pendingLowConfidenceScan?.detectedPlate || "UNKNOWN",
        slotCode: "Hàng chờ xử lý",
        status: exceptionType,
        time: new Date().toISOString(),
      });
      setStep(3);
    } catch (err) {
      const message = err.response?.data?.message || "Không tạo được exception.";
      if (showLowConfidenceReview) setLowConfidenceError(message);
      else if (showManualEntry) setManualEntryError(message);
      else setError(message);
    } finally {
      setCreatingException(false);
    }
  }

  // ==================== CAMERA ====================
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setOcrError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCameraOn(true);
    } catch { setOcrError("Không mở được camera."); }
  }

  async function handleCapture() {
    const v = videoRef.current;
    if (!v || v.readyState < 2) return;
    const sw = v.videoWidth || 1280, sh = v.videoHeight || 720;
    const cw = Math.round(sw * 0.68), ch = Math.round(sh * 0.36);
    const cx = Math.round((sw - cw) / 2), cy = Math.round((sh - ch) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    canvas.getContext("2d").drawImage(v, cx, cy, cw, ch, 0, 0, cw, ch);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    if (blob) await uploadOcr(blob, "plate.jpg");
  }

  async function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    await uploadOcr(f, f.name); e.target.value = "";
  }

  async function uploadOcr(file, filename) {
    if (!gateId) { setOcrError("Chọn cổng trước."); return; }
    const url = URL.createObjectURL(file);
    setPlatePreview((p) => { if (p) URL.revokeObjectURL(p); return url; });
    setScanning(true); setOcrError(""); setPlate(""); setConfidence(null);
    setLookupType(null); setLookupData(null); setQrToken(""); setError("");
    try {
      const fd = new FormData();
      fd.append("image", file, filename); fd.append("gateId", gateId); fd.append("triggerType", "ENTRY");
      // timeout 30s: neu backend/OCR engine bi treo hoac qua tai, bao loi ro
      // cho staff thay vi de spinner "Dang nhan dien..." dung im vinh vien.
      const res = await axiosClient.post("/ocr/scan-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });
      const d = unwrapApiData(res.data, {});
      const p = d.effectivePlate || d.detectedPlate || "";
      const c = Math.round((d.plateConfidenceScore || 0) * 100);
      if (!p || p === "UNKNOWN") {
        setOcrError("OCR không đọc được. Thử lại hoặc nhập tay biển số.");
        setManualPlate("");
        setShowManualEntry(true);
        return;
      }
      if (String(d.processStatus || "").toUpperCase() === LOW_CONFIDENCE_PROCESS_STATUS) {
        openLowConfidenceReview(d, p, c);
        return;
      }
      await proceedWithResolvedPlate(p, c);
    } catch (err) {
      const message = err.code === "ECONNABORTED"
        ? "OCR xử lý quá lâu (quá 30s). Thử chụp lại ảnh rõ hơn hoặc nhập tay biển số."
        : err.response?.data?.message || "OCR thất bại.";
      setOcrError(message);
      setManualPlate("");
      setShowManualEntry(true);
    }
    finally { setScanning(false); }
  }

  function openManualEntry() {
    setManualEntryError("");
    setManualPlate(plate || "");
    setShowManualEntry(true);
  }

  function closeManualEntry() {
    setShowManualEntry(false);
    setManualEntryError("");
    setManualExitSuggestions([]);
    setManualExitLoading(false);
  }

  async function handleManualPlateSubmit(event) {
    event?.preventDefault?.();
    const canonicalManualPlate = canonicalPlate(manualPlate);
    if (!canonicalManualPlate) {
      setManualEntryError("Nhập biển số trước khi tiếp tục.");
      return;
    }
    const normalizedPlate = normalizePlateDisplay(manualPlate);

    closeManualEntry();
    await proceedWithResolvedPlate(normalizedPlate, null);
  }

  async function handleLowConfidenceConfirm(event) {
    event?.preventDefault?.();
    const canonical = canonicalPlate(lowConfidencePlate);
    if (!canonical) {
      setLowConfidenceError("Nhập biển số xác nhận trước khi tiếp tục.");
      return;
    }

    setScanning(true);
    setLowConfidenceError("");
    try {
      const correctedPlate = normalizePlateDisplay(lowConfidencePlate);
      const res = await ocrApi.review(pendingLowConfidenceScan.scanId, {
        correctedPlate,
        staffUserId: Number(localStorage.getItem("userId")) || 0,
      });
      const reviewed = unwrapApiData(res.data, null);
      closeLowConfidenceReview();
      await proceedWithResolvedPlate(reviewed?.effectivePlate || correctedPlate, confidence);
    } catch (err) {
      setLowConfidenceError(err.response?.data?.message || "Không xác nhận được kết quả OCR.");
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    if (!showManualEntry) return;

    const query = canonicalPlate(manualPlate);
    if (query.length < 2) {
      setManualExitSuggestions([]);
      setManualExitLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setManualExitLoading(true);
      try {
        const res = await sessionApi.getSessions({ status: "ACTIVE", keyword: query });
        if (cancelled) return;
        const sessions = unwrapApiData(res.data, []);
        const uniquePlates = [];
        const seen = new Set();

        sessions.forEach((item) => {
          const normalizedCandidate = canonicalPlate(item.licensePlate);
          if (!normalizedCandidate || !normalizedCandidate.includes(query) || seen.has(normalizedCandidate)) {
            return;
          }
          seen.add(normalizedCandidate);
          uniquePlates.push(item);
        });

        setManualExitSuggestions(uniquePlates.slice(0, 6));
      } catch {
        if (!cancelled) setManualExitSuggestions([]);
      } finally {
        if (!cancelled) setManualExitLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showManualEntry, manualPlate]);

  // ==================== LOOKUP ====================
  async function autoLookup(p) {
    setLookupLoading(true);
    try {
      // Active/waiting session? (dedicated endpoint, no building scope restriction)
      try {
        const sRes = await sessionApi.getActiveByPlate(p);
        const session = unwrapApiData(sRes.data, null);
        if (session) {
          const sessionStatus = String(session.status || "").toUpperCase();
          if (sessionStatus === "ACTIVE") {
            // Xe đang trong bãi → EXIT
            setLookupType("EXIT"); setLookupData(session); return;
          }
          if (sessionStatus === "WAITING_PAYMENT") {
            // Xe đã ra nhưng chưa thanh toán → BLOCKED, không cho vào lại
            setLookupType("BLOCKED");
            setLookupData(`Xe có phiên chưa thanh toán (Session #${session.sessionId}). Thu tiền trước khi cho xe vào.`);
            return;
          }
        }
      } catch { /* ignore, fall through */ }

      // Has booking?
      try {
        const bRes = await axiosClient.get(`/bookings/search?licensePlate=${encodeURIComponent(p)}`);
        const bookings = unwrapApiData(bRes.data, []);
        const active = bookings.find((b) => ["CONFIRMED", "PENDING_PAYMENT"].includes(String(b.status || "").toUpperCase()));
        if (active) { setLookupType("BOOKING"); setLookupData(active); return; }
      } catch (bookingErr) {
        console.warn("[autoLookup] booking search failed:", bookingErr?.response?.data?.message || bookingErr?.message);
      }

      // Vehicle registered?
      let vehicle = null;
      try { vehicle = unwrapApiData((await axiosClient.get(`/vehicles/plate/${encodeURIComponent(p)}`)).data, null); } catch {}

      if (vehicle && vehicle.isActive === false) { setLookupType("BLOCKED"); setLookupData("Xe bị vô hiệu hóa."); return; }

      setLookupType(vehicle ? "WALKIN" : "UNREGISTERED");
      setLookupData(vehicle);
    } catch { setLookupType("WALKIN"); setLookupData(null); }
    finally { setLookupLoading(false); }
  }

  // ==================== QR MODAL ====================
  function stopQrCamera() {
    qrControlsRef.current?.stop(); qrControlsRef.current = null;
    if (qrVideoRef.current) qrVideoRef.current.srcObject = null;
    setQrCameraOn(false);
  }

  function closeQrModal() { stopQrCamera(); setShowQrModal(false); setQrScanError(""); }

  async function openQrModal() {
    setQrScanError("");
    setShowQrModal(true);
    setTimeout(async () => {
      try {
        if (!qrReaderRef.current) qrReaderRef.current = new BrowserQRCodeReader(QR_HINTS, QR_SCAN_OPTIONS);
        setQrCameraOn(true);
        qrControlsRef.current = await qrReaderRef.current.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              // Lay net lien tuc — quan trong voi camera dien thoai khi dua sat
              // ma QR, neu khong camera co the giu nguyen focus xa ban dau.
              advanced: [{ focusMode: "continuous" }],
            },
          },
          qrVideoRef.current,
          (res) => {
            const v = res?.getText?.() || res?.text || "";
            if (v) { setQrToken(v); closeQrModal(); }
          },
        );
      } catch (err) {
        setQrCameraOn(false);
        setQrScanError(err?.message || "Không mở được camera QR. Kiểm tra quyền camera hoặc dán token thủ công.");
      }
    }, 100);
  }

  // ==================== PROCESS ====================
  async function handleProcess() {
    if (!gateId || !plate) return;
    if (lookupType === "UNREGISTERED" && !walkInVehicleTypeId) {
      setError("Chọn loại xe trước khi cho xe vào.");
      return;
    }
    setProcessing(true); setError("");
    try {
      let res;
      if (lookupType === "EXIT") {
        res = await sessionApi.exit(lookupData.sessionId, { gateId: Number(gateId), staffUserId: Number(localStorage.getItem("userId")) || null, licensePlate: plate });
      } else if (isPendingPaymentBooking) {
        throw new Error("Booking chưa thanh toán cọc. Không thể cho xe vào.");
      } else if (isConfirmedBooking && qrToken.trim()) {
        res = await sessionApi.entry({ gateId: Number(gateId), entryMode: "BOOKING", qrToken: qrToken.trim(), licensePlate: plate, staffUserId: Number(localStorage.getItem("userId")) || null });
      } else if (isConfirmedBooking) {
        // Không có QR → Staff override: bypass QR, vẫn link booking
        res = await sessionApi.entry({ gateId: Number(gateId), entryMode: "BOOKING_STAFF_OVERRIDE", licensePlate: plate, staffUserId: Number(localStorage.getItem("userId")) || null });
      } else {
        res = await sessionApi.entry({
          gateId: Number(gateId), licensePlate: plate, entryMode: "WALK_IN_AUTO",
          staffUserId: Number(localStorage.getItem("userId")) || null,
          vehicleTypeId: walkInVehicleTypeId ? Number(walkInVehicleTypeId) : undefined,
        });
      }
      const payload = unwrapApiData(res.data, {});
      const type = lookupType === "EXIT" ? "EXIT" : "ENTRY";
      const record = {
        id: `${type}-${Date.now()}`, type, sessionId: payload.sessionId,
        licensePlate: payload.licensePlate || plate, slotCode: payload.slotCode || "N/A",
        status: payload.status || (type === "EXIT" ? "WAITING_PAYMENT" : "ACTIVE"),
        time: (type === "EXIT" ? payload.exitTime : payload.entryTime) || new Date().toISOString(),
      };
      setResult(record);
      setHistory((prev) => [record, ...prev].slice(0, 10));
      setStep(3);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Xử lý thất bại.";
      // 409: xe đang có session active → tự động re-lookup và chuyển sang EXIT
      if (err.response?.status === 409 || message.includes("phiên đỗ xe")) {
        try {
          const sRes = await sessionApi.getActiveByPlate(plate);
          const session = unwrapApiData(sRes.data, null);
          if (session) { setLookupType("EXIT"); setLookupData(session); setError("Xe đang trong bãi — đã chuyển sang chế độ xe ra."); return; }
        } catch { /* ignore */ }
      }
      setError(message);
    }
    finally { setProcessing(false); }
  }

  function resetAll() {
    stopCamera(); setStep(1); setPlate(""); setConfidence(null); setOcrError("");
    setPlatePreview((p) => { if (p) URL.revokeObjectURL(p); return ""; });
    setLookupType(null); setLookupData(null); setQrToken(""); setError(""); setResult(null); setWalkInVehicleTypeId("");
    setPendingLowConfidenceScan(null); setLowConfidencePlate(""); setLowConfidenceError(""); setShowLowConfidenceReview(false);
    setShowManualEntry(false); setManualPlate(""); setManualEntryError(""); setManualExitSuggestions([]); setManualExitLoading(false);
  }

  // Guard: staff chưa được gán bãi → không cho scan
  if (!assignedId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        <p className="font-semibold mb-1">Chưa được gán bãi xe</p>
        <p>Tài khoản của bạn chưa được Manager phân công vào bãi xe nào. Vui lòng liên hệ Manager để được gán bãi trước khi sử dụng tính năng scan cổng.</p>
      </div>
    );
  }

  // Step indicator
  const steps = ["Scan biển số", "Xác minh", "Hoàn tất"];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step > i ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step > i ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                {i < 2 && <div className={`h-px w-8 ${step > i + 1 ? "bg-emerald-400" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          {/* ==================== STEP 1: OCR SCAN ==================== */}
          {step === 1 && (
            <StaffPageSection title="Scan biển số xe" subtitle="Chụp hoặc upload ảnh biển số — bắt buộc cho mọi luồng">
              {scopeError && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  {scopeError}
                </div>
              )}
              {/* Gate select */}
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div className="flex items-center rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-primary">{assignedLabel || `Toà nhà #${assignedId}`}</div>
                <StaffSelect value={gateId} onChange={(e) => setGateId(e.target.value)}>
                  <option value="">Chọn cổng</option>
                  {gates.map((g) => <option key={g.gateId || g.id} value={g.gateId || g.id}>{g.gateName || g.gateCode || `Cổng ${g.gateId || g.id}`} ({g.gateType})</option>)}
                </StaffSelect>
              </div>

              {/* Camera */}
              <div className="rounded-3xl bg-slate-950 p-4 text-white dark:bg-[#020617]">
                <div className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-slate-900 dark:bg-[#0f172a]">
                  <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 size-full object-cover ${cameraOn ? "opacity-100" : "opacity-0"}`} />
                  {cameraOn && <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-20 -translate-y-1/2 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />}
                  {platePreview && !cameraOn && <img src={platePreview} alt="Biển số" className="absolute inset-0 size-full object-contain opacity-60" />}
                  {scanning ? (
                    <div className="relative z-10 space-y-3 text-center">
                      <div className="mx-auto size-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      <p className="text-sm text-emerald-300">Đang nhận diện...</p>
                    </div>
                  ) : (
                    <div className="relative z-10 space-y-3 text-center">
                      <Camera size={38} className="mx-auto text-white/30" />
                      <p className="text-sm text-white/60">{cameraOn ? "Căn chỉnh biển số vào khung" : "Mở camera hoặc upload ảnh"}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                <StaffSecondaryButton type="button" onClick={cameraOn ? stopCamera : startCamera} disabled={scanning} className="flex items-center justify-center gap-2">
                  {cameraOn ? <VideoOff size={15} /> : <Video size={15} />} {cameraOn ? "Dừng" : "Camera"}
                </StaffSecondaryButton>
                <StaffPrimaryButton type="button" onClick={handleCapture} disabled={scanning || !cameraOn} className="flex items-center justify-center gap-2">
                  <Camera size={15} /> Chụp
                </StaffPrimaryButton>
                <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted ${scanning ? "pointer-events-none opacity-60" : ""}`}>
                  <ImageUp size={15} /> Upload
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
                </label>
                <StaffSecondaryButton type="button" onClick={resetAll} disabled={scanning} className="flex items-center justify-center gap-2">
                  <RefreshCw size={15} /> Đặt lại
                </StaffSecondaryButton>
                <StaffSecondaryButton type="button" onClick={openManualEntry} disabled={scanning} className="flex items-center justify-center gap-2">
                  <ScanLine size={15} /> Nhập tay
                </StaffSecondaryButton>
              </div>

              {ocrError && (
                <div className="mt-3 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p>{ocrError}</p>
                    <StaffSecondaryButton type="button" onClick={openManualEntry} className="shrink-0">
                      Nhập tay ngay
                    </StaffSecondaryButton>
                  </div>
                </div>
              )}
            </StaffPageSection>
          )}

          {/* ==================== STEP 2: DETECT + QR ==================== */}
          {step === 2 && (
            <StaffPageSection title="Kết quả xác minh" subtitle="Hệ thống tự động phân loại — scan QR nếu cần">
              {/* Plate result */}
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
                {platePreview && <img src={platePreview} alt="Biển số" className="h-16 w-24 rounded-xl border border-border object-contain bg-slate-950" />}
                <div>
                  <p className="font-mono text-2xl font-bold text-foreground">{plate}</p>
                  {confidence != null && <p className={`text-xs ${confidence >= 80 ? "text-emerald-600" : "text-amber-600"}`}>Độ tin cậy {confidence}%</p>}
                </div>
                <StaffSecondaryButton type="button" onClick={() => { setStep(1); setLookupType(null); }} className="ml-auto text-xs">
                  Scan lại
                </StaffSecondaryButton>
              </div>

              {lookupLoading && (
                <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
                  <Search size={16} className="inline mr-2 animate-pulse" /> Đang kiểm tra...
                </div>
              )}

              {!lookupLoading && lookupType && (
                <div className="space-y-4">
                  {/* Status card */}
                  {lookupType === "EXIT" && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                      <div className="flex items-center gap-3">
                        <LogOut size={20} className="text-amber-600" />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-foreground">RA BÃI — Xe đang trong bãi</p>
                            {lookupData?.bookingType && lookupData.bookingType !== "HOURLY" && (
                              <StaffStatusBadge tone="blue">{PACKAGE_LABELS[lookupData.bookingType] || lookupData.bookingType}</StaffStatusBadge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">Phiên #{lookupData?.sessionId} • Chỗ đỗ {lookupData?.slotCode} • Vào {formatStaffDateTime(lookupData?.entryTime)}</p>
                          {lookupData?.bookingType && lookupData.bookingType !== "HOURLY" && (
                            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                              Xe theo gói — đã thanh toán trọn gói, không thu thêm phí khi ra.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {false && lookupType === "BOOKING" && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                      <div className="flex items-center gap-3">
                        <QrCode size={20} className="text-blue-600" />
                        <div>
                          <p className="font-bold text-foreground">BOOKING — Xe có booking, cần QR</p>
                          <p className="text-sm text-muted-foreground">Booking #{lookupData?.bookingId} • Chỗ đỗ {lookupData?.slotCode} • {String(lookupData?.status || "")}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {lookupType === "BOOKING" && (
                    <div
                      className={`rounded-2xl border p-4 ${
                        isPendingPaymentBooking
                          ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10"
                          : "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isPendingPaymentBooking ? (
                          <CreditCard size={20} className="text-amber-600" />
                        ) : (
                          <QrCode size={20} className="text-blue-600" />
                        )}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-foreground">
                              {isPendingPaymentBooking
                                ? isPackageBooking ? "BOOKING - Chưa thanh toán gói, không cho vào" : "BOOKING - Chưa thanh toán cọc, không cho vào"
                                : "BOOKING - Xe có booking, cần QR"}
                            </p>
                            <StaffStatusBadge tone={isPackageBooking ? "blue" : "slate"}>
                              {isPackageBooking ? packageBookingLabel : "Theo giờ"}
                            </StaffStatusBadge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Booking #{lookupData?.bookingId} - Chỗ đỗ {lookupData?.slotCode} - {bookingStatus || "UNKNOWN"}
                            {isPackageBooking && lookupData?.bookingEndTime && ` - Hết hạn gói ${formatStaffDateTime(lookupData.bookingEndTime)}`}
                          </p>
                          {isPendingPaymentBooking && (
                            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                              {isPackageBooking
                                ? "Khách cần thanh toán trọn gói để booking chuyển sang CONFIRMED trước khi staff cho xe vào."
                                : "Khách cần thanh toán xong để booking chuyển sang CONFIRMED trước khi staff cho xe vào."}
                            </p>
                          )}
                          {isPackageBooking && !isPendingPaymentBooking && (
                            <p className={`mt-1 text-sm ${lookupData.bookingType === "DAILY" ? "text-amber-700 dark:text-amber-300" : "text-blue-700 dark:text-blue-300"}`}>
                              {lookupData.bookingType === "DAILY"
                                ? "Đã thanh toán trọn gói ngày — chỉ 1 lượt vào và 1 lượt ra, không cho vào lại sau khi đã ra bãi."
                                : "Đã thanh toán trọn gói — không thu thêm phí lúc vào/ra trong kỳ hạn."}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {lookupType === "WALKIN" && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <div className="flex items-center gap-3">
                        <LogIn size={20} className="text-emerald-600" />
                        <p className="font-bold text-foreground">KHÁCH VÃNG LAI — Xe đã đăng ký, cho vào trực tiếp</p>
                      </div>
                    </div>
                  )}

                  {lookupType === "UNREGISTERED" && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={20} className="text-amber-600" />
                        <p className="font-bold text-foreground">KHÁCH VÃNG LAI — Xe chưa đăng ký (tự tạo khi vào bãi)</p>
                      </div>
                      <div className="mt-3">
                        <label className="mb-1.5 block text-sm font-medium text-foreground">
                          Loại xe <span className="text-rose-600">*</span>
                        </label>
                        <StaffSelect value={walkInVehicleTypeId} onChange={(e) => setWalkInVehicleTypeId(e.target.value)}>
                          <option value="">— Chọn loại xe —</option>
                          {vehicleTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.slotSize}) — {formatStaffCurrency(t.hourlyRate)}/giờ
                            </option>
                          ))}
                        </StaffSelect>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Bắt buộc chọn đúng loại xe — quyết định slot size và bảng giá áp dụng khi tính phí lúc xe ra.
                        </p>
                      </div>
                    </div>
                  )}

                  {lookupType === "BLOCKED" && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                      <div className="flex items-center gap-3">
                        <XCircle size={20} className="text-rose-600" />
                        <p className="font-bold text-foreground">BỊ CHẶN — {lookupData}</p>
                      </div>
                    </div>
                  )}

                  {/* QR input — chỉ cho BOOKING entry, exit đã chuyển hoàn toàn sang OCR/nhập tay biển số */}
                  {isConfirmedBooking && (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <p className="text-sm font-semibold text-foreground mb-2">
                        Scan QR booking của driver (khuyến nghị – có thể bỏ qua)
                      </p>
                      <div className="flex gap-2">
                        <StaffInput value={qrToken} onChange={(e) => setQrToken(e.target.value)}
                          placeholder="Dán mã QR" className="flex-1" />
                        <StaffPrimaryButton type="button" onClick={openQrModal} className="flex items-center gap-2 shrink-0">
                          <QrCode size={15} /> Scan QR
                        </StaffPrimaryButton>
                      </div>
                      {qrToken && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                          <CheckCircle2 size={14} /> QR đã nhận
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gate select */}
                  {lookupType !== "BLOCKED" && (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex items-center rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-primary">{assignedLabel}</div>
                        <StaffSelect value={gateId} onChange={(e) => setGateId(e.target.value)}>
                          <option value="">Chọn cổng ({lookupType === "EXIT" ? "RA" : "VÀO"})</option>
                          {filteredGates.map((g) => <option key={g.gateId || g.id} value={g.gateId || g.id}>{g.gateName || g.gateCode || `Cổng ${g.gateId || g.id}`} ({g.gateType})</option>)}
                        </StaffSelect>
                      </div>

                      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}

                      {isConfirmedBooking && !qrToken.trim() && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                          Không có QR — hệ thống sẽ dùng <strong>Staff Override</strong>: xe vào không cần QR, booking vẫn được liên kết. Khi ra, staff quét/nhập biển số như bình thường, không cần QR.
                        </div>
                      )}

                      <StaffPrimaryButton type="button" onClick={handleProcess}
                        disabled={processing || !gateId || isPendingPaymentBooking || (lookupType === "UNREGISTERED" && !walkInVehicleTypeId)}
                        className="flex w-full items-center justify-center gap-2">
                        {processing ? "Đang xử lý..." : lookupType === "EXIT" ? (
                          <><LogOut size={15} /> Xác nhận xe ra</>
                        ) : isConfirmedBooking && !qrToken.trim() ? (
                          <><LogIn size={15} /> Cho xe vào (Staff Override)</>
                        ) : (
                          <><LogIn size={15} /> Xác nhận xe vào</>
                        )}
                      </StaffPrimaryButton>

                      {/* Chỉ cho tạo exception với SESSION_CONFLICT và BLOCKED — các trường hợp entry lỗi khác dùng manual plate + override */}
                      {(lookupType === "BLOCKED") && (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">Xe bị khóa hoặc xung đột session?</p>
                              <p className="text-xs text-muted-foreground">
                                Tạo exception để ghi nhận và xử lý thủ công tại cổng.
                              </p>
                            </div>
                            <StaffSecondaryButton
                              type="button"
                              onClick={() => createExceptionCase(deriveExceptionType())}
                              disabled={creatingException}
                              className="shrink-0"
                            >
                              {creatingException ? "Đang tạo..." : "Tạo exception"}
                            </StaffSecondaryButton>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </StaffPageSection>
          )}

          {/* ==================== STEP 3: DONE ==================== */}
          {step === 3 && result && (
            <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                <CheckCircle2 size={26} className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {result.type === "EXIT" ? "Xe đã ra bãi" : result.type === "EXCEPTION" ? "Đã tạo exception" : "Xe đã vào bãi"}
              </h3>
              {platePreview && <img src={platePreview} alt="Biển số" className="mx-auto mt-3 max-h-20 rounded-xl border border-border object-contain bg-slate-950" />}
              <div className="mt-4 space-y-2 rounded-2xl bg-white/60 dark:bg-white/5 p-4 text-left">
                {[["Phiên", result.sessionId], ["Biển số", result.licensePlate], ["Chỗ đỗ", result.slotCode], ["Trạng thái", result.status], ["Thời gian", formatStaffDateTime(result.time)]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{k}</span><span className="font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <StaffPrimaryButton type="button" onClick={resetAll} className="flex-1">Xe tiếp theo</StaffPrimaryButton>
                {result.type === "EXIT" && (
                  <StaffSecondaryButton type="button" onClick={() => navigate("/staff/payments")} className="flex-1 flex items-center justify-center gap-2">
                    <CreditCard size={14} /> Thanh toán
                  </StaffSecondaryButton>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== HISTORY ==================== */}
        <StaffPageSection title="Lịch sử scan" subtitle="Các lần xử lý gần đây">
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Chưa có lần scan nào.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-9 items-center justify-center rounded-xl ${item.type === "EXIT" ? "bg-amber-100 dark:bg-amber-500/15" : "bg-blue-100 dark:bg-blue-500/15"}`}>
                        {item.type === "EXIT" ? <LogOut size={15} className="text-amber-600" /> : <LogIn size={15} className="text-blue-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.type} — {item.licensePlate}</p>
                        <p className="text-xs text-muted-foreground">#{item.sessionId} • {item.slotCode}</p>
                      </div>
                    </div>
                    <StaffStatusBadge tone={item.type === "EXIT" ? "amber" : "emerald"}>{item.type === "EXIT" ? "Ra bãi" : "Vào bãi"}</StaffStatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{formatStaffDateTime(item.time)}</p>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>
      </div>

      {/* QR Scan Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <QrCode size={20} /> Quét mã QR
              </h3>
              <button type="button" onClick={closeQrModal} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition">
                <X size={18} />
              </button>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-slate-950">
              <video ref={qrVideoRef} className="h-full w-full object-cover" muted playsInline />
              {qrCameraOn && (
                <div className="pointer-events-none absolute inset-12 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.3)]" />
              )}
              <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                {qrCameraOn ? "Đưa QR vào khung..." : "Đang mở camera..."}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Đưa mã QR của driver vào khung. Tự động nhận diện.</p>
            {qrScanError && (
              <p className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {qrScanError}
              </p>
            )}
          </div>
        </div>
      )}

      {showLowConfidenceReview && pendingLowConfidenceScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Xác nhận biển số OCR confidence thấp</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  OCR đã đọc ra biển số nhưng confidence chưa đủ để tự động xử lý. Staff xác nhận biển cuối cùng ngay tại cổng để tiếp tục luồng thường.
                </p>
              </div>
              <button
                type="button"
                onClick={closeLowConfidenceReview}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="overflow-hidden rounded-2xl border border-border bg-slate-950">
                {platePreview ? (
                  <img src={platePreview} alt="Ảnh OCR độ tin cậy thấp" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex min-h-48 items-center justify-center text-sm text-white/50">Không có ảnh preview</div>
                )}
              </div>

              <form onSubmit={handleLowConfidenceConfirm} className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  OCR phát hiện <span className="font-semibold">{pendingLowConfidenceScan.detectedPlate || "UNKNOWN"}</span> với độ tin cậy
                  {" "}
                  <span className="font-semibold">{Math.round((pendingLowConfidenceScan.plateConfidenceScore || 0) * 100)}%</span>.
                </div>

                <div className="rounded-2xl border border-border bg-muted/20 p-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">Biển số xác nhận</label>
                  <StaffInput
                    value={lowConfidencePlate}
                    onChange={(event) => {
                      setLowConfidencePlate(event.target.value.toUpperCase());
                      if (lowConfidenceError) setLowConfidenceError("");
                    }}
                    placeholder="Nhập biển số đúng"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nếu staff xác nhận được biển số, hệ thống sẽ bỏ queue OCR review và tiếp tục lookup ngay.
                  </p>
                </div>

                {lowConfidenceError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {lowConfidenceError}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <StaffSecondaryButton type="button" onClick={closeLowConfidenceReview} disabled={scanning}>
                    Hủy
                  </StaffSecondaryButton>
                  <StaffPrimaryButton type="submit" disabled={scanning} className="flex items-center justify-center gap-2">
                    <CheckCircle2 size={15} />
                    {scanning ? "Đang xác nhận..." : "Xác nhận biển và tiếp tục"}
                  </StaffPrimaryButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showManualEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Nhập tay biển số</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dùng khi OCR đọc sai hoặc không nhận ra biển số. Sau khi nhập, hệ thống sẽ tiếp tục bước xác minh hiện tại.
                </p>
              </div>
              <button
                type="button"
                onClick={closeManualEntry}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualPlateSubmit} className="mt-5 space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <label className="mb-2 block text-sm font-medium text-foreground">Biển số xe</label>
                <StaffInput
                  value={manualPlate}
                  onChange={(event) => {
                    setManualPlate(event.target.value.toUpperCase());
                    if (manualEntryError) setManualEntryError("");
                  }}
                  placeholder="Ví dụ: 51A12345"
                  autoFocus
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Có thể nhập liền hoặc có dấu gạch. Hệ thống sẽ tự chuẩn hóa trước khi lookup.
                </p>
              </div>

              {(manualExitLoading || manualExitSuggestions.length > 0 || canonicalPlate(manualPlate).length >= 2) && (
                <div className="rounded-2xl border border-border bg-muted/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">Gợi ý xe đang trong bãi</p>
                    <span className="text-xs text-muted-foreground">
                      {manualExitLoading ? "Đang lọc..." : `${manualExitSuggestions.length} kết quả`}
                    </span>
                  </div>

                  {manualExitSuggestions.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {manualExitSuggestions.map((item) => (
                        <button
                          key={`${item.sessionId}-${item.licensePlate}`}
                          type="button"
                          onClick={() => {
                            setManualPlate(item.licensePlate || "");
                            setManualEntryError("");
                          }}
                          className="flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-muted"
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Session #{item.sessionId} · Slot {item.slotCode || "--"}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatStaffDateTime(item.entryTime)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    !manualExitLoading && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Không tìm thấy xe đang trong bãi khớp với biển đang nhập.
                      </p>
                    )
                  )}
                </div>
              )}

              {manualEntryError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {manualEntryError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <StaffSecondaryButton type="button" onClick={closeManualEntry}>
                  Hủy
                </StaffSecondaryButton>
                <StaffPrimaryButton type="submit" className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={15} />
                  Dùng biển số này
                </StaffPrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

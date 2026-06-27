import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  Camera,
  CheckCircle2,
  ImageUp,
  LogIn,
  LogOut,
  QrCode,
  RefreshCw,
  ScanLine,
  StopCircle,
  Video,
  VideoOff,
  CreditCard,
  XCircle,
  Search,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { buildingApi } from "../../api/manager/buildingApi";
import { gateApi } from "../../api/manager/gateApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import {
  computeSessionFee,
  createPortalId,
  formatStaffCurrency,
  formatStaffDateTime,
  updateStaffPortalState,
} from "./staffPortalState";
import { getAssignedBuildingId, getAssignedBuildingName } from "../../utils/auth";
import {
  StaffInput,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffSelect,
  StaffStatusBadge,
} from "./StaffUi";

function classifyQrToken(token) {
  if (!token || !token.trim()) return null;
  return token.trim().startsWith("PEX.") ? "EXIT" : "ENTRY";
}

export default function UnifiedQrScanPage() {
  const navigate = useNavigate();

  // --- Tab state ---
  const [mode, setMode] = useState("ocr"); // "ocr" | "qr"

  // --- Building & Gate ---
  const assignedId = getAssignedBuildingId();
  const assignedBuildingLabel = getAssignedBuildingName();
  const [buildingId, setBuildingId] = useState(assignedId || "");
  const [gateId, setGateId] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [allGates, setAllGates] = useState([]);
  const [detectedDirection, setDetectedDirection] = useState(null); // "ENTRY" | "EXIT" | null

  // --- OCR state ---
  const ocrVideoRef = useRef(null);
  const ocrStreamRef = useRef(null);
  const [ocrCameraOn, setOcrCameraOn] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrPreview, setOcrPreview] = useState("");
  const [ocrPlate, setOcrPlate] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [ocrError, setOcrError] = useState("");

  // --- QR state ---
  const qrVideoRef = useRef(null);
  const qrReaderRef = useRef(null);
  const qrControlsRef = useRef(null);
  const [qrCameraActive, setQrCameraActive] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [qrEntryPlate, setQrEntryPlate] = useState("");
  const [qrEntryPlatePreview, setQrEntryPlatePreview] = useState("");
  const [qrEntryOcrScanning, setQrEntryOcrScanning] = useState(false);
  const [qrEntryOcrConfidence, setQrEntryOcrConfidence] = useState(null);
  const qrPlateVideoRef = useRef(null);
  const qrPlateStreamRef = useRef(null);
  const [qrPlateCameraOn, setQrPlateCameraOn] = useState(false);
  const [qrScanStatus, setQrScanStatus] = useState("Camera off");
  const [qrError, setQrError] = useState("");

  // --- Process state ---
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // --- Lookup state (for OCR plate) ---
  const [lookupResult, setLookupResult] = useState(null); // { type: "ENTRY"|"EXIT", session?, vehicle? }
  const [lookupLoading, setLookupLoading] = useState(false);

  const filteredGates = useMemo(() => {
    if (!detectedDirection) return allGates;
    if (detectedDirection === "ENTRY") return allGates.filter((g) => ["ENTRY", "BOTH"].includes(String(g.gateType || "").toUpperCase()));
    return allGates.filter((g) => ["EXIT", "BOTH"].includes(String(g.gateType || "").toUpperCase()));
  }, [allGates, detectedDirection]);

  // --- Load buildings ---
  useEffect(() => {
    (async () => {
      try {
        const res = await buildingApi.getAll();
        const items = unwrapApiData(res.data, []);
        setBuildings(items);
        const first = items[0]?.buildingId || items[0]?.id;
        if (assignedId) setBuildingId(assignedId);
        else if (first) setBuildingId(String(first));
      } catch (err) { console.error("Load buildings failed", err); }
    })();
    return () => { stopOcrCamera(); stopQrCamera(); };
  }, []);

  // --- Load gates on building change ---
  useEffect(() => {
    if (!buildingId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await gateApi.getActiveByBuilding(buildingId);
        if (!cancelled) {
          const gates = unwrapApiData(res.data, []);
          setAllGates(gates);
          setGateId(String(gates[0]?.gateId || gates[0]?.id || ""));
        }
      } catch { if (!cancelled) setAllGates([]); }
    })();
    return () => { cancelled = true; };
  }, [buildingId]);

  // --- Auto-select gate when direction changes ---
  useEffect(() => {
    if (filteredGates.length && !filteredGates.find((g) => String(g.gateId || g.id) === gateId)) {
      setGateId(String(filteredGates[0]?.gateId || filteredGates[0]?.id || ""));
    }
  }, [filteredGates]);

  // ==================== OCR CAMERA ====================
  function stopOcrCamera() {
    ocrStreamRef.current?.getTracks().forEach((t) => t.stop());
    ocrStreamRef.current = null;
    setOcrCameraOn(false);
  }

  async function startOcrCamera() {
    setOcrError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setOcrError("Trinh duyet khong ho tro camera. Can HTTPS hoac localhost.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      ocrStreamRef.current = stream;
      if (ocrVideoRef.current) ocrVideoRef.current.srcObject = stream;
      setOcrCameraOn(true);
    } catch (err) {
      const msg = err.name === "NotAllowedError"
        ? "Quyen camera bi tu choi. Cho phep camera trong Settings trinh duyet."
        : err.name === "NotFoundError"
          ? "Khong tim thay camera. Hay upload anh bien so."
          : `Khong mo duoc camera (${err.name}). Hay upload anh.`;
      setOcrError(msg);
    }
  }

  function captureOcrBlob() {
    return new Promise((resolve, reject) => {
      const video = ocrVideoRef.current;
      if (!video || video.readyState < 2) { reject(new Error("Camera chua san sang")); return; }
      const sw = video.videoWidth || 1280;
      const sh = video.videoHeight || 720;
      const cw = Math.round(sw * 0.68);
      const ch = Math.round(sh * 0.36);
      const cx = Math.round((sw - cw) / 2);
      const cy = Math.round((sh - ch) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Khong chup duoc")), "image/jpeg", 0.92);
    });
  }

  async function handleOcrCapture() {
    try {
      const blob = await captureOcrBlob();
      await uploadForOcr(blob, "camera-capture.jpg");
    } catch (err) {
      setOcrError(err.message);
    }
  }

  async function handleOcrFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadForOcr(file, file.name);
    event.target.value = "";
  }

  async function uploadForOcr(file, filename) {
    if (!gateId) { setOcrError("Chon gate truoc khi scan."); return; }

    const nextUrl = URL.createObjectURL(file);
    setOcrPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return nextUrl; });
    setOcrScanning(true);
    setOcrError("");
    setOcrPlate("");
    setOcrConfidence(null);
    setLookupResult(null);
    setDetectedDirection(null);

    try {
      const formData = new FormData();
      formData.append("image", file, filename);
      formData.append("gateId", gateId);
      formData.append("triggerType", "ENTRY");
      const response = await axiosClient.post("/ocr/scan-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data?.data || {};
      const plate = data.effectivePlate || data.detectedPlate || "";
      const confidence = Math.round((data.plateConfidenceScore || 0) * 100);

      if (!plate || plate === "UNKNOWN") {
        setOcrError("OCR khong doc duoc bien so. Thu anh ro hon hoac nhap tay.");
        return;
      }

      setOcrPlate(plate);
      setOcrConfidence(confidence);

      updateStaffPortalState((cur) => ({
        ...cur,
        latestOcrPlate: plate,
        latestOcrRecord: {
          id: data.scanId ? `OCR-${data.scanId}` : createPortalId("OCR"),
          detectedPlate: plate,
          confidence,
          status: data.processStatus || "PENDING",
          scanTime: data.scannedAt || new Date().toISOString(),
        },
      }));

      await autoLookupPlate(plate);
    } catch (err) {
      console.error("OCR scan failed", err);
      setOcrError(err.response?.data?.message || "OCR scan that bai.");
    } finally {
      setOcrScanning(false);
    }
  }

  async function autoLookupPlate(plate) {
    setLookupLoading(true);
    try {
      const sessRes = await sessionApi.getSessions({ status: "ACTIVE", keyword: plate });
      const activeSessions = unwrapApiData(sessRes.data, []);
      const match = activeSessions.find((s) =>
        String(s.licensePlate || "").toUpperCase() === plate.toUpperCase()
      );
      if (match) {
        setLookupResult({ type: "EXIT", session: match });
        setDetectedDirection("EXIT");
        return;
      }

      setLookupResult({ type: "ENTRY", plate });
      setDetectedDirection("ENTRY");
    } catch (err) {
      console.error("Auto-lookup failed", err);
      setLookupResult({ type: "ENTRY", plate });
      setDetectedDirection("ENTRY");
    } finally {
      setLookupLoading(false);
    }
  }

  function resetOcr() {
    stopOcrCamera();
    setOcrPlate("");
    setOcrConfidence(null);
    setOcrError("");
    setOcrPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
    setLookupResult(null);
    setDetectedDirection(null);
    setResult(null);
    setError("");
  }

  // ==================== QR CAMERA ====================
  function stopQrCamera() {
    qrControlsRef.current?.stop();
    qrControlsRef.current = null;
    if (qrVideoRef.current) qrVideoRef.current.srcObject = null;
    setQrCameraActive(false);
    setQrScanStatus("Camera off");
  }

  async function startQrCamera() {
    setQrError("");
    setQrScanStatus("Opening camera...");
    if (!navigator.mediaDevices?.getUserMedia) {
      setQrError("Trinh duyet khong ho tro camera.");
      setQrScanStatus("Camera unavailable");
      return;
    }
    try {
      if (!qrReaderRef.current) qrReaderRef.current = new BrowserQRCodeReader();
      setQrCameraActive(true);
      setQrScanStatus("Scanning QR...");
      qrControlsRef.current = await qrReaderRef.current.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        qrVideoRef.current,
        (res) => {
          const value = res?.getText();
          if (value) {
            setQrToken(value);
            const type = classifyQrToken(value);
            setDetectedDirection(type);
            stopQrCamera();
            setQrScanStatus("QR detected");
          }
        },
      );
    } catch (err) {
      console.error("QR camera error", err);
      setQrError("Khong mo duoc camera.");
      setQrScanStatus("Camera failed");
      stopQrCamera();
    }
  }

  async function scanQrImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setQrError("");
    try {
      if (!qrReaderRef.current) qrReaderRef.current = new BrowserQRCodeReader();
      const url = URL.createObjectURL(file);
      const res = await qrReaderRef.current.decodeFromImageUrl(url);
      URL.revokeObjectURL(url);
      const value = res?.getText();
      if (value) {
        setQrToken(value);
        setDetectedDirection(classifyQrToken(value));
        setQrScanStatus("QR detected from image");
      } else setQrError("Khong doc duoc QR.");
    } catch { setQrError("Khong doc duoc QR. Thu anh ro hon."); }
    finally { event.target.value = ""; }
  }

  // ==================== QR PLATE OCR ====================
  function stopQrPlateCamera() {
    qrPlateStreamRef.current?.getTracks().forEach((t) => t.stop());
    qrPlateStreamRef.current = null;
    setQrPlateCameraOn(false);
  }

  async function startQrPlateCamera() {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      qrPlateStreamRef.current = stream;
      if (qrPlateVideoRef.current) qrPlateVideoRef.current.srcObject = stream;
      setQrPlateCameraOn(true);
    } catch { /* ignore */ }
  }

  async function captureQrPlate() {
    const v = qrPlateVideoRef.current;
    if (!v || v.readyState < 2) return;
    const sw = v.videoWidth || 1280, sh = v.videoHeight || 720;
    const cw = Math.round(sw * 0.68), ch = Math.round(sh * 0.36);
    const cx = Math.round((sw - cw) / 2), cy = Math.round((sh - ch) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    canvas.getContext("2d").drawImage(v, cx, cy, cw, ch, 0, 0, cw, ch);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.92));
    if (blob) await uploadQrPlateOcr(blob, "qr-plate.jpg");
  }

  async function handleQrPlateFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadQrPlateOcr(file, file.name);
    e.target.value = "";
  }

  async function uploadQrPlateOcr(file, filename) {
    if (!gateId) return;
    const url = URL.createObjectURL(file);
    setQrEntryPlatePreview((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    setQrEntryOcrScanning(true);
    setQrEntryPlate("");
    setQrEntryOcrConfidence(null);
    try {
      const formData = new FormData();
      formData.append("image", file, filename);
      formData.append("gateId", gateId);
      formData.append("triggerType", "ENTRY");
      const response = await axiosClient.post("/ocr/scan-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const data = response.data?.data || {};
      const plate = data.effectivePlate || data.detectedPlate || "";
      const confidence = Math.round((data.plateConfidenceScore || 0) * 100);
      if (!plate || plate === "UNKNOWN") {
        setError("OCR khong doc duoc bien so. Thu lai.");
        return;
      }
      setQrEntryPlate(plate);
      setQrEntryOcrConfidence(confidence);
    } catch (err) {
      setError(err.response?.data?.message || "OCR scan that bai.");
    } finally {
      setQrEntryOcrScanning(false);
    }
  }

  // ==================== PROCESS ====================
  async function handleProcessOcr() {
    if (!lookupResult || !gateId) return;
    setProcessing(true);
    setError("");
    setResult(null);

    try {
      let res;
      if (lookupResult.type === "EXIT" && lookupResult.session) {
        res = await sessionApi.exit(lookupResult.session.sessionId, {
          gateId: Number(gateId),
          staffUserId: Number(localStorage.getItem("userId")) || null,
          qrVerified: false,
        });
      } else {
        res = await sessionApi.entry({
          gateId: Number(gateId),
          licensePlate: ocrPlate,
          entryMode: "WALK_IN_AUTO",
          staffUserId: Number(localStorage.getItem("userId")) || null,
        });
      }

      const payload = unwrapApiData(res.data, {});
      const type = lookupResult.type;
      const record = {
        id: `${type}-${Date.now()}`,
        type,
        sessionId: payload.sessionId,
        licensePlate: payload.licensePlate || ocrPlate,
        slotCode: payload.slotCode || "N/A",
        status: payload.status || (type === "EXIT" ? "WAITING_PAYMENT" : "ACTIVE"),
        time: (type === "EXIT" ? payload.exitTime : payload.entryTime) || new Date().toISOString(),
        entryTime: payload.entryTime,
        exitTime: payload.exitTime,
        fee: type === "EXIT" ? computeSessionFee(payload.entryTime, payload.exitTime) : null,
      };
      setResult(record);
      setHistory((prev) => [record, ...prev].slice(0, 10));
    } catch (err) {
      console.error("Process OCR failed", err);
      setError(err.response?.data?.message || "Xu ly that bai.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleProcessQr() {
    const token = qrToken.trim();
    if (!token || !gateId) return;
    const type = classifyQrToken(token);
    setProcessing(true);
    setError("");
    setResult(null);

    try {
      let res;
      if (type === "EXIT") {
        res = await sessionApi.exitByQr({
          qrToken: token,
          gateId: Number(gateId),
          staffUserId: Number(localStorage.getItem("userId")) || null,
        });
      } else {
        if (!qrEntryPlate.trim()) {
          setError("Nhap bien so xe de xac minh truoc khi xu ly Entry QR.");
          setProcessing(false);
          return;
        }
        res = await sessionApi.entry({
          gateId: Number(gateId),
          entryMode: "BOOKING",
          qrToken: token,
          licensePlate: qrEntryPlate.trim(),
          staffUserId: Number(localStorage.getItem("userId")) || null,
        });
      }
      const payload = unwrapApiData(res.data, {});
      const record = {
        id: `${type}-${Date.now()}`,
        type,
        sessionId: payload.sessionId,
        licensePlate: payload.licensePlate || "N/A",
        slotCode: payload.slotCode || "N/A",
        status: payload.status || (type === "EXIT" ? "WAITING_PAYMENT" : "ACTIVE"),
        time: (type === "EXIT" ? payload.exitTime : payload.entryTime) || new Date().toISOString(),
        entryTime: payload.entryTime,
        exitTime: payload.exitTime,
        fee: type === "EXIT" ? computeSessionFee(payload.entryTime, payload.exitTime) : null,
      };
      setResult(record);
      setHistory((prev) => [record, ...prev].slice(0, 10));
      setQrToken("");
    } catch (err) {
      console.error("QR process failed", err);
      setError(err.response?.data?.message || "QR khong hop le hoac da het han.");
    } finally {
      setProcessing(false);
    }
  }

  const qrTokenType = classifyQrToken(qrToken);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {/* Tab switcher */}
          <div className="flex gap-2 rounded-2xl border border-border bg-muted/30 p-1.5">
            <button type="button" onClick={() => { setMode("ocr"); stopQrCamera(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${mode === "ocr" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <ScanLine size={16} /> OCR Scan
            </button>
            <button type="button" onClick={() => { setMode("qr"); stopOcrCamera(); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${mode === "qr" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <QrCode size={16} /> QR Scan
            </button>
          </div>

          {/* ==================== OCR TAB ==================== */}
          {mode === "ocr" && (
            <StaffPageSection title="OCR Plate Scanner" subtitle="Chup hoac upload anh bien so — tu dong phan loai Entry / Exit">
              <div className="rounded-3xl bg-slate-950 p-4 text-white dark:bg-[#020617]">
                <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-slate-900 dark:bg-[#0f172a]">
                  <video ref={ocrVideoRef} autoPlay playsInline muted
                    className={`absolute inset-0 size-full object-cover ${ocrCameraOn ? "opacity-100" : "opacity-0"}`} />
                  {ocrCameraOn && (
                    <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-20 -translate-y-1/2 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />
                  )}
                  {ocrPreview && !ocrCameraOn && (
                    <img src={ocrPreview} alt="Plate preview" className="absolute inset-0 size-full object-contain opacity-60" />
                  )}
                  {ocrScanning ? (
                    <div className="relative z-10 space-y-3 text-center">
                      <div className="mx-auto size-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      <p className="text-sm text-emerald-300">Dang gui anh den OCR engine...</p>
                    </div>
                  ) : ocrPlate ? (
                    <div className="relative z-10 rounded-2xl border border-emerald-400/30 bg-slate-950/75 px-5 py-4 text-center shadow-xl">
                      <CheckCircle2 size={26} className="mx-auto text-emerald-300" />
                      <p className="mt-2 text-xs text-slate-300">Bien so</p>
                      <p className="mt-1 font-mono text-3xl font-bold tracking-wide text-white">{ocrPlate}</p>
                      {ocrConfidence != null && (
                        <p className="mt-1 text-xs text-slate-300">{ocrConfidence}% confidence</p>
                      )}
                    </div>
                  ) : (
                    <div className="relative z-10 space-y-3 text-center">
                      <Camera size={38} className="mx-auto text-white/30" />
                      <p className="text-sm text-white/60">{ocrCameraOn ? "Can chinh bien so vao khung" : "Mo camera hoac upload anh bien so"}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <StaffSecondaryButton type="button" onClick={ocrCameraOn ? stopOcrCamera : startOcrCamera} disabled={ocrScanning} className="flex items-center justify-center gap-2">
                  {ocrCameraOn ? <VideoOff size={15} /> : <Video size={15} />}
                  {ocrCameraOn ? "Stop" : "Camera"}
                </StaffSecondaryButton>
                <StaffPrimaryButton type="button" onClick={handleOcrCapture} disabled={ocrScanning || !ocrCameraOn} className="flex items-center justify-center gap-2">
                  <Camera size={15} /> Capture
                </StaffPrimaryButton>
                <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted ${ocrScanning ? "pointer-events-none opacity-60" : ""}`}>
                  <ImageUp size={15} /> Upload
                  <input type="file" accept="image/*" className="sr-only" onChange={handleOcrFileUpload} />
                </label>
                <StaffSecondaryButton type="button" onClick={resetOcr} disabled={ocrScanning} className="flex items-center justify-center gap-2">
                  <RefreshCw size={15} /> Reset
                </StaffSecondaryButton>
              </div>

              {ocrError && (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {ocrError}
                </div>
              )}

              {/* Lookup result & action */}
              {ocrPlate && !ocrScanning && (
                <div className="mt-4 space-y-4">
                  {lookupLoading ? (
                    <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
                      <Search size={16} className="inline mr-2 animate-pulse" /> Dang kiem tra bien so trong he thong...
                    </div>
                  ) : lookupResult ? (
                    <div className={`rounded-2xl border p-4 ${lookupResult.type === "EXIT" ? "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10" : "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex size-10 items-center justify-center rounded-full ${lookupResult.type === "EXIT" ? "bg-amber-100 dark:bg-amber-500/20" : "bg-blue-100 dark:bg-blue-500/20"}`}>
                          {lookupResult.type === "EXIT" ? <LogOut size={18} className="text-amber-600" /> : <LogIn size={18} className="text-blue-600" />}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">
                            {lookupResult.type === "EXIT" ? "EXIT — Xe dang trong bai" : "ENTRY — Xe chua vao bai"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lookupResult.type === "EXIT"
                              ? `Session #${lookupResult.session?.sessionId} • Slot ${lookupResult.session?.slotCode || "N/A"} • Vao luc ${formatStaffDateTime(lookupResult.session?.entryTime)}`
                              : `Bien ${ocrPlate} — san sang cho vao bai`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Gate select */}
                  <div className="grid gap-3 md:grid-cols-2">
                    {assignedId ? (
                      <div className="flex items-center rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-primary">{assignedBuildingLabel || `Building #${assignedId}`}</div>
                    ) : (
                      <StaffSelect value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                        <option value="">Chon toa nha</option>
                        {buildings.map((b) => (
                          <option key={b.buildingId || b.id} value={b.buildingId || b.id}>{b.name}</option>
                        ))}
                      </StaffSelect>
                    )}
                    <StaffSelect value={gateId} onChange={(e) => setGateId(e.target.value)}>
                      <option value="">Chon cong {detectedDirection ? `(${detectedDirection})` : ""}</option>
                      {filteredGates.map((g) => (
                        <option key={g.gateId || g.id} value={g.gateId || g.id}>
                          {g.gateName || g.gateCode || g.name || `Gate ${g.gateId || g.id}`} ({g.gateType})
                        </option>
                      ))}
                    </StaffSelect>
                  </div>

                  <StaffPrimaryButton type="button" onClick={handleProcessOcr}
                    disabled={processing || !lookupResult || !gateId}
                    className="flex w-full items-center justify-center gap-2">
                    {processing ? "Dang xu ly..." : lookupResult?.type === "EXIT" ? (
                      <><LogOut size={15} /> Xac nhan xe ra (Exit)</>
                    ) : (
                      <><LogIn size={15} /> Xac nhan xe vao (Entry)</>
                    )}
                  </StaffPrimaryButton>
                </div>
              )}
            </StaffPageSection>
          )}

          {/* ==================== QR TAB ==================== */}
          {mode === "qr" && (
            <StaffPageSection title="QR Scanner" subtitle="Scan ma QR — tu dong phan loai Entry QR (JWT) hoac Exit QR (PEX.)">
              <div className="relative aspect-video min-h-56 overflow-hidden rounded-2xl border border-border bg-slate-950">
                <video ref={qrVideoRef}
                  className={`h-full w-full object-contain ${qrCameraActive ? "opacity-100" : "opacity-0"}`}
                  muted playsInline />
                {!qrCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                    <QrCode size={38} className="mr-3 opacity-30" /> Camera QR preview
                  </div>
                )}
                {qrCameraActive && (
                  <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.22)]" />
                )}
                <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                  {qrScanStatus}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <StaffSecondaryButton type="button" onClick={qrCameraActive ? stopQrCamera : startQrCamera} className="flex items-center justify-center gap-2">
                  {qrCameraActive ? <StopCircle size={15} /> : <Camera size={15} />}
                  {qrCameraActive ? "Stop" : "Open Camera"}
                </StaffSecondaryButton>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted">
                  <QrCode size={15} /> Upload QR
                  <input type="file" accept="image/*" onChange={scanQrImage} className="hidden" />
                </label>
                <StaffSecondaryButton type="button" onClick={() => { setQrToken(""); setDetectedDirection(null); setResult(null); setError(""); }}
                  className="flex items-center justify-center gap-2">
                  <RefreshCw size={15} /> Reset
                </StaffSecondaryButton>
              </div>

              {qrError && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  {qrError}
                </div>
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <StaffInput value={qrToken}
                    onChange={(e) => { setQrToken(e.target.value); setDetectedDirection(classifyQrToken(e.target.value)); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleProcessQr(); } }}
                    placeholder="Scan hoac paste QR token" />
                  {qrTokenType && (
                    <div className={`mt-2 flex items-center gap-2 text-sm font-semibold ${qrTokenType === "EXIT" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>
                      {qrTokenType === "EXIT" ? <LogOut size={16} /> : <LogIn size={16} />}
                      Tu dong nhan dien: <span className="uppercase">{qrTokenType === "EXIT" ? "Exit QR" : "Entry QR"}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {qrTokenType === "EXIT" ? "(PEX. prefix)" : "(Booking JWT)"}
                      </span>
                    </div>
                  )}
                </div>

                {qrTokenType === "ENTRY" && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <p className="text-sm font-semibold text-foreground mb-2">Scan bien so xe xac minh</p>
                    <p className="text-xs text-muted-foreground mb-3">Chup bien so xe thuc te de xac nhan dung xe trong booking.</p>

                    <div className="rounded-2xl bg-slate-950 p-3">
                      <div className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-slate-900">
                        <video ref={qrPlateVideoRef} autoPlay playsInline muted
                          className={`absolute inset-0 size-full object-cover ${qrPlateCameraOn ? "opacity-100" : "opacity-0"}`} />
                        {qrPlateCameraOn && <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-14 -translate-y-1/2 rounded-lg border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />}
                        {qrEntryPlatePreview && !qrPlateCameraOn && <img src={qrEntryPlatePreview} alt="Plate" className="absolute inset-0 size-full object-contain opacity-60" />}
                        {qrEntryOcrScanning ? (
                          <div className="relative z-10 text-center">
                            <div className="mx-auto size-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                            <p className="mt-2 text-xs text-emerald-300">Dang nhan dien...</p>
                          </div>
                        ) : qrEntryPlate ? (
                          <div className="relative z-10 rounded-xl border border-emerald-400/30 bg-slate-950/75 px-4 py-3 text-center">
                            <CheckCircle2 size={20} className="mx-auto text-emerald-300" />
                            <p className="mt-1 font-mono text-xl font-bold text-white">{qrEntryPlate}</p>
                            {qrEntryOcrConfidence != null && <p className="text-[11px] text-slate-300">{qrEntryOcrConfidence}%</p>}
                          </div>
                        ) : (
                          <div className="relative z-10 text-center">
                            <Camera size={28} className="mx-auto text-white/30" />
                            <p className="mt-1 text-xs text-white/50">Chup bien so xe</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 grid-cols-4">
                      <StaffSecondaryButton type="button" onClick={qrPlateCameraOn ? stopQrPlateCamera : startQrPlateCamera} className="flex items-center justify-center gap-1.5 text-xs">
                        {qrPlateCameraOn ? <VideoOff size={13} /> : <Video size={13} />} {qrPlateCameraOn ? "Stop" : "Camera"}
                      </StaffSecondaryButton>
                      <StaffPrimaryButton type="button" onClick={captureQrPlate} disabled={!qrPlateCameraOn || qrEntryOcrScanning} className="flex items-center justify-center gap-1.5 text-xs">
                        <Camera size={13} /> Chup
                      </StaffPrimaryButton>
                      <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted">
                        <ImageUp size={13} /> Upload
                        <input type="file" accept="image/*" className="sr-only" onChange={handleQrPlateFile} />
                      </label>
                      <StaffSecondaryButton type="button" onClick={() => { setQrEntryPlate(""); setQrEntryPlatePreview((p) => { if (p) URL.revokeObjectURL(p); return ""; }); setQrEntryOcrConfidence(null); stopQrPlateCamera(); }} className="flex items-center justify-center gap-1.5 text-xs">
                        <RefreshCw size={13} /> Reset
                      </StaffSecondaryButton>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  <StaffSelect value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                    <option value="">Chon toa nha</option>
                    {buildings.map((b) => (
                      <option key={b.buildingId || b.id} value={b.buildingId || b.id}>{b.name}</option>
                    ))}
                  </StaffSelect>
                  <StaffSelect value={gateId} onChange={(e) => setGateId(e.target.value)}>
                    <option value="">Chon cong {qrTokenType ? `(${qrTokenType})` : ""}</option>
                    {filteredGates.map((g) => (
                      <option key={g.gateId || g.id} value={g.gateId || g.id}>
                        {g.gateName || g.gateCode || g.name || `Gate ${g.gateId || g.id}`} ({g.gateType})
                      </option>
                    ))}
                  </StaffSelect>
                </div>

                <StaffPrimaryButton type="button" onClick={handleProcessQr}
                  disabled={processing || !qrToken.trim() || !gateId || (qrTokenType === "ENTRY" && !qrEntryPlate.trim())}
                  className="flex w-full items-center justify-center gap-2">
                  {processing ? "Dang xu ly..." : qrTokenType === "EXIT" ? (
                    <><LogOut size={15} /> Xu ly Exit QR</>
                  ) : qrTokenType === "ENTRY" ? (
                    <><LogIn size={15} /> Xu ly Entry QR + Xac minh bien</>
                  ) : (
                    <><QrCode size={15} /> Scan QR de xu ly</>
                  )}
                </StaffPrimaryButton>
              </div>
            </StaffPageSection>
          )}

          {/* ==================== RESULT ==================== */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                  <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-300" />
                </div>
                <div>
                  <p className="font-bold text-foreground">
                    {result.type === "EXIT" ? "Xe da ra — cho thanh toan" : "Xe da vao bai"}
                  </p>
                  <p className="text-sm text-muted-foreground">Session #{result.sessionId}</p>
                </div>
                <StaffStatusBadge tone={result.type === "EXIT" ? "amber" : "emerald"} className="ml-auto">
                  {result.status.toLowerCase().replace("_", " ")}
                </StaffStatusBadge>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  ["Bien so", result.licensePlate],
                  ["Slot", result.slotCode],
                  ["Thoi gian", formatStaffDateTime(result.time)],
                  result.fee != null ? ["Phi", formatStaffCurrency(result.fee)] : null,
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-xl bg-white/60 dark:bg-white/5 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              {result.type === "EXIT" && (
                <StaffSecondaryButton type="button" onClick={() => navigate("/staff/payments")} className="mt-4 flex w-full items-center justify-center gap-2">
                  <CreditCard size={15} /> Mo trang thanh toan
                </StaffSecondaryButton>
              )}
            </div>
          )}
        </div>

        {/* ==================== HISTORY ==================== */}
        <StaffPageSection title="Lich su scan" subtitle="Cac lan scan gan day trong phien lam viec nay">
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Chua co lan scan nao. Scan bien so hoac QR de bat dau.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 items-center justify-center rounded-2xl ${item.type === "EXIT" ? "bg-amber-100 dark:bg-amber-500/15" : "bg-blue-100 dark:bg-blue-500/15"}`}>
                        {item.type === "EXIT"
                          ? <LogOut size={16} className="text-amber-600 dark:text-amber-300" />
                          : <LogIn size={16} className="text-blue-600 dark:text-blue-300" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {item.type === "EXIT" ? "Exit" : "Entry"} — {item.licensePlate}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Session #{item.sessionId} • Slot {item.slotCode}
                        </p>
                      </div>
                    </div>
                    <StaffStatusBadge tone={item.type === "EXIT" ? "amber" : "emerald"}>
                      {item.type.toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatStaffDateTime(item.time)}</span>
                    {item.fee != null && <span className="font-medium text-foreground">{formatStaffCurrency(item.fee)}</span>}
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

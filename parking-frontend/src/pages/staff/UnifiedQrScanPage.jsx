import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  AlertTriangle, Camera, CheckCircle2, CreditCard, ImageUp, LogIn, LogOut,
  QrCode, RefreshCw, Search, ScanLine, StopCircle, Video, VideoOff, X, XCircle,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { buildingApi } from "../../api/manager/buildingApi";
import { gateApi } from "../../api/manager/gateApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { computeSessionFee, formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import { getAssignedBuildingId, getAssignedBuildingName } from "../../utils/auth";
import {
  StaffInput, StaffPageSection, StaffPrimaryButton, StaffSecondaryButton,
  StaffSelect, StaffStatusBadge,
} from "./StaffUi";

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

  // Lookup
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupType, setLookupType] = useState(null);
  // "EXIT" | "BOOKING" | "WALKIN" | "UNREGISTERED" | "BLOCKED"
  const [lookupData, setLookupData] = useState(null);

  // QR (for booking entry + exit)
  const [qrToken, setQrToken] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const qrVideoRef = useRef(null);
  const qrReaderRef = useRef(null);
  const qrControlsRef = useRef(null);
  const [qrCameraOn, setQrCameraOn] = useState(false);

  // Gate
  const [buildingId, setBuildingId] = useState(assignedId || "");
  const [buildings, setBuildings] = useState([]);
  const [gates, setGates] = useState([]);
  const [gateId, setGateId] = useState("");

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

  useEffect(() => { loadBuildings(); return () => stopCamera(); }, []);

  useEffect(() => {
    if (!buildingId) return;
    let c = false;
    (async () => {
      try {
        const res = await gateApi.getActiveByBuilding(buildingId);
        if (!c) { const g = unwrapApiData(res.data, []); setGates(g); setGateId(String(g[0]?.gateId || g[0]?.id || "")); }
      } catch { if (!c) setGates([]); }
    })();
    return () => { c = true; };
  }, [buildingId]);

  useEffect(() => {
    if (filteredGates.length && !filteredGates.find((g) => String(g.gateId || g.id) === gateId))
      setGateId(String(filteredGates[0]?.gateId || filteredGates[0]?.id || ""));
  }, [filteredGates]);

  async function loadBuildings() {
    try {
      const res = await buildingApi.getAll();
      const bs = unwrapApiData(res.data, []);
      setBuildings(bs);
      if (assignedId) setBuildingId(assignedId);
      else if (bs[0]) setBuildingId(String(bs[0].buildingId || bs[0].id));
    } catch {}
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
    } catch { setOcrError("Khong mo duoc camera."); }
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
    if (!gateId) { setOcrError("Chon cong truoc."); return; }
    const url = URL.createObjectURL(file);
    setPlatePreview((p) => { if (p) URL.revokeObjectURL(p); return url; });
    setScanning(true); setOcrError(""); setPlate(""); setConfidence(null);
    setLookupType(null); setLookupData(null); setQrToken(""); setError("");
    try {
      const fd = new FormData();
      fd.append("image", file, filename); fd.append("gateId", gateId); fd.append("triggerType", "ENTRY");
      const res = await axiosClient.post("/ocr/scan-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const d = res.data?.data || {};
      const p = d.effectivePlate || d.detectedPlate || "";
      const c = Math.round((d.plateConfidenceScore || 0) * 100);
      if (!p || p === "UNKNOWN") { setOcrError("OCR khong doc duoc. Thu lai."); return; }
      setPlate(p); setConfidence(c);
      await autoLookup(p);
      setStep(2);
    } catch (err) { setOcrError(err.response?.data?.message || "OCR that bai."); }
    finally { setScanning(false); }
  }

  // ==================== LOOKUP ====================
  async function autoLookup(p) {
    setLookupLoading(true);
    try {
      // Active session? → EXIT
      const sRes = await sessionApi.getSessions({ status: "ACTIVE", keyword: p });
      const sessions = unwrapApiData(sRes.data, []);
      const match = sessions.find((s) => String(s.licensePlate || "").toUpperCase() === p.toUpperCase());
      if (match) { setLookupType("EXIT"); setLookupData(match); return; }

      // Vehicle registered?
      let vehicle = null;
      try { vehicle = unwrapApiData((await axiosClient.get(`/vehicles/plate/${encodeURIComponent(p)}`)).data, null); } catch {}

      if (vehicle && vehicle.isActive === false) { setLookupType("BLOCKED"); setLookupData("Xe bi vo hieu hoa."); return; }

      // Has booking?
      if (vehicle) {
        try {
          const bRes = await axiosClient.get(`/bookings/search?licensePlate=${encodeURIComponent(p)}`);
          const bookings = unwrapApiData(bRes.data, []);
          const active = bookings.find((b) => ["CONFIRMED", "PENDING_PAYMENT"].includes(String(b.status || "").toUpperCase()));
          if (active) { setLookupType("BOOKING"); setLookupData(active); return; }
        } catch {}
      }

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

  function closeQrModal() { stopQrCamera(); setShowQrModal(false); }

  async function openQrModal() {
    setShowQrModal(true);
    setTimeout(async () => {
      try {
        if (!qrReaderRef.current) qrReaderRef.current = new BrowserQRCodeReader();
        setQrCameraOn(true);
        qrControlsRef.current = await qrReaderRef.current.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } },
          qrVideoRef.current,
          (res) => {
            const v = res?.getText();
            if (v) { setQrToken(v); closeQrModal(); }
          },
        );
      } catch { /* camera error */ }
    }, 100);
  }

  // ==================== PROCESS ====================
  async function handleProcess() {
    if (!gateId || !plate) return;
    setProcessing(true); setError("");
    try {
      let res;
      if (lookupType === "EXIT") {
        if (qrToken.trim()) {
          res = await sessionApi.exitByQr({ qrToken: qrToken.trim(), gateId: Number(gateId), licensePlate: plate, staffUserId: Number(localStorage.getItem("userId")) || null });
        } else {
          res = await sessionApi.exit(lookupData.sessionId, { gateId: Number(gateId), staffUserId: Number(localStorage.getItem("userId")) || null, qrVerified: false });
        }
      } else if (lookupType === "BOOKING" && qrToken.trim()) {
        res = await sessionApi.entry({ gateId: Number(gateId), entryMode: "BOOKING", qrToken: qrToken.trim(), licensePlate: plate, staffUserId: Number(localStorage.getItem("userId")) || null });
      } else {
        res = await sessionApi.entry({ gateId: Number(gateId), licensePlate: plate, entryMode: "WALK_IN_AUTO", staffUserId: Number(localStorage.getItem("userId")) || null });
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
    } catch (err) { setError(err.response?.data?.message || "Xu ly that bai."); }
    finally { setProcessing(false); }
  }

  function resetAll() {
    stopCamera(); setStep(1); setPlate(""); setConfidence(null); setOcrError("");
    setPlatePreview((p) => { if (p) URL.revokeObjectURL(p); return ""; });
    setLookupType(null); setLookupData(null); setQrToken(""); setError(""); setResult(null);
  }

  // Step indicator
  const steps = ["Scan bien so", "Xac minh", "Hoan tat"];

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
            <StaffPageSection title="Scan bien so xe" subtitle="Chup hoac upload anh bien so — bat buoc cho moi luong">
              {/* Gate select */}
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                {assignedId ? (
                  <div className="flex items-center rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-primary">{assignedLabel || `Building #${assignedId}`}</div>
                ) : (
                  <StaffSelect value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                    <option value="">Chon toa nha</option>
                    {buildings.map((b) => <option key={b.buildingId || b.id} value={b.buildingId || b.id}>{b.name}</option>)}
                  </StaffSelect>
                )}
                <StaffSelect value={gateId} onChange={(e) => setGateId(e.target.value)}>
                  <option value="">Chon cong</option>
                  {gates.map((g) => <option key={g.gateId || g.id} value={g.gateId || g.id}>{g.gateName || g.gateCode || `Gate ${g.gateId || g.id}`} ({g.gateType})</option>)}
                </StaffSelect>
              </div>

              {/* Camera */}
              <div className="rounded-3xl bg-slate-950 p-4 text-white dark:bg-[#020617]">
                <div className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-slate-900 dark:bg-[#0f172a]">
                  <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 size-full object-cover ${cameraOn ? "opacity-100" : "opacity-0"}`} />
                  {cameraOn && <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-20 -translate-y-1/2 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />}
                  {platePreview && !cameraOn && <img src={platePreview} alt="Plate" className="absolute inset-0 size-full object-contain opacity-60" />}
                  {scanning ? (
                    <div className="relative z-10 space-y-3 text-center">
                      <div className="mx-auto size-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      <p className="text-sm text-emerald-300">Dang nhan dien...</p>
                    </div>
                  ) : (
                    <div className="relative z-10 space-y-3 text-center">
                      <Camera size={38} className="mx-auto text-white/30" />
                      <p className="text-sm text-white/60">{cameraOn ? "Can chinh bien so vao khung" : "Mo camera hoac upload anh"}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <StaffSecondaryButton type="button" onClick={cameraOn ? stopCamera : startCamera} disabled={scanning} className="flex items-center justify-center gap-2">
                  {cameraOn ? <VideoOff size={15} /> : <Video size={15} />} {cameraOn ? "Stop" : "Camera"}
                </StaffSecondaryButton>
                <StaffPrimaryButton type="button" onClick={handleCapture} disabled={scanning || !cameraOn} className="flex items-center justify-center gap-2">
                  <Camera size={15} /> Chup
                </StaffPrimaryButton>
                <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted ${scanning ? "pointer-events-none opacity-60" : ""}`}>
                  <ImageUp size={15} /> Upload
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
                </label>
                <StaffSecondaryButton type="button" onClick={resetAll} disabled={scanning} className="flex items-center justify-center gap-2">
                  <RefreshCw size={15} /> Reset
                </StaffSecondaryButton>
              </div>

              {ocrError && (
                <div className="mt-3 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <p>{ocrError}</p>
                </div>
              )}
            </StaffPageSection>
          )}

          {/* ==================== STEP 2: DETECT + QR ==================== */}
          {step === 2 && (
            <StaffPageSection title="Ket qua xac minh" subtitle="He thong tu dong phan loai — scan QR neu can">
              {/* Plate result */}
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4">
                {platePreview && <img src={platePreview} alt="Plate" className="h-16 w-24 rounded-xl border border-border object-contain bg-slate-950" />}
                <div>
                  <p className="font-mono text-2xl font-bold text-foreground">{plate}</p>
                  {confidence != null && <p className={`text-xs ${confidence >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{confidence}% confidence</p>}
                </div>
                <StaffSecondaryButton type="button" onClick={() => { setStep(1); setLookupType(null); }} className="ml-auto text-xs">
                  Scan lai
                </StaffSecondaryButton>
              </div>

              {lookupLoading && (
                <div className="rounded-2xl border border-border bg-muted/20 px-4 py-4 text-center text-sm text-muted-foreground">
                  <Search size={16} className="inline mr-2 animate-pulse" /> Dang kiem tra...
                </div>
              )}

              {!lookupLoading && lookupType && (
                <div className="space-y-4">
                  {/* Status card */}
                  {lookupType === "EXIT" && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                      <div className="flex items-center gap-3">
                        <LogOut size={20} className="text-amber-600" />
                        <div>
                          <p className="font-bold text-foreground">EXIT — Xe dang trong bai</p>
                          <p className="text-sm text-muted-foreground">Session #{lookupData?.sessionId} • Slot {lookupData?.slotCode} • Vao {formatStaffDateTime(lookupData?.entryTime)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {lookupType === "BOOKING" && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                      <div className="flex items-center gap-3">
                        <QrCode size={20} className="text-blue-600" />
                        <div>
                          <p className="font-bold text-foreground">BOOKING — Xe co booking, can QR</p>
                          <p className="text-sm text-muted-foreground">Booking #{lookupData?.bookingId} • Slot {lookupData?.slotCode} • {String(lookupData?.status || "")}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {lookupType === "WALKIN" && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <div className="flex items-center gap-3">
                        <LogIn size={20} className="text-emerald-600" />
                        <p className="font-bold text-foreground">WALK-IN — Xe da dang ky, cho vao truc tiep</p>
                      </div>
                    </div>
                  )}

                  {lookupType === "UNREGISTERED" && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={20} className="text-amber-600" />
                        <p className="font-bold text-foreground">WALK-IN — Xe chua dang ky (tu tao khi entry)</p>
                      </div>
                    </div>
                  )}

                  {lookupType === "BLOCKED" && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                      <div className="flex items-center gap-3">
                        <XCircle size={20} className="text-rose-600" />
                        <p className="font-bold text-foreground">BLOCKED — {lookupData}</p>
                      </div>
                    </div>
                  )}

                  {/* QR input — for BOOKING entry + EXIT with QR */}
                  {(lookupType === "BOOKING" || lookupType === "EXIT") && (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                      <p className="text-sm font-semibold text-foreground mb-2">
                        {lookupType === "BOOKING" ? "Scan QR booking cua driver (bat buoc)" : "Exit QR cua driver (neu co)"}
                      </p>
                      <div className="flex gap-2">
                        <StaffInput value={qrToken} onChange={(e) => setQrToken(e.target.value)}
                          placeholder="Paste QR token" className="flex-1" />
                        <StaffPrimaryButton type="button" onClick={openQrModal} className="flex items-center gap-2 shrink-0">
                          <QrCode size={15} /> Scan QR
                        </StaffPrimaryButton>
                      </div>
                      {qrToken && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                          <CheckCircle2 size={14} /> QR da nhan
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gate select */}
                  {lookupType !== "BLOCKED" && (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        {assignedId ? (
                          <div className="flex items-center rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-semibold text-primary">{assignedLabel}</div>
                        ) : (
                          <StaffSelect value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                            <option value="">Chon toa nha</option>
                            {buildings.map((b) => <option key={b.buildingId || b.id} value={b.buildingId || b.id}>{b.name}</option>)}
                          </StaffSelect>
                        )}
                        <StaffSelect value={gateId} onChange={(e) => setGateId(e.target.value)}>
                          <option value="">Chon cong ({lookupType === "EXIT" ? "EXIT" : "ENTRY"})</option>
                          {filteredGates.map((g) => <option key={g.gateId || g.id} value={g.gateId || g.id}>{g.gateName || g.gateCode || `Gate ${g.gateId || g.id}`} ({g.gateType})</option>)}
                        </StaffSelect>
                      </div>

                      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}

                      <StaffPrimaryButton type="button" onClick={handleProcess}
                        disabled={processing || !gateId || (lookupType === "BOOKING" && !qrToken.trim())}
                        className="flex w-full items-center justify-center gap-2">
                        {processing ? "Dang xu ly..." : lookupType === "EXIT" ? (
                          <><LogOut size={15} /> Xac nhan xe ra</>
                        ) : (
                          <><LogIn size={15} /> Xac nhan xe vao</>
                        )}
                      </StaffPrimaryButton>
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
              <h3 className="text-lg font-bold text-foreground">{result.type === "EXIT" ? "Xe da ra bai" : "Xe da vao bai"}</h3>
              {platePreview && <img src={platePreview} alt="Plate" className="mx-auto mt-3 max-h-20 rounded-xl border border-border object-contain bg-slate-950" />}
              <div className="mt-4 space-y-2 rounded-2xl bg-white/60 dark:bg-white/5 p-4 text-left">
                {[["Session", result.sessionId], ["Bien so", result.licensePlate], ["Slot", result.slotCode], ["Trang thai", result.status], ["Thoi gian", formatStaffDateTime(result.time)]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{k}</span><span className="font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <StaffPrimaryButton type="button" onClick={resetAll} className="flex-1">Xe tiep theo</StaffPrimaryButton>
                {result.type === "EXIT" && (
                  <StaffSecondaryButton type="button" onClick={() => navigate("/staff/payments")} className="flex-1 flex items-center justify-center gap-2">
                    <CreditCard size={14} /> Thanh toan
                  </StaffSecondaryButton>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ==================== HISTORY ==================== */}
        <StaffPageSection title="Lich su scan" subtitle="Cac lan xu ly gan day">
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Chua co lan scan nao.
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
                    <StaffStatusBadge tone={item.type === "EXIT" ? "amber" : "emerald"}>{item.type.toLowerCase()}</StaffStatusBadge>
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
                <QrCode size={20} /> Scan QR Code
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
                {qrCameraOn ? "Dua QR vao khung..." : "Dang mo camera..."}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Dua ma QR cua driver vao khung. Tu dong nhan dien.</p>
          </div>
        </div>
      )}
    </div>
  );
}

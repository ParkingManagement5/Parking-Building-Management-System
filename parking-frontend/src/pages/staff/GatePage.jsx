import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  CreditCard,
  ImageUp,
  LogIn,
  LogOut,
  QrCode,
  Search,
  ShieldAlert,
  RefreshCw,
  Video,
  VideoOff,
  XCircle,
} from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { exceptionApi } from "../../api/staff/exceptionApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { buildingApi } from "../../api/manager/buildingApi";
import { gateApi } from "../../api/manager/gateApi";
import { floorApi } from "../../api/manager/floorApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { pricingPolicyApi } from "../../api/manager/pricingPolicyApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import {
  computeSessionFee,
  formatStaffCurrency,
  formatStaffDateTime,
} from "./staffPortalState";
import { getAssignedBuildingId, getAssignedBuildingName } from "../../utils/auth";
import {
  StaffEmptyState,
  StaffField,
  StaffInput,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffSelect,
  StaffStatusBadge,
} from "./StaffUi";

function getBuildingId(b) { return b?.buildingId || b?.id || ""; }
function getVehicleTypeId(v) { return v?.vehicleTypeId ?? v?.id ?? ""; }

const SLOT_COLORS = {
  AVAILABLE: "bg-emerald-400/80 hover:bg-emerald-400 text-emerald-950",
  OCCUPIED: "bg-rose-400/80 hover:bg-rose-400 text-rose-950",
  RESERVED: "bg-amber-400/80 hover:bg-amber-400 text-amber-950",
  MAINTENANCE: "bg-slate-400/60 text-slate-600 cursor-not-allowed",
};

const SLOT_LABELS = {
  AVAILABLE: "Trong",
  OCCUPIED: "Co xe",
  RESERVED: "Da dat",
  MAINTENANCE: "Bao tri",
};

// ==================== PARKING MAP COMPONENT ====================
function ParkingMap({ buildingId, onRefresh }) {
  const [floors, setFloors] = useState([]);
  const [zonesMap, setZonesMap] = useState({});
  const [slotsMap, setSlotsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);

  useEffect(() => {
    if (buildingId) loadFloors();
  }, [buildingId]);

  useEffect(() => {
    if (selectedFloor) loadZonesAndSlots(selectedFloor);
  }, [selectedFloor]);

  async function loadFloors() {
    setLoading(true);
    try {
      const res = await floorApi.getByBuilding(buildingId);
      const items = unwrapApiData(res.data, []);
      setFloors(items);
      if (items.length > 0) setSelectedFloor(items[0].floorId || items[0].id);
    } catch (err) { console.error("Load floors failed", err); }
    finally { setLoading(false); }
  }

  async function loadZonesAndSlots(floorId) {
    setLoading(true);
    try {
      const zRes = await zoneApi.getByFloor(floorId);
      const zones = unwrapApiData(zRes.data, []);
      setZonesMap((prev) => ({ ...prev, [floorId]: zones }));

      const slotResults = {};
      await Promise.all(zones.map(async (z) => {
        const zid = z.zoneId || z.id;
        const sRes = await parkingSlotApi.getByZone(zid);
        slotResults[zid] = unwrapApiData(sRes.data, []);
      }));
      setSlotsMap((prev) => ({ ...prev, ...slotResults }));
    } catch (err) { console.error("Load zones/slots failed", err); }
    finally { setLoading(false); }
  }

  function refreshMap() {
    if (selectedFloor) loadZonesAndSlots(selectedFloor);
    onRefresh?.();
  }

  const currentZones = zonesMap[selectedFloor] || [];
  const currentFloor = floors.find((f) => (f.floorId || f.id) === selectedFloor);

  // Stats
  const allSlots = currentZones.flatMap((z) => slotsMap[z.zoneId || z.id] || []);
  const stats = {
    total: allSlots.length,
    available: allSlots.filter((s) => s.status === "AVAILABLE").length,
    occupied: allSlots.filter((s) => s.status === "OCCUPIED").length,
    reserved: allSlots.filter((s) => s.status === "RESERVED").length,
  };

  return (
    <div className="space-y-4">
      {/* Floor tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {floors.map((f) => {
            const fid = f.floorId || f.id;
            return (
              <button key={fid} type="button" onClick={() => setSelectedFloor(fid)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${selectedFloor === fid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {f.floorName || f.name || `Tang ${f.floorNumber}`}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={refreshMap} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition" title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-400" /> Trong: {stats.available}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-400" /> Co xe: {stats.occupied}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-amber-400" /> Da dat: {stats.reserved}</span>
          <span className="ml-auto font-semibold text-foreground">{stats.available}/{stats.total} trong</span>
        </div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Dang tai...</p>}

      {/* Zone grids */}
      {currentZones.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">Khong co zone nao cho tang nay.</p>
      )}

      {currentZones.map((zone) => {
        const zid = zone.zoneId || zone.id;
        const slots = (slotsMap[zid] || []).sort((a, b) => (a.slotCode || "").localeCompare(b.slotCode || ""));
        return (
          <div key={zid} className="rounded-2xl border border-border bg-muted/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">{zone.zoneName || zone.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {slots.filter((s) => s.status === "AVAILABLE").length}/{slots.length} trong
              </p>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {slots.map((slot) => {
                const status = String(slot.status || "AVAILABLE").toUpperCase();
                const code = (slot.slotCode || "").split("-").pop() || slot.slotCode;
                return (
                  <div key={slot.id || slot.slotId} title={`${slot.slotCode} — ${SLOT_LABELS[status] || status}`}
                    className={`flex items-center justify-center rounded-lg py-2 text-[11px] font-bold transition-colors ${SLOT_COLORS[status] || SLOT_COLORS.AVAILABLE}`}>
                    {code}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== MAIN COMPONENT ====================
export default function GatePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("entry");

  // --- Shared ---
  const assignedId = getAssignedBuildingId();
  const assignedName = getAssignedBuildingName();
  const [buildings, setBuildings] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [buildingId, setBuildingId] = useState(assignedId || "");
  const [entryGates, setEntryGates] = useState([]);
  const [exitGates, setExitGates] = useState([]);
  const [entryGateId, setEntryGateId] = useState("");
  const [exitGateId, setExitGateId] = useState("");

  // --- Entry ---
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({ licensePlate: "", vehicleTypeId: "", qrCode: "" });
  const [lookup, setLookup] = useState({ loading: false, error: "", notice: "", vehicle: null });
  const [entryStep, setEntryStep] = useState(1);
  const [confirmedEntry, setConfirmedEntry] = useState(null);

  // --- Exit ---
  const exitVideoRef = useRef(null);
  const exitStreamRef = useRef(null);
  const [exitCameraOn, setExitCameraOn] = useState(false);
  const [exitOcrScanning, setExitOcrScanning] = useState(false);
  const [exitOcrPlate, setExitOcrPlate] = useState("");
  const [exitOcrConfidence, setExitOcrConfidence] = useState(null);
  const [exitOcrPreview, setExitOcrPreview] = useState("");
  const [exitOcrError, setExitOcrError] = useState("");
  const [exitMatchedSession, setExitMatchedSession] = useState(null);
  const [exitPlateVerified, setExitPlateVerified] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [waitingPayments, setWaitingPayments] = useState([]);
  const [pricingPolicies, setPricingPolicies] = useState([]);
  const [exitProcessing, setExitProcessing] = useState(false);
  const [exitError, setExitError] = useState("");
  const [confirmedExit, setConfirmedExit] = useState(null);
  const [exitLoading, setExitLoading] = useState(false);

  // --- Map refresh key ---
  const [mapKey, setMapKey] = useState(0);

  const selectedBuilding = useMemo(() => buildings.find((b) => String(getBuildingId(b)) === buildingId), [buildings, buildingId]);
  const selectedEntryGate = useMemo(() => entryGates.find((g) => String(g.gateId || g.id) === entryGateId), [entryGates, entryGateId]);

  useEffect(() => { void loadInitial(); }, []);

  useEffect(() => {
    if (!buildingId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await gateApi.getActiveByBuilding(buildingId);
        if (cancelled) return;
        const gates = unwrapApiData(res.data, []);
        const eg = gates.filter((g) => ["ENTRY", "BOTH"].includes(String(g.gateType || "").toUpperCase()));
        const xg = gates.filter((g) => ["EXIT", "BOTH"].includes(String(g.gateType || "").toUpperCase()));
        setEntryGates(eg); setExitGates(xg);
        setEntryGateId(String(eg[0]?.gateId || eg[0]?.id || ""));
        setExitGateId(String(xg[0]?.gateId || xg[0]?.id || ""));
      } catch { if (!cancelled) { setEntryGates([]); setExitGates([]); } }
    })();
    return () => { cancelled = true; };
  }, [buildingId]);

  async function loadInitial() {
    try {
      const [bRes, vtRes, pRes] = await Promise.all([buildingApi.getAll(), vehicleTypeApi.getAll(), pricingPolicyApi.getAll()]);
      const bs = unwrapApiData(bRes.data, []);
      const vts = unwrapApiData(vtRes.data, []);
      setBuildings(bs); setVehicleTypes(vts); setPricingPolicies(unwrapApiData(pRes.data, []));
      if (assignedId) setBuildingId(assignedId);
      else if (bs[0]) setBuildingId(String(getBuildingId(bs[0])));
      if (vts[0]) setEntryForm((p) => ({ ...p, vehicleTypeId: String(getVehicleTypeId(vts[0])) }));
    } catch (err) { console.error("Load failed", err); }
    await loadSessions();
  }

  async function loadSessions() {
    setExitLoading(true);
    try {
      const [aRes, wRes] = await Promise.all([
        sessionApi.getSessions({ status: "ACTIVE" }),
        sessionApi.getSessions({ status: "WAITING_PAYMENT" }),
      ]);
      setActiveSessions(unwrapApiData(aRes.data, []));
      setWaitingPayments(unwrapApiData(wRes.data, []));
    } catch (err) { console.error("Load sessions failed", err); }
    finally { setExitLoading(false); }
  }

  // ==================== ENTRY ====================
  const normalizedPlate = entryForm.licensePlate.trim().toUpperCase();

  function handleEntryChange(e) {
    const { name, value } = e.target;
    setEntryForm((p) => ({ ...p, [name]: value }));
  }

  async function handleLookup(e) {
    e?.preventDefault?.();
    if (entryForm.qrCode.trim()) return handleQrEntry();
    if (!normalizedPlate) { setLookup({ loading: false, error: "Nhap bien so xe.", notice: "", vehicle: null }); return; }
    setLookup({ loading: true, error: "", notice: "", vehicle: null });
    try {
      const res = await axiosClient.get(`/vehicles/plate/${encodeURIComponent(normalizedPlate)}`);
      setLookup({ loading: false, error: "", notice: "", vehicle: unwrapApiData(res.data, null) });
      setEntryStep(2);
    } catch {
      setLookup({ loading: false, error: `Bien ${normalizedPlate} chua dang ky. Dung Walk-in hoac mo Exception.`, notice: "", vehicle: null });
    }
  }

  async function handleConfirmEntry() {
    if (!lookup.vehicle || !selectedEntryGate || !selectedBuilding) return;
    setLookup((p) => ({ ...p, loading: true, error: "" }));
    try {
      const res = await sessionApi.entry({
        gateId: Number(entryGateId), licensePlate: normalizedPlate,
        entryMode: "WALK_IN_AUTO",
        vehicleTypeId: entryForm.vehicleTypeId ? Number(entryForm.vehicleTypeId) : null,
        staffUserId: Number(localStorage.getItem("userId")) || null,
      });
      const p = unwrapApiData(res.data, null);
      setConfirmedEntry({ sessionId: p?.sessionId, licensePlate: p?.licensePlate || normalizedPlate, slotCode: p?.slotCode, gateName: p?.entryGateCode || selectedEntryGate.gateCode, buildingName: selectedBuilding.name, entryTime: p?.entryTime || new Date().toISOString() });
      setLookup({ loading: false, error: "", notice: "", vehicle: null }); setEntryStep(3);
      await loadSessions(); setMapKey((k) => k + 1);
    } catch (err) {
      setLookup({ loading: false, error: err.response?.data?.message || "Khong tao duoc session.", notice: "", vehicle: lookup.vehicle });
    }
  }

  async function handleDirectWalkIn() {
    if (!normalizedPlate || !selectedEntryGate || !selectedBuilding || !entryForm.vehicleTypeId) {
      setLookup({ loading: false, error: "Nhap bien so, chon toa nha, cong va loai xe.", notice: "", vehicle: null }); return;
    }
    setLookup((p) => ({ ...p, loading: true, error: "" }));
    try {
      const res = await sessionApi.entry({
        gateId: Number(entryGateId), licensePlate: normalizedPlate, entryMode: "WALK_IN_AUTO",
        vehicleTypeId: Number(entryForm.vehicleTypeId),
        staffUserId: Number(localStorage.getItem("userId")) || null,
      });
      const p = unwrapApiData(res.data, null);
      setConfirmedEntry({ sessionId: p?.sessionId, licensePlate: p?.licensePlate || normalizedPlate, slotCode: p?.slotCode, gateName: p?.entryGateCode || selectedEntryGate.gateCode, buildingName: selectedBuilding.name, entryTime: p?.entryTime || new Date().toISOString() });
      setLookup({ loading: false, error: "", notice: "", vehicle: null }); setEntryStep(3);
      await loadSessions(); setMapKey((k) => k + 1);
    } catch (err) {
      setLookup({ loading: false, error: err.response?.data?.message || "Walk-in that bai.", notice: "", vehicle: null });
    }
  }

  async function handleQrEntry() {
    if (!entryForm.qrCode.trim()) return;
    if (!entryForm.licensePlate.trim()) { setLookup({ loading: false, error: "Nhap bien so xe de xac minh truoc khi xu ly QR.", notice: "", vehicle: null }); return; }
    if (!selectedEntryGate) { setLookup({ loading: false, error: "Chon cong vao.", notice: "", vehicle: null }); return; }
    setLookup((p) => ({ ...p, loading: true, error: "" }));
    try {
      const res = await sessionApi.entry({
        gateId: Number(entryGateId), entryMode: "BOOKING", qrToken: entryForm.qrCode.trim(),
        licensePlate: entryForm.licensePlate.trim(),
        staffUserId: Number(localStorage.getItem("userId")) || null,
      });
      const p = unwrapApiData(res.data, null);
      setConfirmedEntry({ sessionId: p?.sessionId, licensePlate: p?.licensePlate || "Booking QR", slotCode: p?.slotCode, gateName: p?.entryGateCode || selectedEntryGate.gateCode, buildingName: selectedBuilding?.name, entryTime: p?.entryTime || new Date().toISOString() });
      setLookup({ loading: false, error: "", notice: "", vehicle: null }); setEntryStep(3);
      await loadSessions(); setMapKey((k) => k + 1);
    } catch (err) {
      setLookup({ loading: false, error: err.response?.data?.message || "QR khong hop le.", notice: "", vehicle: null });
    }
  }

  async function handleCreateException() {
    if (!normalizedPlate) return;
    setLookup((p) => ({ ...p, loading: true, error: "" }));
    try {
      await exceptionApi.create({ exceptionType: "CANNOT_FIND_CAR", description: `Plate: ${normalizedPlate} | Gate: ${selectedEntryGate?.gateCode || entryGateId}` });
      setLookup({ loading: false, error: "", notice: `Da tao exception cho bien ${normalizedPlate}.`, vehicle: null });
    } catch (err) {
      setLookup({ loading: false, error: err.response?.data?.message || "Tao exception that bai.", notice: "", vehicle: null });
    }
  }

  function resetEntry() {
    setEntryStep(1); setLookup({ loading: false, error: "", notice: "", vehicle: null });
    setConfirmedEntry(null); setEntryForm((p) => ({ ...p, licensePlate: "", qrCode: "" }));
  }

  // ==================== EXIT ====================
  function stopExitCamera() {
    exitStreamRef.current?.getTracks().forEach((t) => t.stop());
    exitStreamRef.current = null;
    setExitCameraOn(false);
  }

  async function startExitCamera() {
    setExitOcrError("");
    if (!navigator.mediaDevices?.getUserMedia) { setExitOcrError("Camera khong kha dung."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      exitStreamRef.current = stream;
      if (exitVideoRef.current) exitVideoRef.current.srcObject = stream;
      setExitCameraOn(true);
    } catch { setExitOcrError("Khong mo duoc camera."); }
  }

  function captureExitBlob() {
    return new Promise((resolve, reject) => {
      const v = exitVideoRef.current;
      if (!v || v.readyState < 2) { reject(new Error("Camera chua san sang")); return; }
      const sw = v.videoWidth || 1280, sh = v.videoHeight || 720;
      const cw = Math.round(sw * 0.68), ch = Math.round(sh * 0.36);
      const cx = Math.round((sw - cw) / 2), cy = Math.round((sh - ch) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      canvas.getContext("2d").drawImage(v, cx, cy, cw, ch, 0, 0, cw, ch);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Capture that bai")), "image/jpeg", 0.92);
    });
  }

  async function handleExitCapture() {
    try { const blob = await captureExitBlob(); await uploadExitOcr(blob, "exit-plate.jpg"); }
    catch (err) { setExitOcrError(err.message); }
  }

  async function handleExitFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadExitOcr(file, file.name);
    e.target.value = "";
  }

  async function uploadExitOcr(file, filename) {
    if (!exitGateId) { setExitOcrError("Chon cong ra truoc."); return; }
    const url = URL.createObjectURL(file);
    setExitOcrPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
    setExitOcrScanning(true); setExitOcrError(""); setExitOcrPlate(""); setExitOcrConfidence(null);
    setExitMatchedSession(null); setExitPlateVerified(false); setExitError("");

    try {
      const formData = new FormData();
      formData.append("image", file, filename);
      formData.append("gateId", exitGateId);
      formData.append("triggerType", "EXIT");
      const response = await axiosClient.post("/ocr/scan-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const data = response.data?.data || {};
      const plate = data.effectivePlate || data.detectedPlate || "";
      const confidence = Math.round((data.plateConfidenceScore || 0) * 100);

      if (!plate || plate === "UNKNOWN") {
        setExitOcrError("OCR khong doc duoc bien so. Thu lai hoac nhap tay search.");
        return;
      }

      setExitOcrPlate(plate);
      setExitOcrConfidence(confidence);

      const sessRes = await sessionApi.getSessions({ status: "ACTIVE", keyword: plate });
      const sessions = unwrapApiData(sessRes.data, []);
      const match = sessions.find((s) => String(s.licensePlate || "").toUpperCase() === plate.toUpperCase());

      if (match) {
        setExitMatchedSession(match);
        setExitPlateVerified(true);
      } else {
        setExitOcrError(`Bien ${plate} khong co session ACTIVE nao trong bai.`);
      }
    } catch (err) {
      setExitOcrError(err.response?.data?.message || "OCR scan that bai.");
    } finally {
      setExitOcrScanning(false);
    }
  }

  function resolveHourlyRate(session) {
    const p = pricingPolicies.find((pp) => pp.isActive && pp.vehicleTypeId === session?.vehicleTypeId);
    return Number(p?.pricePerHour ?? 20000);
  }

  const exitFee = exitMatchedSession ? computeSessionFee(exitMatchedSession.entryTime, new Date(), resolveHourlyRate(exitMatchedSession)) : 0;
  const canConfirmExit = exitPlateVerified && exitOcrPreview && exitMatchedSession && exitGateId;

  async function handleConfirmExit() {
    if (!exitMatchedSession || !exitGateId) return;
    setExitProcessing(true); setExitError("");
    try {
      const res = await sessionApi.exit(exitMatchedSession.sessionId, { gateId: Number(exitGateId), staffUserId: Number(localStorage.getItem("userId")) || null, qrVerified: false });
      const p = unwrapApiData(res.data, null);
      setConfirmedExit({ ...p, amount: computeSessionFee(p?.entryTime, p?.exitTime), exitTime: p?.exitTime || new Date().toISOString(), plateImage: exitOcrPreview });
      await loadSessions(); setMapKey((k) => k + 1);
    } catch (err) { setExitError(err.response?.data?.message || "Khong ghi nhan xe ra."); }
    finally { setExitProcessing(false); }
  }

  function resetExit() {
    stopExitCamera();
    setExitOcrPlate(""); setExitOcrConfidence(null); setExitPlateVerified(false);
    setExitOcrPreview((p) => { if (p) URL.revokeObjectURL(p); return ""; });
    setExitOcrError(""); setExitMatchedSession(null); setExitError(""); setConfirmedExit(null);
  }

  // ==================== RENDER ====================
  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex gap-2 rounded-2xl border border-border bg-muted/30 p-1.5">
        <button type="button" onClick={() => setTab("entry")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${tab === "entry" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <LogIn size={16} /> Xe vao (Entry)
        </button>
        <button type="button" onClick={() => setTab("exit")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${tab === "exit" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          <LogOut size={16} /> Xe ra (Exit)
        </button>
      </div>

      {/* ==================== ENTRY TAB ==================== */}
      {tab === "entry" && (
        <div className="space-y-5">
          {/* Building info + manual entry toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {assignedId ? (
                <div className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  {assignedName || `Building #${assignedId}`}
                </div>
              ) : (
                <StaffSelect value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="w-56">
                  <option value="">Chon toa nha</option>
                  {buildings.map((b) => <option key={getBuildingId(b)} value={getBuildingId(b)}>{b.name}</option>)}
                </StaffSelect>
              )}
            </div>
            {!showManualEntry && !confirmedEntry && (
              <button type="button" onClick={() => setShowManualEntry(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20">
                <ShieldAlert size={15} /> Nhap tay (OCR fail)
              </button>
            )}
          </div>

          {/* Confirmed entry result */}
          {confirmedEntry && (
            <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                <CheckCircle2 size={26} className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Xe da vao bai</h3>
              <div className="mt-4 space-y-2 rounded-2xl bg-white/60 dark:bg-white/5 p-4 text-left">
                {[["Session", confirmedEntry.sessionId], ["Bien so", confirmedEntry.licensePlate], ["Slot", confirmedEntry.slotCode], ["Cong", confirmedEntry.gateName], ["Thoi gian", formatStaffDateTime(confirmedEntry.entryTime)]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium text-foreground">{v}</span></div>
                ))}
              </div>
              <StaffPrimaryButton type="button" onClick={() => { resetEntry(); setShowManualEntry(false); }} className="mt-4 w-full">Dong</StaffPrimaryButton>
            </div>
          )}

          {/* Manual entry form — only when toggled */}
          {showManualEntry && !confirmedEntry && (
            <StaffPageSection title="Nhap tay — OCR fail" subtitle="Chi dung khi Scan OCR khong doc duoc bien so">
              {entryStep === 1 && (
                <form onSubmit={handleLookup} className="space-y-4">
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <p>Che do nhap tay — dung khi OCR khong doc duoc bien so. Quy trinh thuong: vao <strong>Scan</strong> de OCR truoc.</p>
                  </div>
                  <StaffField label="Bien so xe">
                    <StaffInput name="licensePlate" value={entryForm.licensePlate} onChange={handleEntryChange} placeholder="Nhap bien so xe" />
                  </StaffField>
                  <div className="grid gap-4 md:grid-cols-2">
                    <StaffField label="Cong vao">
                      <StaffSelect value={entryGateId} onChange={(e) => setEntryGateId(e.target.value)}>
                        <option value="">Chon cong</option>
                        {entryGates.map((g) => <option key={g.gateId || g.id} value={g.gateId || g.id}>{g.gateName || g.gateCode || `Gate ${g.gateId || g.id}`} ({g.gateType})</option>)}
                      </StaffSelect>
                    </StaffField>
                    <StaffField label="Loai xe">
                      <StaffSelect name="vehicleTypeId" value={entryForm.vehicleTypeId} onChange={handleEntryChange}>
                        <option value="">Chon loai xe</option>
                        {vehicleTypes.map((v) => <option key={getVehicleTypeId(v)} value={getVehicleTypeId(v)}>{v.name}</option>)}
                      </StaffSelect>
                    </StaffField>
                  </div>
                  <StaffField label="QR Booking" hint="Neu xe co booking">
                    <StaffInput name="qrCode" value={entryForm.qrCode} onChange={handleEntryChange} placeholder="Paste booking QR token (neu co)" />
                  </StaffField>

                  {lookup.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{lookup.error}</div>}
                  {lookup.notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{lookup.notice}</div>}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {entryForm.qrCode.trim() ? (
                      <StaffPrimaryButton type="button" onClick={handleQrEntry} disabled={lookup.loading} className="flex items-center justify-center gap-2 sm:flex-1">
                        <QrCode size={15} /> {lookup.loading ? "Dang xu ly..." : "QR Entry"}
                      </StaffPrimaryButton>
                    ) : (
                      <StaffPrimaryButton type="submit" disabled={lookup.loading} className="flex items-center justify-center gap-2 sm:flex-1">
                        <Search size={15} /> {lookup.loading ? "Dang tra..." : "Tra cuu xe"}
                      </StaffPrimaryButton>
                    )}
                    <StaffSecondaryButton type="button" onClick={handleDirectWalkIn} disabled={lookup.loading} className="flex items-center justify-center gap-2 sm:flex-1">
                      <ArrowRight size={15} /> Walk-in
                    </StaffSecondaryButton>
                    <StaffSecondaryButton type="button" onClick={handleCreateException} disabled={lookup.loading || !normalizedPlate} className="flex items-center justify-center gap-2 sm:flex-1">
                      <ShieldAlert size={15} /> Exception
                    </StaffSecondaryButton>
                    <StaffSecondaryButton type="button" onClick={() => { setShowManualEntry(false); resetEntry(); }} className="flex items-center justify-center gap-2 sm:flex-1">
                      Dong
                    </StaffSecondaryButton>
                  </div>
                </form>
              )}

              {entryStep === 2 && lookup.vehicle && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Tim thay xe</p>
                        <p className="mt-1 text-xl font-bold text-foreground">{lookup.vehicle.licensePlate}</p>
                        <p className="text-sm text-muted-foreground">{lookup.vehicle.user?.fullName || "Registered driver"}</p>
                      </div>
                      <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-300" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <StaffSecondaryButton type="button" onClick={() => setEntryStep(1)} className="flex-1">Quay lai</StaffSecondaryButton>
                    <StaffPrimaryButton type="button" onClick={handleConfirmEntry} disabled={lookup.loading} className="flex flex-1 items-center justify-center gap-2">
                      {lookup.loading ? "Dang xu ly..." : "Xac nhan vao"} <ArrowRight size={15} />
                    </StaffPrimaryButton>
                  </div>
                  {lookup.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{lookup.error}</div>}
                </div>
              )}
            </StaffPageSection>
          )}

          {/* PARKING MAP — full width, always visible */}
          <StaffPageSection title="Ban do bai xe" subtitle="Trang thai slot theo tang / zone — cap nhat khi entry/exit">
            {buildingId ? <ParkingMap key={mapKey} buildingId={buildingId} onRefresh={loadSessions} /> : <p className="text-sm text-muted-foreground">Chon toa nha de xem ban do.</p>}
          </StaffPageSection>
        </div>
      )}

      {/* ==================== EXIT TAB ==================== */}
      {tab === "exit" && (
        <div className="space-y-5">
          {/* Gate select */}
          <div className="flex items-center gap-3">
            {assignedId ? (
              <div className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                {assignedName || `Building #${assignedId}`}
              </div>
            ) : (
              <StaffSelect value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className="w-56">
                <option value="">Chon toa nha</option>
                {buildings.map((b) => <option key={getBuildingId(b)} value={getBuildingId(b)}>{b.name}</option>)}
              </StaffSelect>
            )}
            <StaffSelect value={exitGateId} onChange={(e) => setExitGateId(e.target.value)} className="w-56">
              <option value="">Chon cong ra</option>
              {exitGates.map((g) => <option key={g.gateId || g.id} value={g.gateId || g.id}>{g.gateName || g.gateCode || `Gate ${g.gateId || g.id}`} ({g.gateType})</option>)}
            </StaffSelect>
          </div>

          {/* Confirmed exit */}
          {confirmedExit ? (
            <div className="mx-auto max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                <CheckCircle2 size={26} className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Xe da ra bai</h3>
              {confirmedExit.plateImage && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                  <img src={confirmedExit.plateImage} alt="Exit plate" className="max-h-28 w-full object-contain bg-slate-950" />
                </div>
              )}
              <div className="mt-4 space-y-2 rounded-2xl bg-white/60 dark:bg-white/5 p-4 text-left">
                {[["Session", confirmedExit.sessionId], ["Bien so", confirmedExit.licensePlate], ["Phi", formatStaffCurrency(confirmedExit.amount)], ["Ra luc", formatStaffDateTime(confirmedExit.exitTime)]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium text-foreground">{v}</span></div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <StaffSecondaryButton type="button" className="flex-1" onClick={resetExit}>Xe tiep</StaffSecondaryButton>
                <StaffPrimaryButton type="button" className="flex-1" onClick={() => navigate("/staff/payments")}><CreditCard size={14} className="mr-1.5" /> Thanh toan</StaffPrimaryButton>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                {/* Step 1: OCR scan plate */}
                <StaffPageSection title="Buoc 1: Scan bien so xe ra" subtitle="Bat buoc — chup bien so lam bang chung xac minh">
                  <div className="rounded-3xl bg-slate-950 p-4 text-white dark:bg-[#020617]">
                    <div className="relative flex min-h-52 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-slate-900 dark:bg-[#0f172a]">
                      <video ref={exitVideoRef} autoPlay playsInline muted className={`absolute inset-0 size-full object-cover ${exitCameraOn ? "opacity-100" : "opacity-0"}`} />
                      {exitCameraOn && <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-20 -translate-y-1/2 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />}
                      {exitOcrPreview && !exitCameraOn && <img src={exitOcrPreview} alt="Exit plate" className="absolute inset-0 size-full object-contain opacity-60" />}
                      {exitOcrScanning ? (
                        <div className="relative z-10 space-y-3 text-center">
                          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                          <p className="text-sm text-emerald-300">Dang nhan dien bien so...</p>
                        </div>
                      ) : exitOcrPlate ? (
                        <div className="relative z-10 rounded-2xl border border-emerald-400/30 bg-slate-950/75 px-5 py-4 text-center shadow-xl">
                          <CheckCircle2 size={24} className="mx-auto text-emerald-300" />
                          <p className="mt-1 text-xs text-slate-300">Bien so</p>
                          <p className="mt-1 font-mono text-3xl font-bold tracking-wide">{exitOcrPlate}</p>
                          {exitOcrConfidence != null && <p className="mt-1 text-xs text-slate-300">{exitOcrConfidence}% confidence</p>}
                        </div>
                      ) : (
                        <div className="relative z-10 space-y-3 text-center">
                          <Camera size={38} className="mx-auto text-white/30" />
                          <p className="text-sm text-white/60">{exitCameraOn ? "Can chinh bien so vao khung" : "Chup bien so xe dang ra cong"}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <StaffSecondaryButton type="button" onClick={exitCameraOn ? stopExitCamera : startExitCamera} disabled={exitOcrScanning} className="flex items-center justify-center gap-2">
                      {exitCameraOn ? <VideoOff size={15} /> : <Video size={15} />} {exitCameraOn ? "Stop" : "Camera"}
                    </StaffSecondaryButton>
                    <StaffPrimaryButton type="button" onClick={handleExitCapture} disabled={exitOcrScanning || !exitCameraOn} className="flex items-center justify-center gap-2">
                      <Camera size={15} /> Chup
                    </StaffPrimaryButton>
                    <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted ${exitOcrScanning ? "pointer-events-none opacity-60" : ""}`}>
                      <ImageUp size={15} /> Upload
                      <input type="file" accept="image/*" className="sr-only" onChange={handleExitFileUpload} />
                    </label>
                    <StaffSecondaryButton type="button" onClick={resetExit} disabled={exitOcrScanning} className="flex items-center justify-center gap-2">
                      <RefreshCw size={15} /> Reset
                    </StaffSecondaryButton>
                  </div>

                  {exitOcrError && (
                    <div className="mt-3 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <p>{exitOcrError}</p>
                    </div>
                  )}
                </StaffPageSection>

                {/* Step 2: Session match + confirm */}
                {exitPlateVerified && exitMatchedSession && (
                  <StaffPageSection title="Buoc 2: Xac nhan xe ra" subtitle="Bien so khop voi session — kiem tra va xac nhan">
                    <div className="space-y-4">
                      {/* Verified badge */}
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">Bien so khop — {exitOcrPlate}</p>
                          <p className="text-sm text-muted-foreground">Session #{exitMatchedSession.sessionId} • Slot {exitMatchedSession.slotCode}</p>
                        </div>
                      </div>

                      {/* Plate image evidence */}
                      {exitOcrPreview && (
                        <div className="overflow-hidden rounded-2xl border border-border">
                          <img src={exitOcrPreview} alt="Exit plate evidence" className="max-h-32 w-full object-contain bg-slate-950" />
                          <div className="bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">Anh bien so xac minh exit</div>
                        </div>
                      )}

                      {/* Session details */}
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-muted/30 p-4">
                          <p className="text-xs text-muted-foreground">Vao luc</p>
                          <p className="mt-1 font-semibold text-foreground">{formatStaffDateTime(exitMatchedSession.entryTime)}</p>
                        </div>
                        <div className="rounded-2xl bg-muted/30 p-4">
                          <p className="text-xs text-muted-foreground">Phi tam tinh</p>
                          <p className="mt-1 font-semibold text-foreground">{formatStaffCurrency(exitFee)}</p>
                        </div>
                      </div>

                      {exitError && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{exitError}</div>}

                      <StaffPrimaryButton type="button" onClick={handleConfirmExit} disabled={exitProcessing || !canConfirmExit} className="flex w-full items-center justify-center gap-2">
                        <LogOut size={15} /> {exitProcessing ? "Dang xu ly..." : "Xac nhan xe ra"}
                      </StaffPrimaryButton>
                    </div>
                  </StaffPageSection>
                )}
              </div>

              {/* Right side: Map + waiting queue */}
              <div className="space-y-5">
                <StaffPageSection title="Ban do bai xe" subtitle="Slot theo tang / zone">
                  {buildingId ? <ParkingMap key={mapKey + 100} buildingId={buildingId} onRefresh={loadSessions} /> : <p className="text-sm text-muted-foreground">Chon toa nha.</p>}
                </StaffPageSection>

                {waitingPayments.length > 0 && (
                  <StaffPageSection title={`Cho thanh toan (${waitingPayments.length})`}>
                    <div className="space-y-2">
                      {waitingPayments.map((item) => (
                        <div key={item.sessionId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                            <p className="text-[11px] text-muted-foreground">#{item.sessionId} - {item.slotCode}</p>
                          </div>
                          <StaffSecondaryButton type="button" onClick={() => navigate("/staff/payments")} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5">
                            <CreditCard size={12} /> Pay
                          </StaffSecondaryButton>
                        </div>
                      ))}
                    </div>
                  </StaffPageSection>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

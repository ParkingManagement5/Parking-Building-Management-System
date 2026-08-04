import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, CreditCard, Clock, RefreshCw, X } from "lucide-react";
import { floorApi } from "../../api/manager/floorApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import { getAssignedBuildingId, getAssignedBuildingName } from "../../utils/auth";
import { ParkingMap, StaticFloorPlanMap, ZoomCtrl } from "../driver/ParkingFloorPlan";
import { getFloorPlan } from "../../config/buildingFloorPlans";
import { $fx, $c, $zn, $fn } from "../driver/parkingFloorPlanUtils";
import { formatDuration } from "../driver/driverPortalUtils";
import {
  StaffEmptyState, StaffInput, StaffPageSection,
  StaffSecondaryButton, StaffStatBar,
} from "./StaffUi";

const SLOT_STATUS_LABELS = {
  AVAILABLE: "Còn trống",
  OCCUPIED: "Đang có xe",
  RESERVED: "Đã đặt trước",
  MAINTENANCE: "Bảo trì",
};

export default function MapPage() {
  const navigate = useNavigate();
  // buildingId là cố định — luôn lấy từ assignedBuilding trong token
  // Staff không được phép xem bản đồ của bãi khác
  const assignedId = getAssignedBuildingId();
  const assignedLabel = getAssignedBuildingName();

  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [zonesMap, setZonesMap] = useState({});
  const [slotsMap, setSlotsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [activeSessions, setActiveSessions] = useState([]);
  const [waitingPayments, setWaitingPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [zoom, setZoom] = useState(100);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const refreshInterval = useRef(null);

  useEffect(() => {
    loadInitial();
    refreshInterval.current = setInterval(refresh, 15000);
    return () => clearInterval(refreshInterval.current);
  }, []);

  useEffect(() => { if (selectedFloor) loadZonesSlots(selectedFloor); }, [selectedFloor]);

  async function loadInitial() {
    // Guard: staff chưa được gán bãi → không load gì cả
    if (!assignedId) {
      setLoadError("Bạn chưa được gán bãi xe. Liên hệ Manager để được phân công.");
      return;
    }
    await Promise.all([loadFloors(), loadSessions()]);
  }

  async function loadSessions() {
    try {
      const [aRes, wRes] = await Promise.all([
        sessionApi.getSessions({ status: "ACTIVE" }),
        sessionApi.getSessions({ status: "WAITING_PAYMENT" }),
      ]);
      setActiveSessions(unwrapApiData(aRes.data, []));
      setWaitingPayments(unwrapApiData(wRes.data, []));
      setLoadError("");
    } catch (err) {
      setLoadError(err.response?.data?.message || "Không tải được danh sách session cho staff.");
    }
  }

  async function loadFloors() {
    if (!assignedId) return;
    setLoading(true);
    try {
      const res = await floorApi.getByBuilding(assignedId);
      const items = unwrapApiData(res.data, []);
      setFloors(items);
      if (items[0]) setSelectedFloor(items[0].floorId || items[0].id);
      setLoadError(items.length ? "" : "Toà nhà hiện tại chưa có tầng nào để hiển thị.");
    } catch (err) {
      setLoadError(err.response?.data?.message || "Không tải được danh sách tầng cho toà nhà hiện tại.");
    }
    finally { setLoading(false); }
  }

  async function loadZonesSlots(floorId) {
    setLoading(true);
    try {
      const zRes = await zoneApi.getByFloor(floorId);
      const zones = unwrapApiData(zRes.data, []);
      setZonesMap((p) => ({ ...p, [floorId]: zones }));
      const results = {};
      await Promise.all(zones.map(async (z) => {
        const zid = z.zoneId || z.id;
        const sRes = await parkingSlotApi.getByZone(zid);
        results[zid] = unwrapApiData(sRes.data, []);
      }));
      setSlotsMap((p) => ({ ...p, ...results }));
      setLoadError("");
    } catch (err) {
      setLoadError(err.response?.data?.message || "Không tải được zone/slot cho tầng hiện tại.");
    }
    finally { setLoading(false); }
  }

  function refresh() {
    if (!assignedId) return;
    loadSessions();
    if (selectedFloor) loadZonesSlots(selectedFloor);
  }

  const currentZones = zonesMap[selectedFloor] || [];
  const currentZonesWithSlots = currentZones.map((z) => ({ ...z, slots: slotsMap[z.zoneId || z.id] || [] }));
  const allSlots = currentZones.flatMap((z) => slotsMap[z.zoneId || z.id] || []);
  const stats = {
    total: allSlots.length,
    available: allSlots.filter((s) => s.status === "AVAILABLE").length,
    occupied: allSlots.filter((s) => s.status === "OCCUPIED").length,
    reserved: allSlots.filter((s) => s.status === "RESERVED").length,
  };

  const selectedFloorObj = floors.find((f) => String(f.floorId || f.id) === String(selectedFloor));
  const planStaticLayout = selectedFloorObj ? getFloorPlan(assignedLabel, $fx(selectedFloorObj)) : null;

  function findSessionForSlot(slot) {
    const sid = slot.id || slot.slotId;
    const code = slot.slotCode;
    return activeSessions.find((s) => s.slotId === sid || s.slotCode === code)
      || waitingPayments.find((s) => s.slotId === sid || s.slotCode === code)
      || null;
  }

  function findZoneForSlot(slot) {
    const sid = slot.id || slot.slotId;
    return currentZonesWithSlots.find((z) => z.slots.some((s) => (s.id || s.slotId) === sid));
  }

  function handleSlotClick(slot, st) {
    const status = String(slot.status || st || "AVAILABLE").toUpperCase();
    setSelectedSlot({
      slot,
      status,
      zone: findZoneForSlot(slot),
      session: findSessionForSlot(slot),
    });
  }

  const filteredActive = searchQuery.trim()
    ? activeSessions.filter((s) => String(s.licensePlate || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(s.sessionId || "").includes(searchQuery))
    : activeSessions;

  // Nếu chưa được gán bãi → hiện thông báo, không render gì thêm
  if (!assignedId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        <p className="font-semibold mb-1">Chưa được gán bãi xe</p>
        <p>Tài khoản của bạn chưa được Manager phân công vào bãi nào. Liên hệ Manager để được cấp quyền truy cập.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {loadError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {loadError}
        </div>
      )}
      {/* Header stats */}
      <StaffStatBar
        items={[
          { label: "Tổng slot", value: stats.total, tone: "slate" },
          { label: "Trống", value: stats.available, tone: "emerald" },
          { label: "Có xe", value: stats.occupied, tone: "rose" },
          { label: "Đã đặt", value: stats.reserved, tone: "amber" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {/* LEFT: Parking Map (site map) */}
        <StaffPageSection title="Bản đồ bãi xe" subtitle={assignedLabel || "Chọn toà nhà"}>
          {/* Floor tabs */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex gap-1.5">
              {floors.map((f) => {
                const fid = f.floorId || f.id;
                return (
                  <button key={fid} type="button" onClick={() => setSelectedFloor(fid)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${selectedFloor === fid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    {f.floorName || f.name || `Tầng ${f.floorNumber}`}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <ZoomCtrl zoom={zoom} onZoom={(d) => setZoom((z) => Math.max(60, Math.min(200, z + d)))}
                onReset={() => setZoom(100)} onFs={() => {}} />
              <button type="button" onClick={refresh} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition" title="Làm mới">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
          {currentZones.length === 0 && !loading && <p className="text-sm text-muted-foreground">Chọn tầng để xem.</p>}

          {currentZones.length > 0 && (
            planStaticLayout
              ? <StaticFloorPlanMap plan={planStaticLayout} sections={currentZonesWithSlots} session={null}
                  activeZone={null} zoom={zoom} onSlotClick={handleSlotClick} />
              : <ParkingMap sections={currentZonesWithSlots} session={null} activeZone={null}
                  zoom={zoom} onSlotClick={handleSlotClick}
                  floorIdx={$fx(selectedFloorObj)} totalFloors={floors.length} />
          )}
        </StaffPageSection>

        {/* RIGHT: Sessions + Queue */}
        <div className="space-y-5">
          {/* Active sessions */}
          <StaffPageSection title={`Xe trong bãi (${activeSessions.length})`} subtitle="Session đang ACTIVE">
            <StaffInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm biển số hoặc session ID" className="mb-3" />
            {filteredActive.length === 0 ? (
              <StaffEmptyState title="Không có xe" description={searchQuery ? "Không tìm thấy." : "Bãi trống."} />
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredActive.map((s) => (
                  <div key={s.sessionId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <Car size={16} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.licensePlate}</p>
                        <p className="text-[11px] text-muted-foreground">#{s.sessionId} • {s.slotCode} • {formatStaffDateTime(s.entryTime)}</p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{formatStaffCurrency(s.calculatedFee)}</p>
                  </div>
                ))}
              </div>
            )}
          </StaffPageSection>

          {/* Waiting payment */}
          <StaffPageSection title={`Chờ thanh toán (${waitingPayments.length})`} subtitle="Session đã exit, cần payment">
            {waitingPayments.length === 0 ? (
              <StaffEmptyState title="Không có" description="Xe exit sẽ hiện ở đây." tone="success" />
            ) : (
              <div className="space-y-2">
                {waitingPayments.map((s) => (
                  <div key={s.sessionId} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-amber-500" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.licensePlate}</p>
                        <p className="text-[11px] text-muted-foreground">#{s.sessionId} • Ra {formatStaffDateTime(s.exitTime)}</p>
                      </div>
                    </div>
                    <StaffSecondaryButton type="button" onClick={() => navigate("/staff/payments")} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5">
                      <CreditCard size={12} /> Thanh toán
                    </StaffSecondaryButton>
                  </div>
                ))}
              </div>
            )}
          </StaffPageSection>
        </div>
      </div>

      {/* Slot detail — modal gọn, bấm vào ô trên site map để xem */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedSlot(null)}>
          <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-lg font-bold text-foreground">{$c(selectedSlot.slot)}</p>
                <p className="text-xs text-muted-foreground">{$zn(selectedSlot.zone)} • {$fn(selectedFloorObj)}</p>
              </div>
              <button type="button" onClick={() => setSelectedSlot(null)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition">
                <X size={16} />
              </button>
            </div>

            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium mb-3 ${
              selectedSlot.status === "AVAILABLE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : selectedSlot.status === "OCCUPIED" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
              : selectedSlot.status === "RESERVED" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300"
            }`}>
              {SLOT_STATUS_LABELS[selectedSlot.status] || selectedSlot.status}
            </span>

            {selectedSlot.session ? (
              <div className="space-y-1.5 rounded-xl bg-muted/30 p-3">
                {[
                  ["Biển số", selectedSlot.session.licensePlate],
                  ["Giờ vào", formatStaffDateTime(selectedSlot.session.entryTime)],
                  ["Thời gian đỗ", formatDuration(selectedSlot.session.entryTime, selectedSlot.session.exitTime || new Date().toISOString())],
                  selectedSlot.session.exitTime
                    ? ["Trạng thái", "Chờ thanh toán"]
                    : ["Phí tạm tính", formatStaffCurrency(selectedSlot.session.calculatedFee)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-foreground">{v || "--"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {selectedSlot.status === "AVAILABLE" ? "Sẵn sàng nhận xe."
                  : selectedSlot.status === "RESERVED" ? "Đã đặt trước — chưa có xe vào."
                  : "Không có thông tin xe."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

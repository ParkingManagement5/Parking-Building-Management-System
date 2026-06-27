import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Car, CreditCard, Clock, RefreshCw, Search } from "lucide-react";
import { floorApi } from "../../api/manager/floorApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { buildingApi } from "../../api/manager/buildingApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { computeSessionFee, formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import { getAssignedBuildingId, getAssignedBuildingName } from "../../utils/auth";
import { pricingPolicyApi } from "../../api/manager/pricingPolicyApi";
import {
  StaffEmptyState, StaffInput, StaffPageSection,
  StaffSecondaryButton, StaffStatusBadge,
} from "./StaffUi";

const SLOT_COLORS = {
  AVAILABLE: "bg-emerald-400/80 hover:bg-emerald-400 text-emerald-950",
  OCCUPIED: "bg-rose-400/80 hover:bg-rose-400 text-rose-950",
  RESERVED: "bg-amber-400/80 hover:bg-amber-400 text-amber-950",
  MAINTENANCE: "bg-slate-400/60 text-slate-600",
};

export default function MapPage() {
  const navigate = useNavigate();
  const assignedId = getAssignedBuildingId();
  const assignedLabel = getAssignedBuildingName();
  const [buildingId, setBuildingId] = useState(assignedId || "");
  const [buildings, setBuildings] = useState([]);

  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [zonesMap, setZonesMap] = useState({});
  const [slotsMap, setSlotsMap] = useState({});
  const [loading, setLoading] = useState(false);

  const [activeSessions, setActiveSessions] = useState([]);
  const [waitingPayments, setWaitingPayments] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const refreshInterval = useRef(null);

  useEffect(() => {
    loadInitial();
    refreshInterval.current = setInterval(refresh, 15000);
    return () => clearInterval(refreshInterval.current);
  }, []);

  useEffect(() => { if (buildingId) loadFloors(); }, [buildingId]);
  useEffect(() => { if (selectedFloor) loadZonesSlots(selectedFloor); }, [selectedFloor]);

  async function loadInitial() {
    try {
      const [bRes, pRes] = await Promise.all([buildingApi.getAll(), pricingPolicyApi.getAll()]);
      const bs = unwrapApiData(bRes.data, []);
      setBuildings(bs);
      setPolicies(unwrapApiData(pRes.data, []));
      if (assignedId) setBuildingId(assignedId);
      else if (bs[0]) setBuildingId(String(bs[0].buildingId || bs[0].id));
    } catch {}
    await loadSessions();
  }

  async function loadSessions() {
    try {
      const [aRes, wRes] = await Promise.all([
        sessionApi.getSessions({ status: "ACTIVE" }),
        sessionApi.getSessions({ status: "WAITING_PAYMENT" }),
      ]);
      setActiveSessions(unwrapApiData(aRes.data, []));
      setWaitingPayments(unwrapApiData(wRes.data, []));
    } catch {}
  }

  async function loadFloors() {
    setLoading(true);
    try {
      const res = await floorApi.getByBuilding(buildingId);
      const items = unwrapApiData(res.data, []);
      setFloors(items);
      if (items[0]) setSelectedFloor(items[0].floorId || items[0].id);
    } catch {}
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
    } catch {}
    finally { setLoading(false); }
  }

  function refresh() {
    loadSessions();
    if (selectedFloor) loadZonesSlots(selectedFloor);
  }

  function resolveRate(s) {
    const p = policies.find((pp) => pp.isActive && pp.vehicleTypeId === s?.vehicleTypeId);
    return Number(p?.pricePerHour ?? 20000);
  }

  const currentZones = zonesMap[selectedFloor] || [];
  const allSlots = currentZones.flatMap((z) => slotsMap[z.zoneId || z.id] || []);
  const stats = {
    total: allSlots.length,
    available: allSlots.filter((s) => s.status === "AVAILABLE").length,
    occupied: allSlots.filter((s) => s.status === "OCCUPIED").length,
    reserved: allSlots.filter((s) => s.status === "RESERVED").length,
  };

  const filteredActive = searchQuery.trim()
    ? activeSessions.filter((s) => String(s.licensePlate || "").toLowerCase().includes(searchQuery.toLowerCase()) || String(s.sessionId || "").includes(searchQuery))
    : activeSessions;

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Tong slot", value: stats.total, color: "text-foreground" },
          { label: "Trong", value: stats.available, color: "text-emerald-600" },
          { label: "Co xe", value: stats.occupied, color: "text-rose-600" },
          { label: "Da dat", value: stats.reserved, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {/* LEFT: Parking Map */}
        <StaffPageSection title="Ban do bai xe" subtitle={assignedLabel || "Chon toa nha"}>
          {/* Floor tabs */}
          <div className="flex items-center justify-between gap-3 mb-4">
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
            <button type="button" onClick={refresh} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition" title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs mb-4">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-emerald-400" /> Trong</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-rose-400" /> Co xe</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-amber-400" /> Da dat</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-slate-400" /> Bao tri</span>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Dang tai...</p>}

          {/* Zone grids */}
          {currentZones.length === 0 && !loading && <p className="text-sm text-muted-foreground">Chon tang de xem.</p>}

          <div className="space-y-4">
            {currentZones.map((zone) => {
              const zid = zone.zoneId || zone.id;
              const slots = (slotsMap[zid] || []).sort((a, b) => (a.slotCode || "").localeCompare(b.slotCode || ""));
              const avail = slots.filter((s) => s.status === "AVAILABLE").length;
              return (
                <div key={zid} className="rounded-2xl border border-border bg-muted/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{zone.zoneName || zone.name}</p>
                    <p className="text-xs text-muted-foreground">{avail}/{slots.length} trong</p>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {slots.map((slot) => {
                      const status = String(slot.status || "AVAILABLE").toUpperCase();
                      const code = (slot.slotCode || "").split("-").pop() || slot.slotCode;
                      return (
                        <div key={slot.id || slot.slotId}
                          title={`${slot.slotCode} — ${status}`}
                          className={`flex items-center justify-center rounded-xl py-2.5 text-xs font-bold transition-colors ${SLOT_COLORS[status] || SLOT_COLORS.AVAILABLE}`}>
                          {code}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </StaffPageSection>

        {/* RIGHT: Sessions + Queue */}
        <div className="space-y-5">
          {/* Active sessions */}
          <StaffPageSection title={`Xe trong bai (${activeSessions.length})`} subtitle="Session dang ACTIVE">
            <StaffInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tim bien so hoac session ID" className="mb-3" />
            {filteredActive.length === 0 ? (
              <StaffEmptyState title="Khong co xe" description={searchQuery ? "Khong tim thay." : "Bai trong."} />
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
                    <p className="text-xs font-semibold text-foreground">{formatStaffCurrency(computeSessionFee(s.entryTime))}</p>
                  </div>
                ))}
              </div>
            )}
          </StaffPageSection>

          {/* Waiting payment */}
          <StaffPageSection title={`Cho thanh toan (${waitingPayments.length})`} subtitle="Session da exit, can payment">
            {waitingPayments.length === 0 ? (
              <StaffEmptyState title="Khong co" description="Xe exit se hien o day." tone="success" />
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
                      <CreditCard size={12} /> Pay
                    </StaffSecondaryButton>
                  </div>
                ))}
              </div>
            )}
          </StaffPageSection>
        </div>
      </div>
    </div>
  );
}

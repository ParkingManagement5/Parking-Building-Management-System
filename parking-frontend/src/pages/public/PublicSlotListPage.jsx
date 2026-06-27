import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { unwrapApiData } from "../../utils/api";
import { usePublicTheme } from "../../utils/publicTheme";
import "../../assets/css/landing.css";

function getBuildingId(item) { return item?.buildingId ?? item?.id; }
function getFloorId(item) { return item?.floorId ?? item?.id; }
function getZoneId(item) { return item?.zoneId ?? item?.id; }
function getVehicleTypeId(item) { return item?.vehicleTypeId ?? item?.id; }

function getSettledData(result, fallback = []) {
  if (result?.status !== "fulfilled") return fallback;
  return unwrapApiData(result.value?.data, fallback);
}

function toDisplayStatus(status) {
  const n = String(status || "AVAILABLE").toUpperCase();
  if (n === "AVAILABLE") return "Available";
  if (n === "OCCUPIED") return "Occupied";
  if (n === "RESERVED") return "Reserved";
  return "Maintenance";
}

function normalizeSlot(item) {
  return {
    id: item.slotId ?? item.id,
    code: item.slotCode || `SLOT-${item.slotId ?? item.id}`,
    buildingId: item.zone?.floor?.building?.buildingId ?? item.zone?.floor?.building?.id,
    building: item.zone?.floor?.building?.name || "Unknown building",
    floorId: item.zone?.floor?.floorId ?? item.zone?.floor?.id,
    floor: item.zone?.floor?.name || "Unknown floor",
    zoneId: item.zone?.zoneId ?? item.zone?.id,
    zone: item.zone?.name || "Unknown zone",
    vehicleTypeId: item.zone?.vehicleType?.vehicleTypeId ?? item.zone?.vehicleType?.id,
    vehicleType: item.zone?.vehicleType?.name || "Unknown vehicle type",
    status: toDisplayStatus(item.status),
    rawStatus: String(item.status || "AVAILABLE").toUpperCase(),
  };
}

const SLOT_COLORS = { Available: "#10b981", Occupied: "#ef4444", Reserved: "#f59e0b", Maintenance: "#6b7280" };
const SLOT_LABELS = { Available: "Trong", Occupied: "Co xe", Reserved: "Da dat", Maintenance: "Bao tri" };

const card = { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px" };
const inputStyle = {
  background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
  padding: "10px 14px", color: "var(--text)", fontSize: "0.9rem", width: "100%", outline: "none",
  fontFamily: "inherit",
};

export default function PublicSlotListPage() {
  const { className: themeClass } = usePublicTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [search, setSearch] = useState("");
  const timerRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [bRes, vtRes] = await Promise.all([buildingApi.getAll(), vehicleTypeApi.getAll()]);
      const bList = unwrapApiData(bRes.data, []);
      const vtList = unwrapApiData(vtRes.data, []);
      const floorRes = await Promise.allSettled(bList.map((b) => floorApi.getByBuilding(getBuildingId(b))));
      const floors = floorRes.flatMap((r) => getSettledData(r, []));
      const zoneRes = await Promise.allSettled(floors.map((f) => zoneApi.getByFloor(getFloorId(f))));
      const zones = zoneRes.flatMap((r) => getSettledData(r, []));
      const slotRes = await Promise.allSettled(zones.map((z) => parkingSlotApi.getByZone(getZoneId(z))));
      const slotList = slotRes.flatMap((r) => getSettledData(r, []).map(normalizeSlot));
      setBuildings(bList);
      setVehicleTypes(vtList);
      setSlots(slotList);
    } catch (e) {
      console.error("Failed to load public slots", e);
      setError("Khong the tai du lieu bai do tu he thong.");
      setBuildings([]); setVehicleTypes([]); setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    timerRef.current = setInterval(loadData, 15000);
    return () => clearInterval(timerRef.current);
  }, []);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return slots.filter((s) => {
      if (kw && !s.code.toLowerCase().includes(kw) && !s.zone.toLowerCase().includes(kw) && !s.floor.toLowerCase().includes(kw)) return false;
      if (filterBuilding && String(s.buildingId) !== filterBuilding) return false;
      if (filterVehicle && String(s.vehicleTypeId) !== filterVehicle) return false;
      return true;
    });
  }, [slots, search, filterBuilding, filterVehicle]);

  const stats = useMemo(() => ({
    total: slots.length,
    available: slots.filter((s) => s.status === "Available").length,
    occupied: slots.filter((s) => s.status === "Occupied").length,
    reserved: slots.filter((s) => s.status === "Reserved").length,
  }), [slots]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((s) => {
      const fKey = `${s.buildingId}_${s.floorId}`;
      if (!map[fKey]) map[fKey] = { building: s.building, floor: s.floor, zones: {} };
      if (!map[fKey].zones[s.zoneId]) map[fKey].zones[s.zoneId] = { name: s.zone, vehicleType: s.vehicleType, slots: [] };
      map[fKey].zones[s.zoneId].slots.push(s);
    });
    return Object.values(map).map((f) => ({ ...f, zones: Object.values(f.zones) }));
  }, [filtered]);

  const statCards = [
    { label: "Tong slot", value: stats.total, color: "var(--accent)" },
    { label: "Trong", value: stats.available, color: "#10b981" },
    { label: "Co xe", value: stats.occupied, color: "#ef4444" },
    { label: "Da dat", value: stats.reserved, color: "#f59e0b" },
  ];

  return (
    <div className={`ps-landing ${themeClass}`} style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            Ban do bai do xe
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: 6 }}>
            Thong tin slot thoi gian thuc -- tu dong cap nhat moi 15 giay
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {statCards.map((c) => (
            <div key={c.label} style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: "var(--radius-sm)", background: `${c.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: c.color }} />
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div style={{ ...card, display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
          <select value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)}
            style={{ ...inputStyle, width: 200, cursor: "pointer", appearance: "auto" }}>
            <option value="">-- Toa nha --</option>
            {buildings.map((b) => <option key={getBuildingId(b)} value={String(getBuildingId(b))}>{b.name}</option>)}
          </select>
          <select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}
            style={{ ...inputStyle, width: 200, cursor: "pointer", appearance: "auto" }}>
            <option value="">-- Loai xe --</option>
            {vehicleTypes.map((v) => <option key={getVehicleTypeId(v)} value={String(getVehicleTypeId(v))}>{v.name}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tim kiem slot..."
            style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
          {/* Legend */}
          <div style={{ display: "flex", gap: 14, marginLeft: "auto", flexShrink: 0 }}>
            {Object.entries(SLOT_COLORS).map(([st, color]) => (
              <span key={st} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block" }} />
                {SLOT_LABELS[st]}
              </span>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && slots.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 12 }}>...</div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Dang tai du lieu bai do...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ ...card, borderColor: "var(--danger)", background: "rgba(255,77,77,0.08)", color: "#ff6b6b", marginBottom: 24, fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {/* No results */}
        {!loading && filtered.length === 0 && !error && (
          <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Khong tim thay slot nao phu hop.</p>
          </div>
        )}

        {/* Slot Grid grouped by Floor -> Zone */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {grouped.map((floor, fi) => (
            <div key={fi} style={{ ...card, padding: 0, overflow: "hidden" }}>
              {/* Floor header */}
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.95rem" }}>{floor.building}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: 10 }}>{floor.floor}</span>
                </div>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {floor.zones.reduce((n, z) => n + z.slots.filter((s) => s.rawStatus === "AVAILABLE").length, 0)} slot trong
                </span>
              </div>
              {/* Zones */}
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                {floor.zones.map((zone, zi) => (
                  <div key={zi}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {zone.name}
                        <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 8, fontSize: "0.78rem" }}>{zone.vehicleType}</span>
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
                        {zone.slots.filter((s) => s.rawStatus === "AVAILABLE").length}/{zone.slots.length} trong
                      </span>
                    </div>
                    {/* Slot boxes grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 6 }}>
                      {[...zone.slots].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map((slot) => (
                        <div key={slot.id} title={`${slot.code} - ${slot.status}`}
                          style={{
                            background: SLOT_COLORS[slot.status], borderRadius: "var(--radius-sm)",
                            padding: "8px 4px", textAlign: "center", cursor: "default",
                            transition: "transform 0.15s ease, opacity 0.15s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.opacity = "0.85"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "1"; }}
                        >
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#fff", lineHeight: 1.2, fontFamily: "monospace" }}>
                            {slot.code}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              Hien thi {filtered.length} / {slots.length} slot --
              <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600, marginLeft: 4 }}>Dang nhap de dat cho</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

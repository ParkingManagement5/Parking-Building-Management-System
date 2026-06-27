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
const SLOT_LABELS = { Available: "Trong", Occupied: "Có xe", Reserved: "Đã đặt", Maintenance: "Bảo trì" };

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
  const [selectedFloor, setSelectedFloor] = useState(0);
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
    { label: "Tổng slot", value: stats.total, color: "var(--accent)" },
    { label: "Trong", value: stats.available, color: "#10b981" },
    { label: "Có xe", value: stats.occupied, color: "#ef4444" },
    { label: "Đã đặt", value: stats.reserved, color: "#f59e0b" },
  ];

  function renderZoneBlock(zone, zi) {
    const sortedSlots = [...zone.slots].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    const zoneAvail = sortedSlots.filter((s) => s.rawStatus === "AVAILABLE").length;
    return (
      <div key={zi} style={{
        background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
        padding: 14, transition: "border-color 0.2s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>{zone.name}</span>
          <span style={{ fontSize: "0.65rem", color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {zoneAvail}/{sortedSlots.length}
          </span>
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: 10, fontWeight: 500 }}>{zone.vehicleType}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {sortedSlots.map((slot) => (
            <div key={slot.id} title={`${slot.code} — ${slot.status}`}
              style={{
                background: SLOT_COLORS[slot.status], borderRadius: 7,
                padding: "12px 6px", textAlign: "center", cursor: "default",
                transition: "transform 0.15s ease",
                border: slot.rawStatus === "OCCUPIED" ? "2px solid rgba(255,255,255,0.2)" : "2px solid transparent",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                {slot.code.split("-").pop()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`ps-landing ${themeClass}`} style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            Bản đồ bãi đỗ xe
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: 6 }}>
            Thông tin slot thời gian thực — tự động cập nhật mỗi 15 giây
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
            <option value="">-- Tòa nhà --</option>
            {buildings.map((b) => <option key={getBuildingId(b)} value={String(getBuildingId(b))}>{b.name}</option>)}
          </select>
          <select value={filterVehicle} onChange={(e) => setFilterVehicle(e.target.value)}
            style={{ ...inputStyle, width: 200, cursor: "pointer", appearance: "auto" }}>
            <option value="">-- Loại xe --</option>
            {vehicleTypes.map((v) => <option key={getVehicleTypeId(v)} value={String(getVehicleTypeId(v))}>{v.name}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm slot..."
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
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Đang tải dữ liệu bãi đỗ...</p>
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
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Không tìm thấy slot nào phù hợp.</p>
          </div>
        )}

        {/* Floor tabs */}
        {grouped.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {grouped.map((floor, fi) => {
              const floorAvail = floor.zones.reduce((n, z) => n + z.slots.filter((s) => s.rawStatus === "AVAILABLE").length, 0);
              const floorTotal = floor.zones.reduce((n, z) => n + z.slots.length, 0);
              const isActive = selectedFloor === fi;
              return (
                <button key={fi} onClick={() => setSelectedFloor(fi)} style={{
                  padding: "10px 20px", borderRadius: "var(--radius-sm)", border: "1.5px solid",
                  borderColor: isActive ? "var(--accent)" : "var(--border)",
                  background: isActive ? "var(--accent-dim)" : "var(--bg-elevated)",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                  transition: "all 0.2s", fontFamily: "inherit",
                }}>
                  {floor.floor}
                  <span style={{ marginLeft: 8, fontSize: "0.72rem", opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>
                    {floorAvail}/{floorTotal}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Building Floor Blueprint — show selected floor only */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {grouped.filter((_, fi) => fi === selectedFloor).map((floor, fi) => {
            const floorAvail = floor.zones.reduce((n, z) => n + z.slots.filter((s) => s.rawStatus === "AVAILABLE").length, 0);
            const floorTotal = floor.zones.reduce((n, z) => n + z.slots.length, 0);
            const topZones = floor.zones.slice(0, 3);
            const bottomZones = floor.zones.slice(3, 6);
            return (
              <div key={fi} style={{ ...card, padding: 0, overflow: "hidden" }}>
                {/* Floor header */}
                <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 800, color: "var(--text)", fontSize: "1.1rem" }}>{floor.building}</span>
                    <span style={{ color: "var(--accent)", fontSize: "0.88rem", marginLeft: 14, fontWeight: 600 }}>{floor.floor}</span>
                  </div>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {floorAvail}/{floorTotal} trống
                  </span>
                </div>

                {/* Blueprint area */}
                <div style={{ padding: "28px 24px", background: "var(--bg-section)", position: "relative" }}>
                  {/* Entry gate */}
                  <div style={{ textAlign: "center", marginBottom: 18 }}>
                    <span style={{ display: "inline-block", padding: "5px 28px", background: "var(--accent)", color: "#000", borderRadius: "0 0 10px 10px", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em" }}>
                      ▼ CỔNG VÀO
                    </span>
                  </div>

                  {/* Top row: 3 zones */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    {topZones.map((zone, zi) => renderZoneBlock(zone, zi))}
                  </div>

                  {/* Aisle */}
                  <div style={{ textAlign: "center", margin: "14px 0", position: "relative" }}>
                    <div style={{ height: 1, background: "var(--border)", position: "absolute", top: "50%", left: "5%", right: "5%" }} />
                    <span style={{ position: "relative", display: "inline-block", padding: "3px 20px", background: "var(--bg-section)", color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.15em" }}>
                      ĐƯỜNG ĐI
                    </span>
                  </div>

                  {/* Bottom row: 3 zones */}
                  {bottomZones.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                      {bottomZones.map((zone, zi) => renderZoneBlock(zone, zi + 3))}
                    </div>
                  )}

                  {/* Exit gate */}
                  <div style={{ textAlign: "center", marginTop: 18 }}>
                    <span style={{ display: "inline-block", padding: "5px 28px", background: "rgba(255,77,77,0.15)", color: "var(--danger)", borderRadius: "10px 10px 0 0", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em" }}>
                      ▲ CỔNG RA
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Hiển thị {filtered.length} / {slots.length} slot —
              <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600, marginLeft: 4 }}>Đăng nhập để đặt chỗ</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

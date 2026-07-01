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
  const normalized = String(status || "AVAILABLE").toUpperCase();
  if (normalized === "AVAILABLE") return "Available";
  if (normalized === "OCCUPIED") return "Occupied";
  if (normalized === "RESERVED") return "Reserved";
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

const SLOT_COLORS = {
  Available: "#22c55e",
  Occupied: "#ef4444",
  Reserved: "#f59e0b",
  Maintenance: "#64748b",
};

const SLOT_LABELS = {
  Available: "Trong",
  Occupied: "Co xe",
  Reserved: "Da dat",
  Maintenance: "Bao tri",
};

const card = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "20px",
};

const inputStyle = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 14px",
  color: "var(--text)",
  fontSize: "0.9rem",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
};

function getStatusCounts(list) {
  return {
    total: list.length,
    available: list.filter((item) => item.rawStatus === "AVAILABLE").length,
    occupied: list.filter((item) => item.rawStatus === "OCCUPIED").length,
    reserved: list.filter((item) => item.rawStatus === "RESERVED").length,
  };
}

function sortByName(a, b) {
  return String(a.name || a.floor || "").localeCompare(String(b.name || b.floor || ""), undefined, { numeric: true });
}

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
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFloorKey, setSelectedFloorKey] = useState("");
  const timerRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [bRes, vtRes] = await Promise.all([buildingApi.getAll(), vehicleTypeApi.getAll()]);
      const bList = unwrapApiData(bRes.data, []);
      const vtList = unwrapApiData(vtRes.data, []);
      const floorRes = await Promise.allSettled(bList.map((b) => floorApi.getByBuilding(getBuildingId(b))));
      const floors = floorRes.flatMap((result) => getSettledData(result, []));
      const zoneRes = await Promise.allSettled(floors.map((f) => zoneApi.getByFloor(getFloorId(f))));
      const zones = zoneRes.flatMap((result) => getSettledData(result, []));
      const slotRes = await Promise.allSettled(zones.map((z) => parkingSlotApi.getByZone(getZoneId(z))));
      const slotList = slotRes.flatMap((result) => getSettledData(result, []).map(normalizeSlot));
      setBuildings(bList);
      setVehicleTypes(vtList);
      setSlots(slotList);
    } catch (e) {
      console.error("Failed to load public slots", e);
      setError("Khong the tai du lieu bai do tu he thong.");
      setBuildings([]);
      setVehicleTypes([]);
      setSlots([]);
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
    const keyword = search.trim().toLowerCase();
    return slots.filter((slot) => {
      if (
        keyword &&
        !slot.code.toLowerCase().includes(keyword) &&
        !slot.zone.toLowerCase().includes(keyword) &&
        !slot.floor.toLowerCase().includes(keyword) &&
        !slot.building.toLowerCase().includes(keyword)
      ) {
        return false;
      }
      if (filterBuilding && String(slot.buildingId) !== filterBuilding) return false;
      if (filterVehicle && String(slot.vehicleTypeId) !== filterVehicle) return false;
      return true;
    });
  }, [slots, search, filterBuilding, filterVehicle]);

  const groupedBuildings = useMemo(() => {
    const map = new Map();
    filtered.forEach((slot) => {
      const buildingKey = String(slot.buildingId);
      if (!map.has(buildingKey)) {
        map.set(buildingKey, {
          id: buildingKey,
          name: slot.building,
          slots: [],
          floorsMap: new Map(),
        });
      }

      const building = map.get(buildingKey);
      building.slots.push(slot);

      const floorKey = `${slot.buildingId}_${slot.floorId}`;
      if (!building.floorsMap.has(floorKey)) {
        building.floorsMap.set(floorKey, {
          key: floorKey,
          floorId: slot.floorId,
          floor: slot.floor,
          slots: [],
          zonesMap: new Map(),
        });
      }

      const floor = building.floorsMap.get(floorKey);
      floor.slots.push(slot);

      if (!floor.zonesMap.has(slot.zoneId)) {
        floor.zonesMap.set(slot.zoneId, {
          id: slot.zoneId,
          name: slot.zone,
          vehicleType: slot.vehicleType,
          slots: [],
        });
      }

      floor.zonesMap.get(slot.zoneId).slots.push(slot);
    });

    return Array.from(map.values())
      .map((building) => ({
        id: building.id,
        name: building.name,
        stats: getStatusCounts(building.slots),
        floors: Array.from(building.floorsMap.values())
          .map((floor) => ({
            key: floor.key,
            floorId: floor.floorId,
            floor: floor.floor,
            stats: getStatusCounts(floor.slots),
            zones: Array.from(floor.zonesMap.values())
              .map((zone) => ({
                ...zone,
                stats: getStatusCounts(zone.slots),
                slots: [...zone.slots].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
              }))
              .sort(sortByName),
          }))
          .sort(sortByName),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [filtered]);

  useEffect(() => {
    const nextBuildingId = filterBuilding || groupedBuildings[0]?.id || "";
    setSelectedBuildingId((current) => {
      if (current && groupedBuildings.some((building) => building.id === current) && !filterBuilding) return current;
      return nextBuildingId;
    });
  }, [groupedBuildings, filterBuilding]);

  const activeBuilding = useMemo(() => {
    return groupedBuildings.find((building) => building.id === (filterBuilding || selectedBuildingId)) || groupedBuildings[0] || null;
  }, [groupedBuildings, filterBuilding, selectedBuildingId]);

  useEffect(() => {
    const firstFloorKey = activeBuilding?.floors?.[0]?.key || "";
    setSelectedFloorKey((current) => {
      if (current && activeBuilding?.floors?.some((floor) => floor.key === current)) return current;
      return firstFloorKey;
    });
  }, [activeBuilding]);

  const activeFloor = useMemo(() => {
    if (!activeBuilding) return null;
    return activeBuilding.floors.find((floor) => floor.key === selectedFloorKey) || activeBuilding.floors[0] || null;
  }, [activeBuilding, selectedFloorKey]);

  const stats = useMemo(() => getStatusCounts(filtered), [filtered]);

  const statCards = [
    { label: "Tong slot", value: stats.total, color: "var(--accent)" },
    { label: "Trong", value: stats.available, color: "#22c55e" },
    { label: "Co xe", value: stats.occupied, color: "#ef4444" },
    { label: "Da dat", value: stats.reserved, color: "#f59e0b" },
  ];

  function renderZoneBlock(zone) {
    return (
      <div
        key={zone.id}
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
          border: "1px solid var(--border)",
          borderRadius: "18px",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>{zone.name}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{zone.vehicleType}</div>
          </div>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(34,197,94,0.12)",
              color: "var(--accent)",
              fontSize: "0.72rem",
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {zone.stats.available}/{zone.stats.total}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))", gap: 8 }}>
          {zone.slots.map((slot) => (
            <div
              key={slot.id}
              title={`${slot.code} - ${slot.status}`}
              style={{
                borderRadius: 12,
                padding: "11px 8px",
                textAlign: "center",
                background: SLOT_COLORS[slot.status],
                color: "#fff",
                fontSize: "0.76rem",
                fontWeight: 800,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.03em",
                border: slot.rawStatus === "OCCUPIED" ? "2px solid rgba(255,255,255,0.18)" : "2px solid transparent",
                boxShadow: slot.rawStatus === "AVAILABLE" ? "inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
              }}
            >
              {slot.code.split("-").pop()}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`ps-landing ${themeClass}`} style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1260, margin: "0 auto", padding: "40px 24px 56px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            Ban do slot cong khai
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.94rem", marginTop: 8, maxWidth: 760 }}>
            Xem nhanh tung bai, tung tang va tinh trang cho trong theo thoi gian thuc. Du lieu tu dong cap nhat moi 15 giay.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 22 }}>
          {statCards.map((item) => (
            <div key={item.label} style={{ ...card, display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "var(--radius-sm)",
                  background: `${item.color}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: item.color }} />
              </div>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...card, display: "grid", gridTemplateColumns: "220px 180px minmax(220px, 1fr) auto", gap: 12, alignItems: "center", marginBottom: 24 }}>
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
          >
            <option value="">Tat ca bai do</option>
            {buildings.map((building) => (
              <option key={getBuildingId(building)} value={String(getBuildingId(building))}>
                {building.name}
              </option>
            ))}
          </select>

          <select
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
          >
            <option value="">Tat ca loai xe</option>
            {vehicleTypes.map((vehicle) => (
              <option key={getVehicleTypeId(vehicle)} value={String(getVehicleTypeId(vehicle))}>
                {vehicle.name}
              </option>
            ))}
          </select>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tim theo ma slot, zone, tang, bai do..."
            style={inputStyle}
          />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {Object.entries(SLOT_COLORS).map(([status, color]) => (
              <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
                {SLOT_LABELS[status]}
              </span>
            ))}
          </div>
        </div>

        {loading && slots.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Dang tai du lieu bai do...</p>
          </div>
        )}

        {error && (
          <div style={{ ...card, borderColor: "var(--danger)", background: "rgba(255,77,77,0.08)", color: "#ff6b6b", marginBottom: 24, fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Khong tim thay slot nao phu hop.</p>
          </div>
        )}

        {!loading && groupedBuildings.length > 0 && (
          <>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, marginBottom: 18 }}>
              {groupedBuildings.map((building) => {
                const active = activeBuilding?.id === building.id;
                return (
                  <button
                    key={building.id}
                    onClick={() => {
                      setFilterBuilding("");
                      setSelectedBuildingId(building.id);
                    }}
                    style={{
                      minWidth: 240,
                      textAlign: "left",
                      borderRadius: 18,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-dim)" : "var(--bg-elevated)",
                      color: "var(--text)",
                      padding: "16px 18px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 10 }}>{building.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)", fontSize: "0.76rem" }}>
                      <span>{building.floors.length} tang</span>
                      <span style={{ color: "var(--accent)", fontWeight: 700 }}>{building.stats.available}/{building.stats.total} trong</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeBuilding && (
              <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    padding: "22px 24px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text)" }}>{activeBuilding.name}</div>
                    <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginTop: 5 }}>
                      Dang hien thi {activeBuilding.stats.total} slot, trong do {activeBuilding.stats.available} slot con trong.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ padding: "8px 12px", borderRadius: 999, background: "rgba(34,197,94,0.12)", color: "var(--accent)", fontSize: "0.76rem", fontWeight: 700 }}>
                      Trong {activeBuilding.stats.available}
                    </span>
                    <span style={{ padding: "8px 12px", borderRadius: 999, background: "rgba(239,68,68,0.12)", color: "#f87171", fontSize: "0.76rem", fontWeight: 700 }}>
                      Co xe {activeBuilding.stats.occupied}
                    </span>
                    <span style={{ padding: "8px 12px", borderRadius: 999, background: "rgba(245,158,11,0.12)", color: "#fbbf24", fontSize: "0.76rem", fontWeight: 700 }}>
                      Dat truoc {activeBuilding.stats.reserved}
                    </span>
                  </div>
                </div>

                <div style={{ padding: "18px 24px 24px" }}>
                  {activeBuilding.floors.length > 1 && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                      {activeBuilding.floors.map((floor) => {
                        const active = activeFloor?.key === floor.key;
                        return (
                          <button
                            key={floor.key}
                            onClick={() => setSelectedFloorKey(floor.key)}
                            style={{
                              padding: "11px 16px",
                              borderRadius: 14,
                              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                              background: active ? "var(--accent-dim)" : "var(--bg-elevated)",
                              color: active ? "var(--accent)" : "var(--text-secondary)",
                              fontWeight: 700,
                              fontSize: "0.84rem",
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {floor.floor}
                            <span style={{ marginLeft: 8, opacity: 0.75, fontFamily: "'JetBrains Mono', monospace" }}>
                              {floor.stats.available}/{floor.stats.total}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeFloor && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--text)" }}>{activeFloor.floor}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                            {activeFloor.zones.length} khu vuc, {activeFloor.stats.available}/{activeFloor.stats.total} slot trong
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                        {activeFloor.zones.map((zone) => renderZoneBlock(zone))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 22, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Hien thi {filtered.length} / {slots.length} slot -
              <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600, marginLeft: 4 }}>
                Dang nhap de dat cho
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

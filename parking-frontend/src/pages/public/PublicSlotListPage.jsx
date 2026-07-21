import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { buildingApi } from "../../api/manager/buildingApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { getFloorPlan } from "../../config/buildingFloorPlans";
import { unwrapApiData } from "../../utils/api";
import { usePublicTheme } from "../../utils/publicTheme";
import "../../assets/css/landing.css";

function getBuildingId(item) { return item?.buildingId ?? item?.id; }
function getVehicleTypeId(item) { return item?.vehicleTypeId ?? item?.id; }

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
    floorNumber: item.zone?.floor?.floorNumber,
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
  Available: "Trống",
  Occupied: "Có xe",
  Reserved: "Đã đặt",
  Maintenance: "Bảo trì",
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

function chunkList(list, size) {
  const result = [];
  for (let i = 0; i < list.length; i += size) {
    result.push(list.slice(i, i + size));
  }
  return result;
}

function shortenFloorLabel(label, floorNumber) {
  if (floorNumber != null && floorNumber !== "") {
    return `T${floorNumber}`;
  }

  const text = String(label || "").trim();
  const match = text.match(/(\d+)/);
  if (match) {
    return `T${match[1]}`;
  }

  return text || "Tầng";
}

export default function PublicSlotListPage() {
  const { className: themeClass } = usePublicTheme();
  const [isCompact, setIsCompact] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const requestInFlightRef = useRef(false);
  const metaLoadedRef = useRef(false);
  const slotCacheRef = useRef(new Map());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setIsCompact(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadMeta = async () => {
    const [bRes, vtRes] = await Promise.all([buildingApi.getAll(), vehicleTypeApi.getAll()]);
    const bList = unwrapApiData(bRes.data, []);
    const vtList = unwrapApiData(vtRes.data, []);

    setBuildings(bList);
    setVehicleTypes(vtList);
    metaLoadedRef.current = true;

    return bList;
  };

  // Tai TOAN BO slot he thong trong 1 lan goi (thay vi truoc day phai goi rieng
  // tung building -> floor -> zone, hang tram request rieng le, cham va de mat
  // du lieu do timeout). Loc theo building/vehicle/tu khoa deu xu ly o client
  // (xem "filtered" ben duoi), khong can goi lai server khi doi bo loc.
  const loadData = async ({ silent = false, force = false } = {}) => {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (!metaLoadedRef.current || !buildings.length || !vehicleTypes.length) {
        await loadMeta();
      }

      if (!force && slotCacheRef.current.has("__all__")) {
        setSlots(slotCacheRef.current.get("__all__"));
        setError("");
        return;
      }

      const res = await parkingSlotApi.getPublicOverview();
      const slotList = unwrapApiData(res.data, []).map(normalizeSlot);
      slotCacheRef.current.set("__all__", slotList);
      setSlots(slotList);
      setError("");
    } catch (e) {
      console.error("Failed to load public slots", e);
      setError("Không thể tải dữ liệu bãi đỗ từ hệ thống.");
    } finally {
      requestInFlightRef.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      loadData({ silent: true, force: true });
    }, 15000);

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
            floorNumber: floor.slots[0]?.floorNumber ?? null,
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
    { label: "Bãi đỗ", value: buildings.length, color: "var(--accent)" },
    { label: "Còn trống", value: stats.available, color: "#22c55e" },
    { label: "Đang đỗ", value: stats.occupied, color: "#ef4444" },
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

  function renderZoneMap(floor) {
    const rows = chunkList(floor.zones, 3);
    const hasStaticPlan = Boolean(getFloorPlan(activeBuilding?.name, floor?.floorNumber));
    const minWidth = rows.some((row) => row.length >= 3) ? 980 : 720;

    return (
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
          padding: 18,
          overflowX: "auto",
        }}
      >
        <div style={{ minWidth }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ padding: "8px 14px", borderRadius: 999, background: "rgba(34,197,94,0.14)", color: "var(--accent)", fontSize: "0.73rem", fontWeight: 800 }}>
                CỔNG VÀO
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                {hasStaticPlan ? "Bố cục đã được canh theo floor plan." : "Bố cục zone đã được canh song song theo từng hàng."}
              </span>
            </div>
            <span style={{ padding: "8px 14px", borderRadius: 999, background: "rgba(239,68,68,0.14)", color: "#f87171", fontSize: "0.73rem", fontWeight: 800 }}>
              CỔNG RA
            </span>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            {rows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
                  {row.map((zone) => renderZoneBlock(zone))}
                  {row.length < 3 &&
                    Array.from({ length: 3 - row.length }).map((_, fillerIndex) => (
                      <div
                        key={`filler-${rowIndex}-${fillerIndex}`}
                        style={{
                          borderRadius: 18,
                          border: "1px dashed rgba(148,163,184,0.35)",
                          minHeight: 120,
                          background: "rgba(148,163,184,0.05)",
                        }}
                      />
                    ))}
                </div>

                {rowIndex < rows.length - 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px", alignItems: "center", gap: 18, margin: "2px 0 6px" }}>
                    <div style={{ height: 1, background: "rgba(148,163,184,0.22)" }} />
                    <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.72rem", letterSpacing: "0.22em", fontWeight: 800 }}>
                      ĐƯỜNG ĐI
                    </div>
                    <div style={{ height: 1, background: "rgba(148,163,184,0.22)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ps-landing ${themeClass}`} style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 1260, margin: "0 auto", padding: isCompact ? "24px 14px 40px" : "40px 24px 56px" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "1.7rem", fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
                Bản đồ slot công khai
              </h1>
            </div>
            {refreshing && slots.length > 0 ? (
              <span
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "rgba(34,197,94,0.12)",
                  color: "var(--accent)",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Đang cập nhật dữ liệu...
              </span>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(12, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {statCards.map((item) => (
            <div
              key={item.label}
              style={{
                gridColumn: isCompact ? "span 1" : "span 2",
                padding: isCompact ? "12px" : "12px 16px",
                borderRadius: 16,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                display: "flex",
                alignItems: isCompact ? "flex-start" : "center",
                gap: 12,
                minHeight: isCompact ? 104 : 88,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "var(--radius-sm)",
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: isCompact ? "1.12rem" : "1.2rem", fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{item.value}</div>
                <div style={{ fontSize: isCompact ? "0.76rem" : "0.78rem", color: "var(--text-muted)", marginTop: 4, wordBreak: "break-word" }}>{item.label}</div>
              </div>
            </div>
          ))}

          <div style={{ ...card, gridColumn: isCompact ? "1 / -1" : "span 6", padding: isCompact ? 14 : 16, minHeight: 88 }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
              Tìm bãi nhanh
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1.1fr 1fr 1.2fr", gap: 10, alignItems: "center" }}>
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }}
            >
              <option value="">Tất cả bãi đỗ</option>
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
              <option value="">Tất cả loại xe</option>
              {vehicleTypes.map((vehicle) => (
                <option key={getVehicleTypeId(vehicle)} value={String(getVehicleTypeId(vehicle))}>
                  {vehicle.name}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã slot, tầng hoặc tên bãi đỗ..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
            {Object.entries(SLOT_COLORS).slice(0, 3).map(([status, color]) => (
              <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
                {SLOT_LABELS[status]}
              </span>
            ))}
          </div>
          </div>
        </div>

        {loading && slots.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Đang tải dữ liệu bãi đỗ...</p>
          </div>
        )}

        {error && (
          <div style={{ ...card, borderColor: "var(--danger)", background: "rgba(255,77,77,0.08)", color: "#ff6b6b", marginBottom: 24, fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Không tìm thấy slot nào phù hợp.</p>
          </div>
        )}

        {!loading && groupedBuildings.length > 0 && (
          <>
            {activeBuilding && (
              <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "18px 24px 24px" }}>
                  {activeBuilding.floors.length > 1 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                        Chọn tầng
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
                            {shortenFloorLabel(floor.floor, floor.floorNumber)}
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  )}

                  {activeFloor && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: "1.02rem", fontWeight: 700, color: "var(--text)" }}>{activeFloor.floor}</div>
                        </div>
                      </div>

                      {renderZoneMap(activeFloor)}
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
              Hiển thị {filtered.length} / {slots.length} slot -
              <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600, marginLeft: 4 }}>
                Đăng nhập để đặt chỗ
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


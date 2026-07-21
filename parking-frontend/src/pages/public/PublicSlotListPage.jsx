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
    building: item.zone?.floor?.building?.name || "Toà nhà không xác định",
    floorId: item.zone?.floor?.floorId ?? item.zone?.floor?.id,
    floorNumber: item.zone?.floor?.floorNumber,
    floor: item.zone?.floor?.name || "Tầng không xác định",
    zoneId: item.zone?.zoneId ?? item.zone?.id,
    zone: item.zone?.name || "Khu vực không xác định",
    vehicleTypeId: item.zone?.vehicleType?.vehicleTypeId ?? item.zone?.vehicleType?.id,
    vehicleType: item.zone?.vehicleType?.name || "Loại xe không xác định",
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

  // Map refs
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

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

  // Khởi tạo Leaflet map khi chưa chọn bãi cụ thể
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (filterBuilding) {
      // Huỷ map khi đã chọn bãi
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
        setMapReady(false);
      }
      return;
    }

    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current || leafletRef.current) return;

      const map = L.map(mapRef.current, { center: [10.7769, 106.7009], zoom: 12 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = { map, L };
      setMapReady(true);
    });

    return () => {
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
        setMapReady(false);
      }
    };
  }, [filterBuilding]);

  // Vẽ markers khi map sẵn sàng và buildings đã load
  useEffect(() => {
    if (!mapReady || !leafletRef.current || filterBuilding) return;
    const { map, L } = leafletRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const withCoords = buildings.filter((b) => b.latitude != null && b.longitude != null);
    const bounds = [];

    withCoords.forEach((b) => {
      const bid = String(getBuildingId(b));
      const icon = L.divIcon({
        html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.4));">
          <div style="background:#059669;color:#fff;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid #fff;">
            <span style="transform:rotate(45deg);font-size:16px;font-weight:900;line-height:1;">P</span>
          </div>
          <div style="margin-top:4px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(15,23,42,0.92);color:#fff;padding:3px 8px;border-radius:12px;font-size:10px;font-weight:700;">${b.name}</div>
        </div>`,
        className: "",
        iconSize: [36, 58],
        iconAnchor: [18, 40],
        popupAnchor: [0, -42],
      });

      const marker = L.marker([Number(b.latitude), Number(b.longitude)], { icon })
        .addTo(map)
        .bindPopup(`<b style="font-size:13px">${b.name}</b><br/><span style="color:#059669;font-size:12px">Click để xem sơ đồ slot</span>`);

      marker.on("click", () => setFilterBuilding(bid));
      markersRef.current.push(marker);
      bounds.push([Number(b.latitude), Number(b.longitude)]);
    });

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [mapReady, buildings, filterBuilding]);

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
              title={`${slot.code} - ${SLOT_LABELS[slot.status]}`}
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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isCompact ? "20px 14px 48px" : "32px 28px 64px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: isCompact ? "1.35rem" : "1.55rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>
                {filterBuilding ? (activeBuilding?.name || "Bãi đỗ xe") : "Tìm bãi đỗ xe gần bạn"}
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: "0.83rem", color: "var(--text-muted)" }}>
                {filterBuilding
                  ? `${activeBuilding?.stats.available ?? 0} chỗ trống · ${activeBuilding?.stats.total ?? 0} tổng`
                  : `${buildings.length} bãi · ${stats.available} chỗ trống toàn hệ thống`}
              </p>
            </div>
            {refreshing && (
              <span style={{ fontSize: "0.76rem", color: "var(--accent)", fontWeight: 600 }}>Đang cập nhật...</span>
            )}
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: 14, padding: "12px 16px", color: "#ff6b6b", fontSize: "0.88rem", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* ════════════════════════════════
            MAP VIEW — chưa chọn bãi
            ════════════════════════════════ */}
        {!filterBuilding && (
          <>
            {/* Map */}
            <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 20 }}>
              <div ref={mapRef} style={{ height: isCompact ? 340 : 460, width: "100%" }} />
            </div>

            {/* Building cards */}
            {buildings.length > 0 && (
              <div>
                <p style={{ margin: "0 0 12px", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Chọn bãi xe
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>
                  {buildings.map((b) => {
                    const bid = String(getBuildingId(b));
                    const bData = groupedBuildings.find((g) => g.id === bid);
                    const avail = bData?.stats.available;
                    const total = bData?.stats.total;
                    const pct = bData && total ? Math.round((avail / total) * 100) : null;
                    const dotColor = pct == null ? "#64748b" : pct <= 20 ? "#ef4444" : pct <= 50 ? "#f59e0b" : "#22c55e";
                    const availLabel = loading ? "Đang tải..." : bData ? `${avail}/${total} trống` : "Chưa có dữ liệu";
                    return (
                      <button
                        key={bid}
                        onClick={() => setFilterBuilding(bid)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "14px 16px", borderRadius: 16,
                          border: "1px solid var(--border)", background: "var(--bg-elevated)",
                          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: "rgba(34,197,94,0.12)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1rem", fontWeight: 900, color: "var(--accent)",
                        }}>P</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.87rem", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {b.name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{availLabel}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loading && buildings.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Đang tải danh sách bãi...
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════
            DETAIL VIEW — đã chọn bãi
            ════════════════════════════════ */}
        {filterBuilding && (
          <>
            {/* Toolbar: back + switch building + vehicle type */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <button
                onClick={() => setFilterBuilding("")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 10,
                  border: "1px solid var(--border)", background: "var(--bg-elevated)",
                  color: "var(--text)", fontSize: "0.84rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ← Bản đồ
              </button>
              <select
                value={filterBuilding}
                onChange={(e) => setFilterBuilding(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: 160, flex: "1 1 160px", maxWidth: 280 }}
              >
                {buildings.map((b) => (
                  <option key={getBuildingId(b)} value={String(getBuildingId(b))}>{b.name}</option>
                ))}
              </select>
              <select
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: 130, flex: "0 0 auto" }}
              >
                <option value="">Tất cả loại xe</option>
                {vehicleTypes.map((vt) => (
                  <option key={getVehicleTypeId(vt)} value={String(getVehicleTypeId(vt))}>{vt.name}</option>
                ))}
              </select>
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Đang tải sơ đồ bãi...
              </div>
            )}

            {!loading && activeBuilding && (
              <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: isCompact ? "16px" : "20px 28px 28px" }}>

                  {/* Slot status summary */}
                  <div style={{ display: "flex", gap: isCompact ? 12 : 20, marginBottom: 20, flexWrap: "wrap" }}>
                    {[
                      { label: "Còn trống", value: activeBuilding.stats.available, color: "#22c55e" },
                      { label: "Đang đỗ",   value: activeBuilding.stats.occupied,  color: "#ef4444" },
                      { label: "Đã đặt",    value: activeBuilding.stats.reserved,  color: "#f59e0b" },
                      { label: "Tổng slot", value: activeBuilding.stats.total,     color: "var(--text-muted)" },
                    ].map((s) => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{s.label}</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>{s.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Floor tabs */}
                  {activeBuilding.floors.length > 1 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                      {activeBuilding.floors.map((floor) => {
                        const isActive = activeFloor?.key === floor.key;
                        return (
                          <button
                            key={floor.key}
                            onClick={() => setSelectedFloorKey(floor.key)}
                            style={{
                              padding: "9px 16px", borderRadius: 12,
                              border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                              background: isActive ? "var(--accent-dim)" : "transparent",
                              color: isActive ? "var(--accent)" : "var(--text-secondary)",
                              fontWeight: 700, fontSize: "0.84rem",
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            {shortenFloorLabel(floor.floor, floor.floorNumber)}
                            <span style={{ marginLeft: 6, fontSize: "0.72rem", opacity: 0.75 }}>
                              {floor.stats.available} trống
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Zone map */}
                  {activeFloor && (
                    <>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 14 }}>
                        {activeFloor.floor}
                      </div>
                      {renderZoneMap(activeFloor)}
                    </>
                  )}
                </div>
              </div>
            )}

            {!loading && !activeBuilding && !error && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
                Bãi này chưa có dữ liệu slot.
              </div>
            )}

            {/* Đăng nhập CTA */}
            {!loading && activeBuilding && (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Thấy chỗ ưng ý?&nbsp;
                  <Link to="/login" style={{ color: "var(--accent)", fontWeight: 700 }}>
                    Đăng nhập để đặt chỗ ngay
                  </Link>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


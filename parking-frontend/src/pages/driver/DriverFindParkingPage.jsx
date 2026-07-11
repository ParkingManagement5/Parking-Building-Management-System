import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarPlus,
  ChevronDown,
  ExternalLink,
  List as ListIcon,
  Map as MapIcon,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { pricingPolicyApi } from "../../api/driver/pricingPolicyApi";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { getFloorPlan } from "../../config/buildingFloorPlans";
import { DetailPanel, FloorTabs, ParkingMap, StaticFloorPlanMap, ZoomCtrl } from "./ParkingFloorPlan";
import { $fx, $i, $m, resolveMySession } from "./parkingFloorPlanUtils";
import "leaflet/dist/leaflet.css";

const vnd = (v) => new Intl.NumberFormat("vi-VN").format(v ?? 0);

function haversineKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function googleMapsDirectionsUrl(fromLat, fromLon, toLat, toLon) {
  return `https://www.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`;
}

// Muc do day cua bai — dung chung nguong voi phan tram slot da dung de to mau
// nhat quan giua the danh sach va marker tren ban do.
function occupancyState(pctTaken) {
  if (pctTaken >= 90) return "tight";
  if (pctTaken >= 60) return "filling";
  return "plenty";
}
const OCC_LABEL = { plenty: "Còn nhiều", filling: "Đang đầy dần", tight: "Sắp hết" };
const OCC_DOT = { plenty: "#059669", filling: "#d97706", tight: "#e11d48" };
const OCC_TEXT_CLASS = {
  plenty: "text-emerald-600 dark:text-emerald-400",
  filling: "text-amber-600 dark:text-amber-400",
  tight: "text-rose-600 dark:text-rose-400",
};
const OCC_BAR_CLASS = { plenty: "bg-emerald-500", filling: "bg-amber-500", tight: "bg-rose-500" };

function spreadNearbyBuildings(buildings) {
  const thresholdKm = 0.09;
  const groups = [];

  buildings.forEach((building) => {
    const matchedGroup = groups.find(
      (group) => haversineKm(group.anchor.latitude, group.anchor.longitude, building.latitude, building.longitude) <= thresholdKm
    );
    if (matchedGroup) matchedGroup.items.push(building);
    else groups.push({ anchor: building, items: [building] });
  });

  return groups.flatMap((group) => {
    if (group.items.length === 1) {
      return group.items.map((b) => ({ ...b, markerLat: b.latitude, markerLon: b.longitude, nearbyCount: 1 }));
    }
    const radius = 0.00028;
    return group.items.map((b, index) => {
      const angle = (Math.PI * 2 * index) / group.items.length;
      return {
        ...b,
        markerLat: b.latitude + Math.sin(angle) * radius,
        markerLon: b.longitude + Math.cos(angle) * radius,
        nearbyCount: group.items.length,
      };
    });
  });
}

export default function DriverFindParkingPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  const [allSlots, setAllSlots] = useState([]);
  const [pricingPolicies, setPricingPolicies] = useState([]);
  const [mySession, setMySession] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [vehicleType, setVehicleType] = useState("CAR");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("near");
  const [view, setView] = useState("list");
  const [expandedBuilding, setExpandedBuilding] = useState(null);
  const [activeBuildingId, setActiveBuildingId] = useState(null);

  // So do zone/slot chi tiet khi mo mot toa nha tren tab Ban do
  const [planFloorId, setPlanFloorId] = useState(null);
  const [planZoom, setPlanZoom] = useState(100);
  const [selSlot, setSelSlot] = useState(null);
  const [selSt, setSelSt] = useState(null);

  const [driverPos, setDriverPos] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    Promise.all([
      parkingSlotApi.getPublicOverview(),
      pricingPolicyApi.getAll(),
      bookingApi.getMyBookings(),
      driverSessionApi.getMySessions(),
    ])
      .then(([slotsRes, pricingRes, bookingsRes, sessionsRes]) => {
        setAllSlots(unwrapApiData(slotsRes.data, []));
        setPricingPolicies(unwrapApiData(pricingRes.data, []));
        setMySession(resolveMySession(unwrapApiData(bookingsRes.data, []), unwrapApiData(sessionsRes.data, [])));
        setLoadError("");
      })
      .catch(() => setLoadError("Không tải được dữ liệu bãi đỗ. Vui lòng thử lại."))
      .finally(() => setLoading(false));
  }, []);

  function requestGeo() {
    if (!navigator.geolocation) {
      setGeoError("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDriverPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(
          err.code === 1
            ? "Bạn đã từ chối quyền truy cập vị trí. Vui lòng cấp quyền trong trình duyệt."
            : "Không lấy được vị trí GPS. Vui lòng thử lại."
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => { requestGeo(); }, []);

  // Gia tham khao (HOURLY) thap nhat cho loai xe dang chon — gia trong he
  // thong nay ap dung chung cho moi toa nha (khong khac nhau theo toa nha),
  // nen chi can 1 con so tham khao, khong phai gia rieng tung bai.
  const referencePrice = useMemo(() => {
    const hourly = pricingPolicies.filter(
      (p) => p.isActive && !["DAILY", "WEEKLY", "MONTHLY"].includes(p.timeType) &&
        String(p.vehicleTypeId) === String(vehicleType === "CAR" ? 2 : 1)
    );
    if (!hourly.length) return null;
    return Math.min(...hourly.map((p) => Number(p.pricePerHour)));
  }, [pricingPolicies, vehicleType]);

  // Gom slot theo Toa nha -> Tang -> Zone, tinh tong/con trong theo dung loai
  // xe dang chon, phuc vu the danh sach, marker tren ban do, VA so do zone/slot
  // chi tiet (can giu lai TAT CA slot voi status that, khong chi loc AVAILABLE,
  // moi to mau dung khi ve so do).
  const buildingGroups = useMemo(() => {
    const buildings = new Map();
    for (const item of allSlots) {
      if ((item.zone?.vehicleType?.name || "").toUpperCase() !== vehicleType) continue;
      const building = item.zone?.floor?.building;
      const floorRaw = item.zone?.floor;
      const zoneRaw = item.zone;
      if (!building?.id || !floorRaw?.id || !zoneRaw?.id) continue;

      if (!buildings.has(building.id)) {
        buildings.set(building.id, {
          id: building.id, name: building.name, address: building.address,
          latitude: Number(building.latitude), longitude: Number(building.longitude),
          total: 0, free: 0, floors: new Map(),
        });
      }
      const b = buildings.get(building.id);
      b.total += 1;
      if (item.status === "AVAILABLE") b.free += 1;

      if (!b.floors.has(floorRaw.id)) {
        b.floors.set(floorRaw.id, { id: floorRaw.id, name: floorRaw.name, floorIndex: $fx(floorRaw), zones: new Map() });
      }
      const floor = b.floors.get(floorRaw.id);
      if (!floor.zones.has(zoneRaw.id)) {
        floor.zones.set(zoneRaw.id, { id: zoneRaw.id, name: zoneRaw.name, vehicleType: zoneRaw.vehicleType, slots: [] });
      }
      floor.zones.get(zoneRaw.id).slots.push(item);
    }

    return Array.from(buildings.values()).map((b) => {
      const pctTaken = b.total > 0 ? Math.round(((b.total - b.free) / b.total) * 100) : 0;
      return {
        ...b,
        pctTaken,
        state: occupancyState(pctTaken),
        floors: Array.from(b.floors.values())
          .map((f) => ({ ...f, zones: Array.from(f.zones.values()) }))
          .sort((a, c) => a.floorIndex - c.floorIndex),
        distKm: driverPos && Number.isFinite(b.latitude) && Number.isFinite(b.longitude)
          ? haversineKm(driverPos.lat, driverPos.lon, b.latitude, b.longitude)
          : null,
      };
    });
  }, [allSlots, vehicleType, driverPos]);

  const visibleBuildings = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = buildingGroups.filter(
      (b) => !q || b.name.toLowerCase().includes(q) || (b.address || "").toLowerCase().includes(q)
    );
    return list.sort((a, b) => {
      if (sort === "most") return b.free - a.free;
      return (a.distKm ?? Infinity) - (b.distKm ?? Infinity);
    });
  }, [buildingGroups, query, sort]);

  function handleBooking(building) {
    navigate("/driver/booking", { state: { buildingName: building.name } });
  }

  // ─── Leaflet map setup (giong pattern da dung o trang tim bai cu) ───────
  useEffect(() => {
    if (typeof window === "undefined" || view !== "map") return;

    import("leaflet").then((leafletModule) => {
      const leaflet = leafletModule.default || leafletModule;
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current || leafletRef.current) return;
      const map = leaflet.map(mapRef.current, { center: [10.7769, 106.7009], zoom: 13, zoomControl: true });
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        })
        .addTo(map);

      leafletRef.current = { map, leaflet };
      setMapReady(true);
    });

    return () => {
      if (leafletRef.current?.map) {
        leafletRef.current.map.remove();
        leafletRef.current = null;
        setMapReady(false);
      }
    };
  }, [view]);

  const plottedBuildings = useMemo(
    () => spreadNearbyBuildings(visibleBuildings.filter((b) => Number.isFinite(b.latitude) && Number.isFinite(b.longitude))),
    [visibleBuildings]
  );

  useEffect(() => {
    if (!mapReady || !leafletRef.current) return;
    const { map, leaflet } = leafletRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const bounds = [];

    plottedBuildings.forEach((building) => {
      const dist = formatDistance(building.distKm);
      const color = OCC_DOT[building.state];
      const isActive = activeBuildingId === building.id;
      const icon = leaflet.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.36));">
            <div style="
              background:${color}; color:#fff; width:${isActive ? 46 : 38}px; height:${isActive ? 46 : 38}px;
              border-radius:50% 50% 50% 0; transform:rotate(-45deg); display:flex; align-items:center; justify-content:center;
              border:3px solid #fff; ${isActive ? "outline:3px solid #0f172a;" : ""}
            "><span style="transform:rotate(45deg);font-size:12px;font-weight:900;line-height:1;">${building.free}</span></div>
            <div style="margin-top:4px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(15,23,42,0.92);color:#fff;padding:4px 8px;border-radius:12px;font-size:10px;font-weight:700;">${building.name}</div>
            ${building.nearbyCount > 1 ? `<div style="margin-top:4px;background:#f59e0b;color:#111827;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:800;">${building.nearbyCount} bãi gần nhau</div>` : ""}
          </div>`,
        className: "",
        iconSize: [40, building.nearbyCount > 1 ? 82 : 62],
        iconAnchor: [20, 44],
        popupAnchor: [0, -46],
      });

      const marker = leaflet
        .marker([building.markerLat, building.markerLon], { icon })
        .addTo(map)
        .bindPopup(
          `<b style="font-size:13px">${building.name}</b><br/><span style="color:#6b7280;font-size:12px">${building.address || ""}</span><br/><span style="color:${color};font-size:12px;font-weight:700">${building.free}/${building.total} chỗ trống — ${OCC_LABEL[building.state]}</span>${dist ? `<br/><span style="color:#059669;font-size:12px">Khoảng cách: ${dist}</span>` : ""}`
        )
        .on("click", () => setActiveBuildingId(building.id));

      markersRef.current.push(marker);
      bounds.push([building.latitude, building.longitude]);
    });

    if (driverPos) {
      const driverIcon = leaflet.divIcon({
        html: `<div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.36));">
          <div style="background:#2563eb;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;font-size:16px;">B</div>
          <div style="margin-top:4px;background:rgba(37,99,235,0.95);color:#fff;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;">Bạn</div>
        </div>`,
        className: "", iconSize: [36, 56], iconAnchor: [18, 36], popupAnchor: [0, -38],
      });
      const driverMarker = leaflet.marker([driverPos.lat, driverPos.lon], { icon: driverIcon }).addTo(map).bindPopup("<b>Vị trí của bạn</b>");
      markersRef.current.push(driverMarker);
      bounds.push([driverPos.lat, driverPos.lon]);
    }

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 });
  }, [mapReady, plottedBuildings, driverPos, activeBuildingId]);

  // ─── So do zone/slot chi tiet cua toa nha dang mo tren tab Ban do ────────
  const planBuilding = useMemo(
    () => (activeBuildingId != null ? buildingGroups.find((b) => b.id === activeBuildingId) : null),
    [buildingGroups, activeBuildingId]
  );

  // Chi to sang "slot cua ban" khi phien/booking dang active thuoc dung toa
  // nha nay — mo toa khac se khong to sang gi (dung nhu duyet binh thuong).
  const sessionForPlanBuilding = useMemo(() => {
    if (!mySession || !planBuilding) return null;
    return String(mySession.buildingId) === String(planBuilding.id) ? mySession : null;
  }, [mySession, planBuilding]);

  useEffect(() => {
    if (!planBuilding) { setPlanFloorId(null); setSelSlot(null); setSelSt(null); return; }
    const floorWithMine = sessionForPlanBuilding
      ? planBuilding.floors.find((f) => f.zones.some((z) => z.slots.some((s) => $m(s, sessionForPlanBuilding))))
      : null;
    setPlanFloorId((floorWithMine || planBuilding.floors[0])?.id ?? null);
    setSelSlot(null);
    setSelSt(null);
    setPlanZoom(100);
  }, [planBuilding, sessionForPlanBuilding]);

  const planFloor = planBuilding?.floors.find((f) => f.id === planFloorId) || planBuilding?.floors[0] || null;
  const planActiveZone = sessionForPlanBuilding && planFloor
    ? planFloor.zones.find((z) => z.slots.some((s) => $m(s, sessionForPlanBuilding)))
    : null;
  const planStaticLayout = planBuilding && planFloor ? getFloorPlan(planBuilding.name, planFloor.floorIndex) : null;
  const selSlotZone = selSlot && planFloor ? planFloor.zones.find((z) => z.slots.some((s) => $i(s) === $i(selSlot))) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">Tìm chỗ đỗ</h1>
          <p className="text-sm text-muted-foreground">Xem toà nhà nào còn nhiều chỗ, so khoảng cách, và đặt chỗ ngay.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search size={14} className="shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên bãi, quận…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
            {[["CAR", "🚗 Ô tô"], ["MOTORBIKE", "🏍️ Xe máy"]].map(([val, label]) => (
              <button key={val} type="button" onClick={() => { setVehicleType(val); setExpandedBuilding(null); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${vehicleType === val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>

          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none">
            <option value="near">Sắp xếp: Gần nhất</option>
            <option value="most">Sắp xếp: Nhiều chỗ nhất</option>
          </select>

          <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
            <button type="button" onClick={() => setView("list")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <ListIcon size={13} /> Danh sách
            </button>
            <button type="button" onClick={() => setView("map")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${view === "map" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <MapIcon size={13} /> Bản đồ
            </button>
          </div>

          <button type="button" onClick={requestGeo} disabled={geoLoading}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground">
            {geoLoading ? <RefreshCw size={13} className="animate-spin" /> : <Navigation size={13} />}
            {geoLoading ? "Đang lấy vị trí..." : "Cập nhật vị trí"}
          </button>
        </div>

        {geoError && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /><span>{geoError}</span>
          </div>
        )}
        {loadError && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertCircle size={13} className="mt-0.5 shrink-0" /><span>{loadError}</span>
          </div>
        )}
      </div>

      {!loading && visibleBuildings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          Không tìm thấy bãi nào phù hợp{query ? ` với "${query}"` : ""} cho loại xe này.
        </div>
      )}

      {view === "list" && visibleBuildings.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleBuildings.map((b) => {
            const isOpen = expandedBuilding === b.id;
            return (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{b.address}</p>
                  </div>
                  {b.distKm != null && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      <MapPin size={9} /> {formatDistance(b.distKm)}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      <span className="font-mono">{b.free}</span>/<span className="font-mono">{b.total}</span> trống
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${OCC_TEXT_CLASS[b.state]}`}>{OCC_LABEL[b.state]}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${OCC_BAR_CLASS[b.state]}`} style={{ width: `${100 - b.pctTaken}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Từ <span className="font-mono font-semibold text-foreground">{referencePrice != null ? `${vnd(referencePrice)}đ` : "--"}</span>/giờ
                  </span>
                  {b.free > 0 && (
                    <button type="button" onClick={() => setExpandedBuilding(isOpen ? null : b.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      Xem theo tầng/khu <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="mt-3 space-y-2.5 rounded-xl border border-border bg-muted/30 p-3">
                    {b.floors.map((floor) => {
                      const zonesWithFree = floor.zones
                        .map((zone) => ({ ...zone, freeSlots: zone.slots.filter((s) => s.status === "AVAILABLE") }))
                        .filter((zone) => zone.freeSlots.length > 0);
                      if (zonesWithFree.length === 0) return null;
                      return (
                        <div key={floor.id}>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{floor.name}</p>
                          {zonesWithFree.map((zone) => (
                            <div key={zone.id} className="mb-1.5 last:mb-0">
                              <div className="mb-1 flex items-center justify-between text-[11px]">
                                <span className="font-medium text-foreground">{zone.name}</span>
                                <span className="text-muted-foreground">{zone.freeSlots.length} vị trí</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {zone.freeSlots.map((slot) => (
                                  <span key={slot.id} className="rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    {slot.slotCode}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  {driverPos && Number.isFinite(b.latitude) && Number.isFinite(b.longitude) && (
                    <a href={googleMapsDirectionsUrl(driverPos.lat, driverPos.lon, b.latitude, b.longitude)} target="_blank" rel="noopener noreferrer"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted">
                      <ExternalLink size={11} /> Chỉ đường
                    </a>
                  )}
                  <button type="button" onClick={() => handleBooking(b)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">
                    <CalendarPlus size={11} /> Đặt chỗ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "map" && (
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-border" style={{ height: 560 }}>
            <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
          </div>
          <div className="max-h-[560px] space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-2.5">
            {visibleBuildings.map((b) => (
              <button key={b.id} type="button" onClick={() => setActiveBuildingId(b.id)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${activeBuildingId === b.id ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"}`}>
                <span className="size-2 shrink-0 rounded-full" style={{ background: OCC_DOT[b.state] }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">{b.name}</span>
                  <span className="block text-[10.5px] text-muted-foreground">
                    {b.distKm != null ? `${formatDistance(b.distKm)} · ` : ""}{OCC_LABEL[b.state]}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[11px] font-bold text-foreground">{b.free}/{b.total}</span>
              </button>
            ))}
          </div>

          {planBuilding && (
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{planBuilding.name}</p>
                  <h2 className="text-base font-bold text-foreground">Sơ đồ {planFloor ? planFloor.name : "tầng"}</h2>
                  {sessionForPlanBuilding && (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      <MapPin size={11} /> Bạn có slot {sessionForPlanBuilding.slotCode} tại toà này
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setActiveBuildingId(null)}
                  className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  <X size={14} />
                </button>
              </div>

              {planFloor ? (
                <div className="grid gap-3 xl:grid-cols-[1fr_240px]">
                  <div className="space-y-2">
                    {planStaticLayout
                      ? <StaticFloorPlanMap plan={planStaticLayout} sections={planFloor.zones} session={sessionForPlanBuilding}
                          activeZone={planActiveZone} zoom={planZoom} onSlotClick={(slot, st) => { setSelSlot(slot); setSelSt(st); }} />
                      : <ParkingMap sections={planFloor.zones} session={sessionForPlanBuilding} activeZone={planActiveZone}
                          zoom={planZoom} onSlotClick={(slot, st) => { setSelSlot(slot); setSelSt(st); }}
                          floorIdx={planFloor.floorIndex} totalFloors={planBuilding.floors.length} />}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FloorTabs floors={planBuilding.floors} selectedId={planFloor.id} onSelect={setPlanFloorId} />
                      <ZoomCtrl zoom={planZoom} onZoom={(d) => setPlanZoom((z) => Math.max(60, Math.min(200, z + d)))}
                        onReset={() => setPlanZoom(100)} onFs={() => {}} />
                    </div>
                  </div>
                  <aside>
                    {selSlot
                      ? <DetailPanel slot={selSlot} st={selSt} session={sessionForPlanBuilding} zone={selSlotZone} floor={planFloor} />
                      : <div className="rounded-2xl border border-border bg-background p-5 text-center">
                          <MapPin className="mx-auto size-5 text-muted-foreground mb-2" />
                          <p className="text-[10px] text-muted-foreground">Bấm vào 1 vị trí để xem chi tiết</p>
                        </div>}
                  </aside>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Toà nhà này chưa có dữ liệu sơ đồ.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

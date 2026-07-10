import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, RefreshCw, AlertCircle, Building2, ExternalLink, CalendarPlus } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { unwrapApiData } from "../../utils/api";
import "leaflet/dist/leaflet.css";

/* ── Occupancy badge ── */
function OccupancyBadge({ pct, available, total }) {
  if (pct == null) return null;
  const label = pct >= 80 ? "Gần đầy" : pct >= 50 ? "Trung bình" : "Còn trống";
  const dot =
    pct >= 80 ? "bg-rose-500" : pct >= 50 ? "bg-amber-400" : "bg-emerald-500";
  const cls =
    pct >= 80
      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
      : pct >= 50
      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label} · {pct}% · {available}/{total} slot
    </span>
  );
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function googleMapsDirectionsUrl(fromLat, fromLon, toLat, toLon) {
  return `https://www.google.com/maps/dir/${fromLat},${fromLon}/${toLat},${toLon}`;
}

function getBuildingId(building) {
  return building?.buildingId ?? building?.id;
}

function normalizeBuilding(building) {
  return {
    ...building,
    id: getBuildingId(building),
    latitude: Number(building.latitude),
    longitude: Number(building.longitude),
  };
}

function spreadNearbyBuildings(buildings) {
  const thresholdKm = 0.09;
  const groups = [];

  buildings.forEach((building) => {
    const matchedGroup = groups.find((group) =>
      haversineKm(group.anchor.latitude, group.anchor.longitude, building.latitude, building.longitude) <= thresholdKm
    );

    if (matchedGroup) {
      matchedGroup.items.push(building);
    } else {
      groups.push({ anchor: building, items: [building] });
    }
  });

  return groups.flatMap((group) => {
    if (group.items.length === 1) {
      return group.items.map((building) => ({
        ...building,
        markerLat: building.latitude,
        markerLon: building.longitude,
        nearbyCount: 1,
      }));
    }

    const radius = 0.00028;
    return group.items.map((building, index) => {
      const angle = (Math.PI * 2 * index) / group.items.length;
      return {
        ...building,
        markerLat: building.latitude + Math.sin(angle) * radius,
        markerLon: building.longitude + Math.cos(angle) * radius,
        nearbyCount: group.items.length,
      };
    });
  });
}

export default function DriverFindBuildingPage() {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef([]);

  const [buildings, setBuildings] = useState([]);
  const [occupancyMap, setOccupancyMap] = useState({}); // buildingId → {occupancyPercent, availableSlots, totalSlots}
  const [driverPos, setDriverPos] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [dataError, setDataError] = useState("");
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Fetch danh sách bãi và tình trạng lấp đầy song song
    Promise.all([
      buildingApi.getAll(),
      buildingApi.getAvailability().catch(() => null), // graceful fallback nếu endpoint chưa có
    ]).then(([buildingRes, availRes]) => {
      const list = unwrapApiData(buildingRes.data, []);
      setBuildings(
        list
          .filter((b) => b.latitude != null && b.longitude != null)
          .map(normalizeBuilding)
      );
      setDataError("");

      if (availRes) {
        const raw = unwrapApiData(availRes.data, []);
        const map = {};
        raw.forEach((item) => {
          map[item.buildingId] = item;
        });
        setOccupancyMap(map);
      }
    }).catch((err) => {
      setBuildings([]);
      setDataError(err.response?.data?.message || "Khong tai duoc danh sach bai do co toa do.");
    }).finally(() => setLoading(false));
  }, []);

  function requestGeo() {
    if (!navigator.geolocation) {
      setGeoError("Trinh duyet khong ho tro dinh vi GPS.");
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
            ? "Ban da tu choi quyen truy cap vi tri. Vui long cap quyen trong trinh duyet."
            : "Khong lay duoc vi tri GPS. Vui long thu lai."
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    requestGeo();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((leafletModule) => {
      const leaflet = leafletModule.default || leafletModule;

      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current || leafletRef.current) return;

      const map = leaflet.map(mapRef.current, {
        center: [10.7769, 106.7009],
        zoom: 13,
        zoomControl: true,
      });

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
      }
    };
  }, []);

  const plottedBuildings = useMemo(() => spreadNearbyBuildings(buildings), [buildings]);

  useEffect(() => {
    if (!mapReady || !leafletRef.current) return;
    const { map, leaflet } = leafletRef.current;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = [];

    plottedBuildings.forEach((building) => {
      const dist = driverPos
        ? formatDistance(haversineKm(driverPos.lat, driverPos.lon, building.latitude, building.longitude))
        : null;

      const buildingIcon = leaflet.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.36));">
            <div style="
              background:#059669;
              color:#fff;
              width:40px;
              height:40px;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              display:flex;
              align-items:center;
              justify-content:center;
              border:3px solid #fff;
            ">
              <span style="transform:rotate(45deg);font-size:18px;font-weight:900;line-height:1;">P</span>
            </div>
            <div style="
              margin-top:4px;
              max-width:145px;
              overflow:hidden;
              text-overflow:ellipsis;
              white-space:nowrap;
              background:rgba(15,23,42,0.92);
              color:#fff;
              padding:4px 8px;
              border-radius:12px;
              font-size:10px;
              font-weight:700;
            ">${building.name}</div>
            ${building.nearbyCount > 1 ? `<div style="margin-top:4px;background:#f59e0b;color:#111827;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:800;">${building.nearbyCount} bai gan nhau</div>` : ""}
          </div>`,
        className: "",
        iconSize: [40, building.nearbyCount > 1 ? 82 : 62],
        iconAnchor: [20, 44],
        popupAnchor: [0, -46],
      });

      const occ = occupancyMap[building.id];
      const occHtml = occ
        ? `<br/><span style="font-size:12px;color:${occ.occupancyPercent >= 80 ? "#e11d48" : occ.occupancyPercent >= 50 ? "#d97706" : "#059669"};font-weight:600;">${occ.occupancyPercent >= 80 ? "🔴 Gần đầy" : occ.occupancyPercent >= 50 ? "🟡 Trung bình" : "🟢 Còn trống"} ${occ.occupancyPercent}% · Còn ${occ.availableSlots}/${occ.totalSlots} slot</span>`
        : "";
      const marker = leaflet
        .marker([building.markerLat, building.markerLon], { icon: buildingIcon })
        .addTo(map)
        .bindPopup(
          `<b style="font-size:13px">${building.name}</b><br/><span style="color:#6b7280;font-size:12px">${building.address || ""}</span>${dist ? `<br/><span style="color:#059669;font-size:12px">Khoang cach: ${dist}</span>` : ""}${occHtml}${building.nearbyCount > 1 ? `<br/><span style="color:#f59e0b;font-size:12px">Cum khu vuc nay co ${building.nearbyCount} bai do o rat gan nhau. Marker da duoc tach nhe de de nhin.</span>` : ""}`
        );

      markersRef.current.push(marker);
      bounds.push([building.latitude, building.longitude]);
    });

    if (driverPos) {
      const driverIcon = leaflet.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.36));">
            <div style="
              background:#2563eb;
              color:#fff;
              width:40px;
              height:40px;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              border:3px solid #fff;
              font-size:18px;
            ">U</div>
            <div style="
              margin-top:4px;
              background:rgba(37,99,235,0.95);
              color:#fff;
              padding:3px 8px;
              border-radius:999px;
              font-size:10px;
              font-weight:700;
            ">Ban</div>
          </div>`,
        className: "",
        iconSize: [40, 60],
        iconAnchor: [20, 40],
        popupAnchor: [0, -42],
      });

      const driverMarker = leaflet
        .marker([driverPos.lat, driverPos.lon], { icon: driverIcon })
        .addTo(map)
        .bindPopup("<b>Vi tri cua ban</b>");

      markersRef.current.push(driverMarker);
      bounds.push([driverPos.lat, driverPos.lon]);
    }

    // Fit toan bo marker (tat ca bai + vi tri driver) vao khung hinh, giong
    // hanh vi ban dau — dam bao luon thay het cac bai tren map thay vi chi
    // thay vi tri driver khi driver o rat xa cac bai.
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 });
    }
  }, [mapReady, plottedBuildings, driverPos, occupancyMap]);

  function handleBooking(building) {
    navigate("/driver/booking", { state: { buildingName: building.name } });
  }

  const buildingsWithDistance = useMemo(() => {
    return [...buildings]
      .map((building) => ({
        ...building,
        distKm: driverPos ? haversineKm(driverPos.lat, driverPos.lon, building.latitude, building.longitude) : null,
      }))
      .sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
  }, [buildings, driverPos]);

  const nearbyClusterCount = useMemo(() => {
    const multiMarkerIds = new Set(plottedBuildings.filter((building) => building.nearbyCount > 1).map((building) => building.id));
    return multiMarkerIds.size;
  }, [plottedBuildings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tim bai do xe</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ban do duoc tach marker ro hon khi cac bai nam qua sat nhau.
          </p>
        </div>
        <button
          onClick={requestGeo}
          disabled={geoLoading}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-muted"
        >
          {geoLoading ? <RefreshCw size={14} className="animate-spin" /> : <Navigation size={14} />}
          {geoLoading ? "Dang lay vi tri..." : "Cap nhat vi tri"}
        </button>
      </div>

      {geoError && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {dataError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{dataError}</span>
        </div>
      )}

      {driverPos && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          Vi tri cua ban: {driverPos.lat.toFixed(6)}, {driverPos.lon.toFixed(6)}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border" style={{ height: 560 }}>
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">5 bãi gần bạn nhất</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? "Dang phan tich vi tri..." : `Trong tong so ${buildingsWithDistance.length} bai dang hien thi tren map.`}
            </p>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>So bai: <strong className="text-foreground">{buildingsWithDistance.length}</strong></span>
            <span>Marker tach: <strong className="text-foreground">{nearbyClusterCount}</strong></span>
          </div>
        </div>

        {!loading && buildingsWithDistance.length === 0 && (
          <div className="rounded-2xl border border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
            {dataError
              ? "Khong the hien thi danh sach bai do vi du lieu toa nha dang loi."
              : "Chua co bai do xe nao duoc cau hinh toa do. Manager co the them lat/lng trong muc toa nha."}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {buildingsWithDistance.slice(0, 5).map((building) => (
            <div key={building.id} className="rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
                  <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{building.name}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{building.address}</p>
                  {building.distKm != null && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <MapPin size={10} />
                      {formatDistance(building.distKm)} tu ban
                    </p>
                  )}
                  {occupancyMap[building.id] && (
                    <div className="mt-2">
                      <OccupancyBadge
                        pct={occupancyMap[building.id].occupancyPercent}
                        available={occupancyMap[building.id].availableSlots}
                        total={occupancyMap[building.id].totalSlots}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {driverPos && building.latitude && building.longitude && (
                  <a
                    href={googleMapsDirectionsUrl(driverPos.lat, driverPos.lon, building.latitude, building.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
                  >
                    <ExternalLink size={11} />
                    Chỉ đường
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleBooking(building)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs text-white transition hover:bg-emerald-700"
                >
                  <CalendarPlus size={11} />
                  Đặt chỗ
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          Neu 2 bai o qua gan nhau, marker se duoc dan nhe thanh vong tron nho de de bam va de nhin hon.
        </div>
      </div>
    </div>
  );
}

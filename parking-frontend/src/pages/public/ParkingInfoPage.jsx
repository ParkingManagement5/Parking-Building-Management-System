import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { gateApi } from "../../api/manager/gateApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { unwrapApiData } from "../../utils/api";

function getBuildingId(item) { return item?.buildingId ?? item?.id; }
function getFloorId(item) { return item?.floorId ?? item?.id; }
function getZoneId(item) { return item?.zoneId ?? item?.id; }
function getSettledData(result, fallback = []) {
  return result?.status === "fulfilled" ? unwrapApiData(result.value?.data, fallback) : fallback;
}
function formatTime(value) { return value?.slice(0, 5) || "--:--"; }

const card = { background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 };

export default function ParkingInfoPage() {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await buildingApi.getAll();
        const list = unwrapApiData(res.data, []);
        const summaries = await Promise.all(list.map(async (b) => {
          const bid = getBuildingId(b);
          const [floorRes, gateRes] = await Promise.allSettled([floorApi.getByBuilding(bid), gateApi.getByBuilding(bid)]);
          const floors = getSettledData(floorRes); const gates = getSettledData(gateRes);
          const zoneRes = await Promise.allSettled(floors.map((f) => zoneApi.getByFloor(getFloorId(f))));
          const zones = zoneRes.flatMap((r) => getSettledData(r));
          const slotRes = await Promise.allSettled(zones.map((z) => parkingSlotApi.getByZone(getZoneId(z))));
          const slots = slotRes.flatMap((r) => getSettledData(r));
          return { ...b, id: bid, floorCount: floors.length, gateCount: gates.length, slotCount: slots.length,
            availableSlots: slots.filter((s) => String(s.status || "").toUpperCase() === "AVAILABLE").length };
        }));
        if (!cancelled) setBuildings(summaries);
      } catch { if (!cancelled) setBuildings([]); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Thông tin bãi đỗ xe
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: 6 }}>
          Danh sách các tòa nhà bãi đỗ xe trong hệ thống — dữ liệu realtime từ backend
        </p>
      </div>

      {loading && (
        <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Đang tải dữ liệu...</p>
        </div>
      )}

      {!loading && buildings.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Chưa có tòa nhà nào trong hệ thống.</p>
        </div>
      )}

      {/* Building cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {buildings.map((item) => (
          <div key={item.id} style={{ ...card }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text)" }}>{item.name}</h2>
                <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: 4 }}>
                  📍 {item.address || "Chưa có địa chỉ"}
                </p>
              </div>
              <span style={{
                padding: "5px 14px", borderRadius: 100, fontSize: "0.75rem", fontWeight: 600,
                background: item.isActive !== false ? "var(--accent-dim)" : "rgba(100,100,100,0.1)",
                color: item.isActive !== false ? "var(--accent)" : "var(--text-muted)",
              }}>
                {item.isActive !== false ? "Đang hoạt động" : "Tạm đóng"}
              </span>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Tầng", value: item.floorCount, color: "var(--text)" },
                { label: "Cổng", value: item.gateCount, color: "var(--text)" },
                { label: "Tổng slot", value: item.slotCount, color: "var(--text)" },
                { label: "Trống", value: item.availableSlots, color: "var(--accent)" },
              ].map((s) => (
                <div key={s.label} style={{
                  background: s.label === "Trống" ? "var(--accent-dim)" : "var(--bg-section)",
                  borderRadius: "var(--radius-sm)", padding: "14px 16px",
                }}>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Footer info */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <span>🕐 {formatTime(item.openTime)} - {formatTime(item.closeTime)}</span>
              {item.phone && <span>📞 {item.phone}</span>}
              {item.email && <span>✉ {item.email}</span>}
            </div>

            {item.description && (
              <p style={{ marginTop: 12, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {item.description}
              </p>
            )}

            {/* Action */}
            <div style={{ marginTop: 16 }}>
              <button onClick={() => navigate("/public-slots")}
                style={{
                  padding: "10px 20px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--accent)",
                  background: "transparent", color: "var(--accent)", fontWeight: 600, fontSize: "0.85rem",
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#000"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
              >
                Xem slot trống →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { zoneApi } from "../../api/manager/zoneApi";
import {
  ManagerField, ManagerPageHeader, ManagerPrimaryButton, ManagerSecondaryButton, ManagerSelect,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";
import { getAssignedBuildingId, getRole } from "../../utils/auth";

// Prototype kéo-thả sơ đồ mặt bằng: chỉ lưu localStorage, CHƯA
// ghi xuống DB. Mục đích là duyệt UX/toa độ trước khi build
// cột pos_x/pos_y/width/height + API thật cho Zone.
const VB_W = 900;
const VB_H = 520;
const PAD = 16;
const GAP = 14;
const COLS = 3;
const MIN_W = 90;
const MIN_H = 70;

function getBuildingId(item) { return item?.buildingId ?? item?.id; }
function getFloorId(item) { return item?.floorId ?? item?.id; }
function getZoneId(item) { return item?.zoneId ?? item?.id; }

function clamp(value, min, max) { return Math.min(Math.max(value, min), Math.max(min, max)); }

function buildDefaultLayout(zones) {
  const rows = Math.max(1, Math.ceil(zones.length / COLS));
  const zw = (VB_W - PAD * 2 - (COLS - 1) * GAP) / COLS;
  const zh = Math.max(120, Math.min(190, (VB_H - PAD * 2 - (rows - 1) * GAP) / rows));
  const layout = {};
  zones.forEach((zone, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    layout[getZoneId(zone)] = {
      x: PAD + col * (zw + GAP),
      y: PAD + row * (zh + GAP),
      w: zw,
      h: zh,
    };
  });
  return layout;
}

function loadDraft(floorId) {
  try {
    return JSON.parse(localStorage.getItem(`parkingFloorPlanDraft:${floorId}`) || "null");
  } catch {
    return null;
  }
}

export default function FloorPlanEditorPage() {
  const isManager = getRole() === "MANAGER";
  const assignedBuildingId = getAssignedBuildingId();

  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(isManager ? String(assignedBuildingId || "") : "");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [layout, setLayout] = useState({});
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  const svgRef = useRef(null);

  useEffect(() => {
    async function loadBuildings() {
      try {
        const res = await buildingApi.getAll();
        setBuildings(unwrapApiData(res.data, []));
      } catch (error) {
        console.error("Failed to load buildings", error);
      }
    }
    void loadBuildings();
  }, []);

  useEffect(() => {
    async function loadFloors() {
      if (!selectedBuildingId) {
        setFloors([]);
        setSelectedFloorId("");
        return;
      }
      try {
        const res = await floorApi.getByBuilding(selectedBuildingId);
        const list = unwrapApiData(res.data, []);
        setFloors(list);
        setSelectedFloorId(list.length > 0 ? String(getFloorId(list[0])) : "");
      } catch (error) {
        console.error("Failed to load floors", error);
      }
    }
    void loadFloors();
  }, [selectedBuildingId]);

  useEffect(() => {
    async function loadZonesAndLayout() {
      if (!selectedFloorId) {
        setZones([]);
        setLayout({});
        return;
      }
      try {
        const res = await zoneApi.getByFloor(selectedFloorId);
        const list = unwrapApiData(res.data, []).filter((z) => z.isActive !== false);
        setZones(list);
        const saved = loadDraft(selectedFloorId);
        const zoneIds = list.map(getZoneId);
        const hasAllZones = saved && zoneIds.every((id) => saved[id]);
        setLayout(hasAllZones ? saved : buildDefaultLayout(list));
        setSelectedZoneId("");
      } catch (error) {
        console.error("Failed to load zones", error);
      }
    }
    void loadZonesAndLayout();
  }, [selectedFloorId]);

  useEffect(() => {
    if (!selectedFloorId || Object.keys(layout).length === 0) return;
    localStorage.setItem(`parkingFloorPlanDraft:${selectedFloorId}`, JSON.stringify(layout));
  }, [selectedFloorId, layout]);

  const scopedBuildings = useMemo(
    () => (isManager ? buildings.filter((b) => String(getBuildingId(b)) === String(assignedBuildingId)) : buildings),
    [isManager, buildings, assignedBuildingId]
  );

  const selectedBuilding = useMemo(
    () => buildings.find((b) => String(getBuildingId(b)) === String(selectedBuildingId)),
    [buildings, selectedBuildingId]
  );
  const selectedFloor = useMemo(
    () => floors.find((f) => String(getFloorId(f)) === String(selectedFloorId)),
    [floors, selectedFloorId]
  );

  function startDrag(e, zoneId, mode) {
    e.stopPropagation();
    e.preventDefault();
    setSelectedZoneId(zoneId);

    const rect = svgRef.current?.getBoundingClientRect();
    const scale = rect ? VB_W / rect.width : 1;
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...layout[zoneId] };

    function onMove(ev) {
      const dx = (ev.clientX - startX) * scale;
      const dy = (ev.clientY - startY) * scale;
      setLayout((prev) => {
        const cur = prev[zoneId] || orig;
        if (mode === "move") {
          const nx = clamp(orig.x + dx, PAD, VB_W - PAD - cur.w);
          const ny = clamp(orig.y + dy, PAD, VB_H - PAD - cur.h);
          return { ...prev, [zoneId]: { ...cur, x: nx, y: ny } };
        }
        const nw = clamp(orig.w + dx, MIN_W, VB_W - PAD - orig.x);
        const nh = clamp(orig.h + dy, MIN_H, VB_H - PAD - orig.y);
        return { ...prev, [zoneId]: { ...cur, w: nw, h: nh } };
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function resetLayout() {
    if (!window.confirm("Đặt lại lưới mặc định cho tầng này? Toạ độ đã kéo sẽ mất.")) return;
    setLayout(buildDefaultLayout(zones));
  }

  const exportCode = useMemo(() => {
    if (!selectedBuilding || !selectedFloor || zones.length === 0) return "";
    const key = `${selectedBuilding.name}|${selectedFloor.floorNumber}`;
    const zoneLines = zones
      .map((zone) => {
        const box = layout[getZoneId(zone)];
        if (!box) return null;
        return `      { match: "${zone.name}", x: ${Math.round(box.x)}, y: ${Math.round(box.y)}, w: ${Math.round(box.w)}, h: ${Math.round(box.h)} },`;
      })
      .filter(Boolean)
      .join("\n");
    return `"${key}": {\n    vbW: ${VB_W}, vbH: ${VB_H},\n    bg: "#eef2f8",\n    decorations: [\n      // TODO: thêm tường/cổng/làn xe cho khớp bản vẽ thật\n    ],\n    zones: [\n${zoneLines}\n    ],\n  },`;
  }, [selectedBuilding, selectedFloor, zones, layout]);

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  }

  return (
    <div className="space-y-4">
      <ManagerPageHeader
        title="Sơ đồ mặt bằng (bản dựng thử)"
        description="Kéo-thả để xếp vị trí khu vực. Toạ độ chỉ lưu tạm trên trình duyệt này (localStorage), chưa ghi vào database — dùng để duyệt bố cục trước khi build tính năng lưu thật."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ManagerField label="Toà nhà">
          <ManagerSelect value={selectedBuildingId} onChange={(e) => setSelectedBuildingId(e.target.value)}>
            <option value="">-- Chọn toà nhà --</option>
            {scopedBuildings.map((b) => (
              <option key={getBuildingId(b)} value={getBuildingId(b)}>{b.name}</option>
            ))}
          </ManagerSelect>
        </ManagerField>
        <ManagerField label="Tầng">
          <ManagerSelect value={selectedFloorId} onChange={(e) => setSelectedFloorId(e.target.value)} disabled={floors.length === 0}>
            {floors.map((f) => (
              <option key={getFloorId(f)} value={getFloorId(f)}>{f.name || `Tầng ${f.floorNumber}`}</option>
            ))}
          </ManagerSelect>
        </ManagerField>
        <div className="flex items-end gap-2">
          <ManagerSecondaryButton onClick={resetLayout} disabled={zones.length === 0} className="flex items-center gap-1.5">
            <RotateCcw size={14} /> Đặt lại lưới
          </ManagerSecondaryButton>
          <ManagerPrimaryButton onClick={() => setShowExport((v) => !v)} disabled={zones.length === 0}>
            {showExport ? "Ẩn cấu hình" : "Xuất cấu hình"}
          </ManagerPrimaryButton>
        </div>
      </div>

      {zones.length === 0 && selectedFloorId && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Tầng này chưa có khu vực (zone) nào.
        </div>
      )}

      {zones.length > 0 && (
        <div className="rounded-2xl border border-border bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="block w-full h-auto touch-none"
            onPointerDown={() => setSelectedZoneId("")}
          >
            <rect width={VB_W} height={VB_H} fill="#e2e8f0" rx={12} />
            <rect x={4} y={4} width={VB_W - 8} height={VB_H - 8} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} rx={10} />
            {zones.map((zone) => {
              const zid = getZoneId(zone);
              const box = layout[zid];
              if (!box) return null;
              const active = String(selectedZoneId) === String(zid);
              return (
                <g key={zid}>
                  <rect
                    x={box.x} y={box.y} width={box.w} height={box.h} rx={8}
                    fill={active ? "#dbeafe" : "#ffffff"}
                    stroke={active ? "#3b82f6" : "#94a3b8"}
                    strokeWidth={active ? 1.8 : 1}
                    className="cursor-move"
                    onPointerDown={(e) => startDrag(e, zid, "move")}
                  />
                  <text
                    x={box.x + 10} y={box.y + 20} fontSize={12} fontWeight={700}
                    fill={active ? "#1d4ed8" : "#334155"} fontFamily="system-ui"
                    className="select-none pointer-events-none"
                  >
                    {zone.name}
                  </text>
                  <rect
                    x={box.x + box.w - 16} y={box.y + box.h - 16} width={16} height={16}
                    fill={active ? "#3b82f6" : "#94a3b8"} rx={3}
                    className="cursor-nwse-resize"
                    onPointerDown={(e) => startDrag(e, zid, "resize")}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {showExport && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Dán đoạn này vào <code className="rounded bg-muted px-1 py-0.5 text-xs">src/config/buildingFloorPlans.js</code>
            </p>
            <ManagerSecondaryButton onClick={copyExport} className="flex items-center gap-1.5">
              <Copy size={14} /> {copied ? "Đã copy!" : "Copy"}
            </ManagerSecondaryButton>
          </div>
          <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{exportCode}</pre>
        </div>
      )}
    </div>
  );
}

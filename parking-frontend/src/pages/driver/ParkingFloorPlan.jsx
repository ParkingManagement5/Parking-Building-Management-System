import { useState } from "react";
import { ChevronRight, MapPin, Maximize2, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PAL, $c, $zi, $zn, $fn, $vt, $s, $m, srt } from "./parkingFloorPlanUtils";

// So do zone/slot dung chung giua "So do phien hien tai" (co booking, to sang
// dung slot cua minh) va preview khi duyet bai tren ban do "Tim cho do" (chua
// co booking, chi xem layout + trang thai mau). Component tu nhan biet co
// session hay khong qua tham so `session` — session=null se khong to sang gi.

// Mau chu/vien mo (slate) dung chung cho Legend va vach loi vao — kieu web
// dich vu than thien, khong con giong ban ve CAD/ky thuat nua.
const INK_SOFT = "#64748b";

// Mot o do: khung bo goc mem, mau nen theo trang thai (con trong/da dat/dang
// co xe) — giong the/card trong app dich vu hon la ky hieu ban ve ky thuat.
function Slot({ slot, ses, x, y, w, h, onClick }) {
  const st = $s(slot, ses), c = PAL[st] || PAL.available, mine = st === "mine";
  const empty = st === "available";
  const [hov, setHov] = useState(false);
  const rx = Math.min(8, w * 0.12);
  return (
    <g className="cursor-pointer" onClick={() => onClick(slot, st)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={empty ? (hov ? "#e2e8f0" : "#f1f5f9") : c.fill} opacity={empty ? 1 : hov ? 0.85 : 0.7} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={empty ? "#cbd5e1" : c.ring} strokeWidth={empty ? 1 : 1.6} />
      {mine && <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={rx + 2} fill="none"
        stroke={c.ring} strokeWidth={1.8} strokeDasharray="4 3" opacity={0.9}>
        <animate attributeName="stroke-dashoffset" from="0" to="14" dur="1.5s" repeatCount="indefinite" />
      </rect>}
      <text x={x + w / 2} y={y + h / 2 + 0.5} textAnchor="middle" dominantBaseline="central"
        fontSize={Math.max(7, Math.min(13, w * 0.19))} fontWeight="700" fontFamily="system-ui" className="select-none pointer-events-none"
        fill={empty ? INK_SOFT : c.text}>{$c(slot)}</text>
    </g>
  );
}

// Toa do luoi o do dung chung giua ZoneCell (ve) va route (tim duong toi
// dung o) — tach rieng de route co the tinh chinh xac vi tri tung o thay vi
// chi biet toa do ca khu vuc.
const ZONE_COLS = 3;
const ZONE_PAD_X = 6, ZONE_PAD_TOP = 8, ZONE_PAD_BOT = 8;
const ZONE_COL_GAP = 12, ZONE_AISLE_GAP = 22;
// Ty le cao:rong ~2:1 giong dung o do trong ban ve mau da duyet (khong con
// keo dan cho vua het khu vuc — luon giu dung ty le, du con du khong gian.
const SLOT_ASPECT = 2;

function computeZoneGrid(zw, zh, n) {
  const count = n || 1;
  const nRows = Math.ceil(count / ZONE_COLS);
  const colsInLastRow = count - (nRows - 1) * ZONE_COLS;
  const availW = zw - ZONE_PAD_X * 2;
  const availH = zh - ZONE_PAD_TOP - ZONE_PAD_BOT;
  const colGap = Math.max(4, Math.min(ZONE_COL_GAP, availW * 0.04));
  const aisleGap = Math.max(4, Math.min(ZONE_AISLE_GAP, availH * 0.08));

  const maxWByWidth = (availW - (ZONE_COLS - 1) * colGap) / ZONE_COLS;
  const maxHByHeight = (availH - (nRows - 1) * aisleGap) / nRows;
  const maxWByHeight = maxHByHeight / SLOT_ASPECT;
  const slotW = Math.max(8, Math.min(maxWByWidth, maxWByHeight));
  const slotH = slotW * SLOT_ASPECT;
  const colStep = slotW + colGap;
  const rowStep = slotH + aisleGap;

  // Can giua luoi (co dung ty le) trong khu vuc, phong khi con du khong gian.
  const gridW = ZONE_COLS * colStep - colGap;
  const gridH = nRows * rowStep - aisleGap;
  const offsetX = Math.max(0, (availW - gridW) / 2);
  const offsetY = Math.max(0, (availH - gridH) / 2);

  return { nRows, colsInLastRow, slotW, colStep, slotH, rowStep, aisleGap, offsetX, offsetY };
}

function slotRectAt(pz, grid, index) {
  const ri = Math.floor(index / ZONE_COLS);
  const ci = index % ZONE_COLS;
  const rowCols = ri === grid.nRows - 1 ? grid.colsInLastRow : ZONE_COLS;
  const rowCenterOffsetX = ((ZONE_COLS - rowCols) * grid.colStep) / 2;
  return {
    x: pz.x + ZONE_PAD_X + grid.offsetX + rowCenterOffsetX + ci * grid.colStep,
    y: pz.y + ZONE_PAD_TOP + grid.offsetY + ri * grid.rowStep,
    w: grid.slotW, h: grid.slotH, ri, ci,
  };
}

// Chi ve o do that (khong con khung/nhan "zone" — zone chi la don vi du lieu
// noi bo, khong phai vat the that trong bai xe nen bo het the/nhan de giong
// ban ve ky thuat that, bot roi mat). isActive chi con dung de highlight nhe
// khu chua slot cua driver khi da co booking.
function ZoneCell({ zone, ses, x, y, zw, zh, onSlotClick, isActive }) {
  const slots = srt(zone.slots || []);
  const grid = computeZoneGrid(zw, zh, slots.length);

  return (
    <g>
      {isActive && (
        <rect x={x} y={y} width={zw} height={zh} rx={10} fill="none" stroke="#2563eb" strokeWidth={1.4} strokeDasharray="6 4" opacity={0.8} />
      )}
      {Array.from({ length: grid.nRows - 1 }).map((_, ri) => {
        // Vach loi vao (aisle) giua 2 hang o — the hien huong xe di chuyen
        // giua cac hang, khong phai duong dan booking (luon hien, khong doi
        // theo trang thai dat cho).
        const midY = y + ZONE_PAD_TOP + grid.offsetY + grid.slotH + ri * grid.rowStep + grid.aisleGap / 2;
        return (
          <line key={`aisle-${ri}`} x1={x + ZONE_PAD_X} y1={midY} x2={x + zw - ZONE_PAD_X} y2={midY}
            stroke={INK_SOFT} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.5} />
        );
      })}
      {slots.map((slot, i) => {
        const r = slotRectAt({ x, y }, grid, i);
        return (
          <Slot key={slot.id || slot.slotId || i} slot={slot} ses={ses}
            x={r.x} y={r.y} w={r.w} h={r.h} onClick={onSlotClick} />
        );
      })}
    </g>
  );
}

// ── Chú giải nhỏ gọn, thân thiện kiểu web dịch vụ (không còn khung viền
// kép/la bàn/thước tỉ lệ/khung tên như bản vẽ kỹ thuật trước đây). ──

function Legend({ x, y }) {
  const rows = [
    { swatch: "route", label: "Đường tới chỗ đã đặt" },
    { swatch: "mine", label: "Vị trí của bạn" },
    { swatch: "occupied", label: "Đang có xe" },
    { swatch: "reserved", label: "Đã đặt trước" },
  ];
  return (
    <g transform={`translate(${x},${y})`}>
      {rows.map((r, i) => {
        const ry = i * 17;
        return (
          <g key={r.label}>
            {r.swatch === "route"
              ? <line x1={2} y1={ry + 7} x2={18} y2={ry + 7} stroke="#f97316" strokeWidth={2.4} strokeDasharray="4 3" strokeLinecap="round" />
              : <rect x={2} y={ry + 2} width={16} height={10} rx={3} fill={(PAL[r.swatch] || PAL.available).fill} opacity={0.75} stroke={(PAL[r.swatch] || PAL.available).ring} strokeWidth={1.2} />}
            <text x={24} y={ry + 9.5} fontSize={8} fill={INK_SOFT} fontFamily="system-ui" className="select-none">{r.label}</text>
          </g>
        );
      })}
    </g>
  );
}

export function ParkingMap({ sections, session, activeZone, zoom, onSlotClick, floorIdx, totalFloors }) {
  const COLS = 3, GAP = 14, PAD = 8, ROAD = 30;
  const nZones = sections.length;
  const rows = Math.ceil(nZones / COLS);
  const vbW = 800;
  const zw = (vbW - PAD * 2 - (COLS - 1) * GAP) / COLS;
  const zh = Math.max(140, Math.min(180, 400 / rows));
  const contentH = rows * zh + (rows - 1) * (ROAD + GAP) + PAD * 2 + 30;
  const startX = PAD;
  const startY = PAD + 28;

  const isBottom = floorIdx === 1, isTop = floorIdx === totalFloors;

  const azIdx = sections.findIndex((s) => String($zi(s)) === String($zi(activeZone)));
  const azRow = azIdx >= 0 ? Math.floor(azIdx / COLS) : -1;
  const azCol = azIdx >= 0 ? azIdx % COLS : -1;
  const azCx = azIdx >= 0 ? startX + azCol * (zw + GAP) + zw / 2 : 0;
  const azCy = azIdx >= 0 ? startY + azRow * (zh + ROAD + GAP) + zh / 2 : 0;

  return (
    <div className="rounded-2xl border border-border bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
      <svg viewBox={`0 0 ${vbW} ${contentH}`} className="block w-full h-auto" style={{ maxHeight: `${zoom * 5.5}px`, colorScheme: "light" }}>
        <rect width={vbW} height={contentH} fill="#e2e8f0" rx={12} />
        <rect x={4} y={4} width={vbW - 8} height={contentH - 8} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} rx={10} />

        {isBottom && <>
          <rect x={PAD} y={PAD} width={68} height={20} rx={4} fill="#3b82f6" />
          <text x={PAD + 34} y={PAD + 11} textAnchor="middle" dominantBaseline="central" fontSize={8.5} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none">CỔNG VÀO</text>
          <rect x={vbW - PAD - 68} y={PAD} width={68} height={20} rx={4} fill="#ef4444" />
          <text x={vbW - PAD - 34} y={PAD + 11} textAnchor="middle" dominantBaseline="central" fontSize={8.5} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none">CỔNG RA</text>
        </>}
        {!isBottom && <>
          <rect x={PAD} y={PAD} width={80} height={20} rx={4} fill="#8b5cf6" />
          <text x={PAD + 40} y={PAD + 11} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none">TỪ TẦNG DƯỚI</text>
        </>}

        {!isTop && (() => {
          const lx = vbW - 6, ly = contentH / 2;
          return <g>
            <rect x={lx - 8} y={ly - 28} width={14} height={56} rx={3} fill="#0ea5e9" />
            <text x={lx - 1} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none" transform={`rotate(-90,${lx - 1},${ly})`}>LÊN TẦNG</text>
          </g>;
        })()}
        {!isBottom && (() => {
          const lx = 6, ly = contentH / 2;
          return <g>
            <rect x={lx - 6} y={ly - 28} width={14} height={56} rx={3} fill="#8b5cf6" />
            <text x={lx + 1} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none" transform={`rotate(-90,${lx + 1},${ly})`}>XUỐNG</text>
          </g>;
        })()}

        {azIdx >= 0 && isBottom && <>
          <defs><marker id="ra" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
            <path d="M0,0.5 L5,3 L0,5.5" fill="none" stroke="#3b82f6" strokeWidth={1} /></marker></defs>
          <path d={`M${PAD + 34} ${PAD + 20} L${PAD + 34} ${startY - 5} L${azCx} ${startY - 5} L${azCx} ${azCy - zh / 2}`}
            fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.5} markerEnd="url(#ra)" />
        </>}

        {Array.from({ length: rows }).map((_, row) => {
          const ry = startY + row * (zh + ROAD + GAP);
          const zonesInRow = sections.slice(row * COLS, (row + 1) * COLS);
          return (
            <g key={row}>
              {zonesInRow.map((zone, col) => (
                <ZoneCell key={$zi(zone) || col} zone={zone} ses={session}
                  x={startX + col * (zw + GAP)} y={ry} zw={zw} zh={zh}
                  onSlotClick={onSlotClick}
                  isActive={String($zi(zone)) === String($zi(activeZone))} />
              ))}
              {row < rows - 1 && (() => {
                const rw = COLS * zw + (COLS - 1) * GAP;
                const roadY = ry + zh + (GAP - ROAD) / 2;
                const roadMid = roadY + ROAD / 2;
                return <g>
                  <rect x={startX} y={roadY} width={rw} height={ROAD} rx={4} fill="#94a3b8" opacity={0.12} />
                  <line x1={startX + 16} y1={roadMid} x2={startX + rw - 16} y2={roadMid}
                    stroke="#94a3b8" strokeWidth={1} strokeDasharray="8 5" opacity={0.35} />
                  {[0.25, 0.5, 0.75].map((p) => {
                    const cx = startX + rw * p;
                    return <polygon key={p} points={`${cx - 5},${roadMid - 4} ${cx + 5},${roadMid} ${cx - 5},${roadMid + 4}`} fill="#94a3b8" opacity={0.3} />;
                  })}
                  <text x={startX + rw / 2} y={roadMid + 0.5} textAnchor="middle" dominantBaseline="central"
                    fontSize={9} fontWeight="700" fill="#94a3b8" letterSpacing={2} fontFamily="system-ui" className="select-none">LỐI ĐI CHÍNH</text>
                </g>;
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const SHEET_MARGIN_X = 14;
const SHEET_MARGIN_TOP = 14;
const SHEET_MARGIN_BOTTOM = 76;

export function StaticFloorPlanMap({ plan, sections, session, activeZone, zoom, onSlotClick }) {
  const { vbW, vbH, bg, decorations, zones: planZones, route } = plan;
  const outerW = vbW + SHEET_MARGIN_X * 2;
  const outerH = vbH + SHEET_MARGIN_TOP + SHEET_MARGIN_BOTTOM;

  const activeBox = activeZone && planZones.find((pz) => {
    const n = $zn(activeZone);
    return n === pz.match || n.startsWith(pz.match) || pz.match.startsWith(n);
  });

  return (
    <div className="rounded-2xl border border-border bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
      <svg viewBox={`0 0 ${outerW} ${outerH}`} className="block w-full h-auto" style={{ maxHeight: `${zoom * 5.5}px`, colorScheme: "light" }}>
        <rect width={outerW} height={outerH} rx={16} fill={bg || "#f4f1e8"} />
        <Legend x={SHEET_MARGIN_X + 8} y={vbH + SHEET_MARGIN_TOP + 14} />
        <g transform={`translate(${SHEET_MARGIN_X},${SHEET_MARGIN_TOP})`}>
        {decorations.map((d, i) => {
          if (d.type === "rect") return (
            <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} rx={d.rx ?? 6} fill={d.fill || "none"} stroke={d.stroke || "none"} strokeWidth={d.sw || 0} />
          );
          if (d.type === "path") return (
            <path key={i} d={d.d} fill={d.fill || "none"} stroke={d.stroke || "none"} strokeWidth={d.sw || 0}
              strokeDasharray={d.dash || undefined} opacity={d.opacity ?? 1} />
          );
          if (d.type === "text") return (
            <text key={i} x={d.x} y={d.y} textAnchor={d.anchor || "start"} dominantBaseline="central" fontSize={d.fontSize || 10}
              fill={d.fill || "#000"} fontFamily="system-ui" className="select-none pointer-events-none">{d.text}</text>
          );
          if (d.type === "lane") {
            const vertical = d.dir === "v";
            const midX = d.x + d.w / 2, midY = d.y + d.h / 2;
            const arrowStops = d.arrows === false ? [] : [0.28, 0.72];
            return (
              <g key={i}>
                <rect x={d.x} y={d.y} width={d.w} height={d.h} fill={d.fill || "#c8d6e5"} />
                {vertical
                  ? <line x1={midX} y1={d.y + 10} x2={midX} y2={d.y + d.h - 10} stroke="#fff" strokeWidth={1.4} strokeDasharray="10 8" opacity={0.6} />
                  : <line x1={d.x + 10} y1={midY} x2={d.x + d.w - 10} y2={midY} stroke="#fff" strokeWidth={1.4} strokeDasharray="10 8" opacity={0.6} />}
                {arrowStops.map((p, ai) => {
                  const cx = vertical ? midX : d.x + d.w * p;
                  const cy = vertical ? d.y + d.h * p : midY;
                  const pts = vertical
                    ? `${cx - 5},${cy - 5} ${cx},${cy + 5} ${cx + 5},${cy - 5}`
                    : `${cx - 5},${cy - 5} ${cx + 5},${cy} ${cx - 5},${cy + 5}`;
                  return <polygon key={ai} points={pts} fill="#fff" opacity={0.55} />;
                })}
                {d.label && (
                  <text x={midX} y={vertical ? midY : midY - 9} textAnchor="middle" fontSize={7.5}
                    fill={d.labelFill || "#64748b"} fontFamily="system-ui" className="select-none pointer-events-none"
                    transform={vertical ? `rotate(-90 ${midX} ${midY})` : undefined}>{d.label}</text>
                )}
              </g>
            );
          }
          return null;
        })}
        {route && activeBox && (() => {
          const zoneSlots = srt(activeZone?.slots || []);
          const slotIdx = Math.max(0, zoneSlots.findIndex((s) => $m(s, session)));
          const grid = computeZoneGrid(activeBox.w, activeBox.h, zoneSlots.length);
          const slotRect = slotRectAt(activeBox, grid, slotIdx);
          const slotCenterX = slotRect.x + slotRect.w / 2;
          const zoneMidY = activeBox.y + activeBox.h / 2;
          const enterFromTop = zoneMidY > route.laneY;
          // O do nam doc (2:1) nen phai do THANG vao tu canh tren/duoi cua o
          // (giong xe lui/tien thang vao cho that).
          // - Hang NGOAI (sat lan xe chinh): di thang tu lan vao luon, khong
          //   can vong qua cot nao ca.
          // - Hang TRONG (phia sau hang ngoai): phai di theo khe ho giua 2
          //   cot (an toan, khong cat qua o hang ngoai) roi moi re vao.
          const outerRowIndex = enterFromTop ? 0 : grid.nRows - 1;
          const isOuterRow = slotRect.ri === outerRowIndex;
          // Dung dung tai vien ngoai o (khong chay de len chu/vien ben trong).
          const nearEdgeY = enterFromTop ? slotRect.y : slotRect.y + slotRect.h;
          let d;
          if (isOuterRow) {
            d = `M${route.entryX} ${route.entryY} L${route.entryX} ${route.laneY} L${slotCenterX} ${route.laneY} L${slotCenterX} ${nearEdgeY}`;
          } else {
            const colGapWidth = grid.colStep - grid.slotW;
            const corridorOnRight = slotRect.ci < ZONE_COLS - 1;
            const corridorX = corridorOnRight
              ? slotRect.x + slotRect.w + colGapWidth / 2
              : slotRect.x - colGapWidth / 2;
            d = `M${route.entryX} ${route.entryY} L${route.entryX} ${route.laneY} L${corridorX} ${route.laneY} L${corridorX} ${nearEdgeY} L${slotCenterX} ${nearEdgeY}`;
          }
          return (
            <g>
              <path d={d} fill="none" stroke="#f97316" strokeWidth={2.4} strokeDasharray="7 5" opacity={0.9}>
                <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
              </path>
              <circle cx={route.entryX} cy={route.entryY} r={5} fill="#f97316" stroke="#fff" strokeWidth={1.5} />
              <text x={route.entryX} y={route.entryY - 10} textAnchor="middle" fontSize={8} fontWeight="700"
                fill="#f97316" fontFamily="system-ui" className="select-none pointer-events-none">BẠN VÀO ĐÂY</text>
            </g>
          );
        })()}
        {planZones.map((pz, i) => {
          const zone = sections.find((s) => $zn(s) === pz.match || $zn(s).startsWith(pz.match) || pz.match.startsWith($zn(s)));
          if (!zone) return null;
          return (
            <ZoneCell key={$zi(zone) || i} zone={zone} ses={session} x={pz.x} y={pz.y} zw={pz.w} zh={pz.h}
              onSlotClick={onSlotClick} isActive={String($zi(zone)) === String($zi(activeZone))} />
          );
        })}
        </g>
      </svg>
    </div>
  );
}

export function DetailPanel({ slot, st, session, zone, floor }) {
  const navigate = useNavigate();
  const c = PAL[st] || PAL.available, code = $c(slot), mine = st === "mine";
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Chi tiết vị trí</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 grid place-items-center rounded-lg px-2 py-1.5 text-[11px] font-black leading-tight text-center" style={{ backgroundColor: c.fill, color: c.text, minWidth: 48 }}>{code}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{$zn(zone)}</p>
            <p className="text-[11px] text-muted-foreground truncate">{$fn(floor)}</p>
          </div>
        </div>
        <div className="space-y-2">
          {[["Trạng thái", c.label], ["Loại xe", $vt(zone)], ["Khu vực", $zn(zone)], ["Tầng", $fn(floor)]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">{k}</span>
              <span className="text-[11px] font-semibold text-foreground text-right truncate">{v}</span>
            </div>
          ))}
        </div>
        {st === "available" && <button type="button" onClick={() => navigate("/driver/booking")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98]">
          Đặt chỗ này<ChevronRight size={14} /></button>}
        {mine && <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3 text-center">
          <MapPin className="mx-auto size-4 text-blue-600 mb-1" /><p className="text-xs font-bold text-blue-700 dark:text-blue-300">Vị trí của bạn</p></div>}
      </div>
      {mine && <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Hướng dẫn</p>
        <div className="space-y-2">
          {[`Vào cổng ${session?.entryGateCode || "GATE-A"}`, `Lên ${$fn(floor)}`, `Khu ${$zn(zone)}`, `Vị trí ${code}`].map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-600 text-[9px] font-bold text-white">{i + 1}</span>
              <span className="text-xs text-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Chú thích</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(PAL).map(([, cfg]) => (
            <div key={cfg.label} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${cfg.dot}`} /><span className="text-[10px] text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FloorTabs({ floors, selectedId, onSelect }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="mr-1 text-xs font-semibold text-muted-foreground">Tầng:</span>
      {floors.map((f) => {
        const sel = String(f.id) === String(selectedId);
        return <button key={f.id} type="button" onClick={() => onSelect(f.id)}
          className={`rounded-lg px-3 py-1 text-sm font-bold transition ${sel ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{f.name}</button>;
      })}
    </div>
  );
}

export function ZoomCtrl({ zoom, onZoom, onReset, onFs }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      <button type="button" onClick={() => onZoom(-10)} className="grid size-6 place-items-center rounded hover:bg-muted transition"><Minus size={12} /></button>
      <button type="button" onClick={onReset} className="px-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums">{zoom}%</button>
      <button type="button" onClick={() => onZoom(10)} className="grid size-6 place-items-center rounded hover:bg-muted transition"><Plus size={12} /></button>
      <div className="mx-0.5 h-3 w-px bg-border" />
      <button type="button" onClick={onFs} className="grid size-6 place-items-center rounded hover:bg-muted transition"><Maximize2 size={12} /></button>
    </div>
  );
}

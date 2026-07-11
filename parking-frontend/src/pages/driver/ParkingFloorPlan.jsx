import { useState } from "react";
import { ChevronRight, MapPin, Maximize2, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PAL, $c, $zi, $zn, $fn, $vt, $s, srt } from "./parkingFloorPlanUtils";

// So do zone/slot dung chung giua "So do phien hien tai" (co booking, to sang
// dung slot cua minh) va preview khi duyet bai tren ban do "Tim cho do" (chua
// co booking, chi xem layout + trang thai mau). Component tu nhan biet co
// session hay khong qua tham so `session` — session=null se khong to sang gi.

function Slot({ slot, ses, x, y, w, h, onClick }) {
  const st = $s(slot, ses), c = PAL[st] || PAL.available, mine = st === "mine";
  const [hov, setHov] = useState(false);
  return (
    <g className="cursor-pointer" onClick={() => onClick(slot, st)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {mine && <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={5} fill="none"
        stroke={c.ring} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8}>
        <animate attributeName="stroke-dashoffset" from="0" to="14" dur="1.5s" repeatCount="indefinite" />
      </rect>}
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={hov ? c.ring : c.fill} stroke={c.ring} strokeWidth={hov ? 1.2 : 0.5}
        style={{ transition: "fill 0.15s" }} />
      <text x={x + w / 2} y={y + h / 2 + 0.5} textAnchor="middle" dominantBaseline="central"
        fill={mine || hov ? "#fff" : c.text} fontSize={10} fontWeight="700"
        fontFamily="system-ui" className="select-none pointer-events-none">{$c(slot)}</text>
    </g>
  );
}

function ZoneCell({ zone, ses, x, y, zw, zh, onSlotClick, isActive }) {
  const slots = srt(zone.slots || []);
  const name = $zn(zone);
  const avail = slots.filter((s) => String(s.status || "").toLowerCase() === "available").length;
  const hH = 24, padX = 10, padTop = hH + 8, padBot = 8;
  const slotW = (zw - padX * 2 - 10) / 2;
  const nRows = Math.ceil(slots.length / 2);
  const slotH = Math.min(26, Math.max(18, (zh - padTop - padBot - (nRows - 1) * 6) / nRows));
  const rowStep = slotH + 6;
  const pairs = [];
  for (let i = 0; i < slots.length; i += 2) pairs.push(slots.slice(i, i + 2));

  return (
    <g>
      <rect x={x} y={y} width={zw} height={zh} rx={6}
        fill={isActive ? "#eff6ff" : "#f8fafc"}
        stroke={isActive ? "#3b82f6" : "#cbd5e1"}
        strokeWidth={isActive ? 1.5 : 0.8} />
      <rect x={x} y={y} width={zw} height={hH} rx={6} fill={isActive ? "#3b82f6" : "#475569"} />
      <rect x={x} y={y + hH - 4} width={zw} height={4} fill={isActive ? "#3b82f6" : "#475569"} />
      <text x={x + 6} y={y + hH / 2 + 0.5} dominantBaseline="central"
        fontSize={10} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none">{name}</text>
      <text x={x + zw - 6} y={y + hH / 2 + 0.5} textAnchor="end" dominantBaseline="central"
        fontSize={8} fill="rgba(255,255,255,0.7)" fontFamily="system-ui" className="select-none">{avail} trống</text>
      {pairs.map((pair, ri) => {
        const ry = y + padTop + ri * rowStep;
        const lx = x + padX, rx2 = x + zw - padX - slotW;
        return (
          <g key={ri}>
            {pair[0] && <Slot slot={pair[0]} ses={ses} x={lx} y={ry} w={slotW} h={slotH} onClick={onSlotClick} />}
            {pair[1] && <Slot slot={pair[1]} ses={ses} x={rx2} y={ry} w={slotW} h={slotH} onClick={onSlotClick} />}
            {ri < pairs.length - 1 && <line x1={x + padX} y1={ry + slotH + 4} x2={x + zw - padX} y2={ry + slotH + 4}
              stroke="#cbd5e1" strokeWidth={0.6} strokeDasharray="3 3" />}
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
      <svg viewBox={`0 0 ${vbW} ${contentH}`} className="block w-full h-auto" style={{ maxHeight: `${zoom * 5.5}px` }}>
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

export function StaticFloorPlanMap({ plan, sections, session, activeZone, zoom, onSlotClick }) {
  const { vbW, vbH, bg, decorations, zones: planZones } = plan;
  return (
    <div className="rounded-2xl border border-border bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
      <svg viewBox={`0 0 ${vbW} ${vbH}`} className="block w-full h-auto" style={{ maxHeight: `${zoom * 5.5}px` }}>
        <rect width={vbW} height={vbH} fill={bg || "#e2e8f0"} rx={12} />
        {decorations.map((d, i) => {
          if (d.type === "rect") return (
            <rect key={i} x={d.x} y={d.y} width={d.w} height={d.h} rx={d.rx ?? 0} fill={d.fill || "none"} stroke={d.stroke || "none"} strokeWidth={d.sw || 0} />
          );
          if (d.type === "text") return (
            <text key={i} x={d.x} y={d.y} textAnchor={d.anchor || "start"} dominantBaseline="central" fontSize={d.fontSize || 10}
              fill={d.fill || "#000"} fontFamily="system-ui" className="select-none pointer-events-none">{d.text}</text>
          );
          return null;
        })}
        {planZones.map((pz, i) => {
          const zone = sections.find((s) => $zn(s) === pz.match || $zn(s).startsWith(pz.match) || pz.match.startsWith($zn(s)));
          if (!zone) return null;
          return (
            <ZoneCell key={$zi(zone) || i} zone={zone} ses={session} x={pz.x} y={pz.y} zw={pz.w} zh={pz.h}
              onSlotClick={onSlotClick} isActive={String($zi(zone)) === String($zi(activeZone))} />
          );
        })}
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

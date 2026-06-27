import { useEffect, useRef, useState, useCallback } from "react";
import { Building2, LoaderCircle, MapPin, Maximize2, Minus, Plus, SquareParking, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { floorApi } from "../../api/manager/floorApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { unwrapApiData } from "../../utils/api";
import { getBookingStatus } from "./driverPortalUtils";

const PAL = {
  mine:        { label: "Slot cua ban", fill: "#3b82f6", text: "#fff",    ring: "#1d4ed8", dot: "bg-blue-500" },
  available:   { label: "Con trong",    fill: "#4ade80", text: "#14532d", ring: "#16a34a", dot: "bg-emerald-500" },
  occupied:    { label: "Da co xe",     fill: "#fca5a5", text: "#7f1d1d", ring: "#dc2626", dot: "bg-red-400" },
  reserved:    { label: "Da dat truoc", fill: "#fcd34d", text: "#78350f", ring: "#d97706", dot: "bg-amber-400" },
  maintenance: { label: "Bao tri",      fill: "#d1d5db", text: "#6b7280", ring: "#9ca3af", dot: "bg-gray-400" },
};

/* ── Data helpers ──────────────────────────────────────────── */
function getActiveBooking(bk) {
  return bk.find((b) => {
    const s = getBookingStatus(b).toUpperCase();
    const u = b?.qrUsed === true || Boolean(b?.qrUsedAt);
    const e = b?.expiredAt || b?.bookingEndTime;
    const m = e ? new Date(e).getTime() : null;
    return s === "PENDING_PAYMENT" || (s === "CONFIRMED" && !u && !(Number.isFinite(m) && m < Date.now()));
  });
}
function getCurSession(ss) {
  return ss.find((s) => String(s?.status||"").toUpperCase() === "ACTIVE")
    || ss.find((s) => String(s?.status||"").toUpperCase() === "WAITING_PAYMENT") || null;
}
function enrich(ses, bk) {
  if (!ses) return null;
  const b = bk.find((i) => String(i.bookingId) === String(ses.bookingId))
    || bk.find((i) => String(i.slotId) === String(ses.slotId))
    || bk.find((i) => String(i.licensePlate||"").toLowerCase() === String(ses.licensePlate||"").toLowerCase());
  if (!b) return ses;
  return { ...b, ...ses, bookingId: ses.bookingId||b.bookingId, slotId: ses.slotId||b.slotId,
    slotCode: ses.slotCode||b.slotCode, licensePlate: ses.licensePlate||b.licensePlate,
    zoneId: ses.zoneId||b.zoneId, zoneName: ses.zoneName||b.zoneName,
    floorId: ses.floorId||b.floorId, floorName: ses.floorName||b.floorName,
    buildingId: ses.buildingId||b.buildingId, buildingName: ses.buildingName||b.buildingName,
    qrToken: ses.qrToken||b.qrToken };
}
const $c=(s)=>s?.slotCode||s?.parkingSlotCode||"Slot";
const $i=(s)=>s?.id||s?.slotId||s?.parkingSlotId;
const $zi=(z)=>z?.id||z?.zoneId;
const $zn=(z)=>z?.name||z?.zoneName||"Zone";
const $fi2=(f)=>f?.id||f?.floorId||f?.parkingFloorId;
const $fn=(f)=>f?.name||f?.floorName||"Floor";
const $bi=(i)=>i?.buildingId||i?.parkingBuildingId||i?.building?.id;
const $vt=(z)=>z?.vehicleType?.name||z?.vehicleTypeName||z?.vehicleType||"--";
function $fx(f,fb=1){const r=f?.floorNumber||f?.level||f?.index;if(Number.isFinite(Number(r)))return Number(r);const m=String($fn(f)).match(/(\d+)/);return m?Number(m[1]):fb;}
function $m(sl,ses){const si=ses?.slotId||ses?.parkingSlotId,sc=$c(ses);return(si&&String($i(sl))===String(si))||(sc&&String($c(sl)).toLowerCase()===sc.toLowerCase());}
function $s(sl,ses){if($m(sl,ses))return"mine";return String(sl?.status||"AVAILABLE").toLowerCase();}
function srt(slots){return[...slots].sort((a,b)=>String($c(a)).localeCompare(String($c(b)),undefined,{numeric:true}));}

/* ── SVG Slot ──────────────────────────────────────────────── */
function Slot({slot,ses,x,y,w,h,onClick}){
  const st=$s(slot,ses),c=PAL[st]||PAL.available,mine=st==="mine";
  const[hov,setHov]=useState(false);
  return(
    <g className="cursor-pointer" onClick={()=>onClick(slot,st)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {mine&&<rect x={x-2} y={y-2} width={w+4} height={h+4} rx={5} fill="none"
        stroke={c.ring} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8}>
        <animate attributeName="stroke-dashoffset" from="0" to="14" dur="1.5s" repeatCount="indefinite"/>
      </rect>}
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={hov?c.ring:c.fill} stroke={c.ring} strokeWidth={hov?1.2:0.5}
        style={{transition:"fill 0.15s"}}/>
      <text x={x+w/2} y={y+h/2+0.5} textAnchor="middle" dominantBaseline="central"
        fill={mine||hov?"#fff":c.text} fontSize={10} fontWeight="700"
        fontFamily="system-ui" className="select-none pointer-events-none">{$c(slot)}</text>
    </g>
  );
}

/* ── Zone cell ─────────────────────────────────────────────── */
function ZoneCell({zone,ses,x,y,zw,zh,onSlotClick,isActive}){
  const slots=srt(zone.slots||[]);
  const name=$zn(zone);
  const avail=slots.filter(s=>String(s.status||"").toLowerCase()==="available").length;
  const hH=24, padX=10, padTop=hH+8, padBot=8;
  const slotW=(zw-padX*2-10)/2;
  const nRows=Math.ceil(slots.length/2);
  const slotH=Math.min(26,Math.max(18,(zh-padTop-padBot-(nRows-1)*6)/nRows));
  const rowStep=slotH+6;
  const pairs=[];
  for(let i=0;i<slots.length;i+=2) pairs.push(slots.slice(i,i+2));

  return(
    <g>
      <rect x={x} y={y} width={zw} height={zh} rx={6}
        fill={isActive?"#eff6ff":"#f8fafc"}
        stroke={isActive?"#3b82f6":"#cbd5e1"}
        strokeWidth={isActive?1.5:0.8}/>
      <rect x={x} y={y} width={zw} height={hH} rx={6}
        fill={isActive?"#3b82f6":"#475569"}/>
      <rect x={x} y={y+hH-4} width={zw} height={4}
        fill={isActive?"#3b82f6":"#475569"}/>
      <text x={x+6} y={y+hH/2+0.5} dominantBaseline="central"
        fontSize={10} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none">{name}</text>
      <text x={x+zw-6} y={y+hH/2+0.5} textAnchor="end" dominantBaseline="central"
        fontSize={8} fill="rgba(255,255,255,0.7)" fontFamily="system-ui" className="select-none">{avail} trong</text>
      {pairs.map((pair,ri)=>{
        const ry=y+padTop+ri*rowStep;
        const lx=x+padX, rx2=x+zw-padX-slotW;
        return(
          <g key={ri}>
            {pair[0]&&<Slot slot={pair[0]} ses={ses} x={lx} y={ry} w={slotW} h={slotH} onClick={onSlotClick}/>}
            {pair[1]&&<Slot slot={pair[1]} ses={ses} x={rx2} y={ry} w={slotW} h={slotH} onClick={onSlotClick}/>}
            {ri<pairs.length-1&&<line x1={x+padX} y1={ry+slotH+4} x2={x+zw-padX} y2={ry+slotH+4}
              stroke="#cbd5e1" strokeWidth={0.6} strokeDasharray="3 3"/>}
          </g>
        );
      })}
    </g>
  );
}

/* ── Full parking map ──────────────────────────────────────── */
function ParkingMap({sections,session,activeZone,zoom,onSlotClick,floorIdx,totalFloors}){
  const COLS=3, GAP=14, PAD=8, ROAD=30;
  const nZones=sections.length;
  const rows=Math.ceil(nZones/COLS);
  const vbW=800;
  const zw=(vbW-PAD*2-(COLS-1)*GAP)/COLS;
  const zh=Math.max(140,Math.min(180,400/rows));
  const contentH=rows*zh+(rows-1)*(ROAD+GAP)+PAD*2+30;
  const startX=PAD;
  const startY=PAD+28;

  const isBottom=floorIdx===1, isTop=floorIdx===totalFloors;

  const azIdx=sections.findIndex(s=>String($zi(s))===String($zi(activeZone)));
  const azRow=azIdx>=0?Math.floor(azIdx/COLS):-1;
  const azCol=azIdx>=0?azIdx%COLS:-1;
  const azCx=azIdx>=0?startX+azCol*(zw+GAP)+zw/2:0;
  const azCy=azIdx>=0?startY+azRow*(zh+ROAD+GAP)+zh/2:0;

  return(
    <div className="rounded-2xl border border-border bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
      <svg viewBox={`0 0 ${vbW} ${contentH}`} className="block w-full h-auto"
        style={{maxHeight:`${zoom*5.5}px`}}>
        <rect width={vbW} height={contentH} fill="#e2e8f0" rx={12}/>
        <rect x={4} y={4} width={vbW-8} height={contentH-8} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={0.8} rx={10}/>

        {/* Gate labels */}
        {isBottom&&<>
          <rect x={PAD} y={PAD} width={68} height={20} rx={4} fill="#3b82f6"/>
          <text x={PAD+34} y={PAD+11} textAnchor="middle" dominantBaseline="central" fontSize={8.5} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none">CONG VAO</text>
          <rect x={vbW-PAD-68} y={PAD} width={68} height={20} rx={4} fill="#ef4444"/>
          <text x={vbW-PAD-34} y={PAD+11} textAnchor="middle" dominantBaseline="central" fontSize={8.5} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none">CONG RA</text>
        </>}
        {!isBottom&&<>
          <rect x={PAD} y={PAD} width={80} height={20} rx={4} fill="#8b5cf6"/>
          <text x={PAD+40} y={PAD+11} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none">TU TANG DUOI</text>
        </>}

        {/* Side ramp labels - outside zone area */}
        {!isTop&&(() => {
          const lx=vbW-6, ly=contentH/2;
          return <g>
            <rect x={lx-8} y={ly-28} width={14} height={56} rx={3} fill="#0ea5e9"/>
            <text x={lx-1} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none" transform={`rotate(-90,${lx-1},${ly})`}>LEN TANG</text>
          </g>;
        })()}
        {!isBottom&&(() => {
          const lx=6, ly=contentH/2;
          return <g>
            <rect x={lx-6} y={ly-28} width={14} height={56} rx={3} fill="#8b5cf6"/>
            <text x={lx+1} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="700" fill="#fff" fontFamily="system-ui" className="select-none" transform={`rotate(-90,${lx+1},${ly})`}>XUONG</text>
          </g>;
        })()}

        {/* Route dashed line */}
        {azIdx>=0&&isBottom&&<>
          <defs><marker id="ra" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
            <path d="M0,0.5 L5,3 L0,5.5" fill="none" stroke="#3b82f6" strokeWidth={1}/></marker></defs>
          <path d={`M${PAD+34} ${PAD+20} L${PAD+34} ${startY-5} L${azCx} ${startY-5} L${azCx} ${azCy-zh/2}`}
            fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.5} markerEnd="url(#ra)"/>
        </>}

        {/* Zones + Roads */}
        {Array.from({length:rows}).map((_,row)=>{
          const ry=startY+row*(zh+ROAD+GAP);
          const zonesInRow=sections.slice(row*COLS,(row+1)*COLS);
          return(
            <g key={row}>
              {zonesInRow.map((zone,col)=>(
                <ZoneCell key={$zi(zone)||col} zone={zone} ses={session}
                  x={startX+col*(zw+GAP)} y={ry} zw={zw} zh={zh}
                  onSlotClick={onSlotClick}
                  isActive={String($zi(zone))===String($zi(activeZone))}/>
              ))}
              {row<rows-1&&(()=>{
                const rw=COLS*zw+(COLS-1)*GAP;
                const roadY=ry+zh+(GAP-ROAD)/2;
                const roadMid=roadY+ROAD/2;
                return <g>
                  <rect x={startX} y={roadY} width={rw} height={ROAD} rx={4} fill="#94a3b8" opacity={0.12}/>
                  <line x1={startX+16} y1={roadMid} x2={startX+rw-16} y2={roadMid}
                    stroke="#94a3b8" strokeWidth={1} strokeDasharray="8 5" opacity={0.35}/>
                  {[0.25,0.5,0.75].map(p=>{
                    const cx=startX+rw*p;
                    return <polygon key={p} points={`${cx-5},${roadMid-4} ${cx+5},${roadMid} ${cx-5},${roadMid+4}`} fill="#94a3b8" opacity={0.3}/>;
                  })}
                  <text x={startX+rw/2} y={roadMid+0.5} textAnchor="middle" dominantBaseline="central"
                    fontSize={9} fontWeight="700" fill="#94a3b8" letterSpacing={2} fontFamily="system-ui" className="select-none">LOI DI CHINH</text>
                </g>;
              })()}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────── */
function EmptyState(){
  const navigate=useNavigate();
  return(
    <div className="rounded-2xl border border-border bg-card p-12 text-center">
      <SquareParking className="mx-auto size-10 text-muted-foreground"/>
      <h2 className="mt-4 text-lg font-bold text-foreground">Chua co phien do xe</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">Ban do bai xe se hien thi khi ban dat cho hoac xe vao bai.</p>
      <button type="button" onClick={()=>navigate("/driver/booking")}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background transition hover:opacity-90 active:scale-[0.98]">Dat cho ngay</button>
    </div>
  );
}

/* ── Detail panel ──────────────────────────────────────────── */
function DetailPanel({slot,st,session,zone,floor}){
  const navigate=useNavigate();
  const c=PAL[st]||PAL.available, code=$c(slot), mine=st==="mine";
  return(
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 overflow-hidden">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Chi tiet slot</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 grid place-items-center rounded-lg px-2 py-1.5 text-[11px] font-black leading-tight text-center" style={{backgroundColor:c.fill,color:c.text,minWidth:48}}>{code}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{$zn(zone)}</p>
            <p className="text-[11px] text-muted-foreground truncate">{$fn(floor)}</p>
          </div>
        </div>
        <div className="space-y-2">
          {[["Trang thai",c.label],["Loai xe",$vt(zone)],["Khu vuc",$zn(zone)],["Tang",$fn(floor)]].map(([k,v])=>(
            <div key={k} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground shrink-0">{k}</span>
              <span className="text-[11px] font-semibold text-foreground text-right truncate">{v}</span>
            </div>
          ))}
        </div>
        {st==="available"&&<button type="button" onClick={()=>navigate("/driver/booking")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.98]">
          Dat cho nay<ChevronRight size={14}/></button>}
        {mine&&<div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3 text-center">
          <MapPin className="mx-auto size-4 text-blue-600 mb-1"/><p className="text-xs font-bold text-blue-700 dark:text-blue-300">Slot cua ban</p></div>}
      </div>
      {mine&&<div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Huong dan</p>
        <div className="space-y-2">
          {[`Vao cong ${session?.entryGateCode||"GATE-A"}`,`Len ${$fn(floor)}`,`Khu ${$zn(zone)}`,`Slot ${code}`].map((s,i)=>(
            <div key={i} className="flex items-start gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-600 text-[9px] font-bold text-white">{i+1}</span>
              <span className="text-xs text-foreground">{s}</span>
            </div>
          ))}
        </div>
      </div>}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Chu thich</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(PAL).map(([,cfg])=>(
            <div key={cfg.label} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${cfg.dot}`}/><span className="text-[10px] text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Controls ──────────────────────────────────────────────── */
function FloorTabs({floors,selectedId,onSelect}){
  return(
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs font-semibold text-muted-foreground">Tang:</span>
      {floors.map(f=>{
        const sel=String(f.id)===String(selectedId);
        return <button key={f.id} type="button" onClick={()=>onSelect(f.id)}
          className={`rounded-lg px-3 py-1 text-sm font-bold transition ${sel?"bg-foreground text-background shadow-sm":"bg-muted text-muted-foreground hover:bg-muted/80"}`}>{f.name}</button>;
      })}
    </div>
  );
}
function ZoomCtrl({zoom,onZoom,onReset,onFs}){
  return(
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      <button type="button" onClick={()=>onZoom(-10)} className="grid size-6 place-items-center rounded hover:bg-muted transition"><Minus size={12}/></button>
      <button type="button" onClick={onReset} className="px-1.5 text-[11px] font-semibold text-muted-foreground tabular-nums">{zoom}%</button>
      <button type="button" onClick={()=>onZoom(10)} className="grid size-6 place-items-center rounded hover:bg-muted transition"><Plus size={12}/></button>
      <div className="mx-0.5 h-3 w-px bg-border"/>
      <button type="button" onClick={onFs} className="grid size-6 place-items-center rounded hover:bg-muted transition"><Maximize2 size={12}/></button>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────────── */
export default function DriverParkingMapPage(){
  const[session,setSession]=useState(null);
  const[floors,setFloors]=useState([]);
  const[selFloor,setSelFloor]=useState(null);
  const[loading,setLoading]=useState(true);
  const[zoom,setZoom]=useState(100);
  const[selSlot,setSelSlot]=useState(null);
  const[selSt,setSelSt]=useState(null);
  const mapRef=useRef(null);
  const handleZoom=useCallback(d=>setZoom(z=>Math.max(60,Math.min(200,z+d))),[]);
  const handleSlotClick=useCallback((sl,st)=>{setSelSlot(sl);setSelSt(st);},[]);
  const handleFs=useCallback(()=>{const el=mapRef.current;if(!el)return;document.fullscreenElement?document.exitFullscreen():el.requestFullscreen?.();},[]);

  useEffect(()=>{
    let cancel=false;
    async function load(){
      setLoading(true);
      try{
        const[bRes,sRes]=await Promise.all([bookingApi.getMyBookings(),driverSessionApi.getMySessions()]);
        const bk=unwrapApiData(bRes.data,[]),ss=unwrapApiData(sRes.data,[]);
        const active=getCurSession(ss)?enrich(getCurSession(ss),bk):getActiveBooking(bk)||null;
        if(cancel)return; setSession(active);
        const aFid=$fi2(active),aBid=$bi(active);
        if(!aBid&&!aFid){setFloors([]);setSelFloor(null);return;}
        let raw=[];
        if(aBid) raw=unwrapApiData((await floorApi.getByBuilding(aBid)).data,[]);
        if(!raw.length&&aFid) raw=[{id:aFid,name:active?.floorName||"Floor"}];
        const result=await Promise.all(raw.map(async(f,i)=>{
          const id=$fi2(f);
          const zones=id?unwrapApiData((await zoneApi.getByFloor(id)).data,[]):[];
          const secs=await Promise.all(zones.map(async z=>{
            const zi=$zi(z);
            const slots=zi?unwrapApiData((await parkingSlotApi.getByZone(zi)).data,[]):[];
            return{id:zi,name:$zn(z),vehicleType:$vt(z),slots};
          }));
          return{id:id||`f-${i}`,name:$fn(f),floorIndex:$fx(f,i+1),sections:secs};
        }));
        if(!cancel){setFloors(result.sort((a,b)=>a.floorIndex-b.floorIndex));setSelFloor(aFid||result[0]?.id||null);}
      }catch(e){console.error("Failed to load parking map",e);if(!cancel){setSession(null);setFloors([]);setSelFloor(null);}}
      finally{if(!cancel)setLoading(false);}
    }
    void load();
    return()=>{cancel=true;};
  },[]);

  const curFloor=floors.find(f=>(f.sections||[]).some(s=>(s.slots||[]).some(sl=>$m(sl,session))))
    ||floors.find(f=>String(f.id)===String(selFloor))||floors[0];
  const sections=curFloor?.sections||[];
  const activeZone=sections.find(s=>(s.slots||[]).some(sl=>$m(sl,session)))
    ||sections.find(s=>String($zi(s))===String(session?.zoneId))||sections[0];
  const building=session?.buildingName||session?.parkingBuildingName||"Bai xe";
  const floorIdx=curFloor?.floorIndex||1;

  useEffect(()=>{
    if(!session||!activeZone)return;
    const my=(activeZone.slots||[]).find(sl=>$m(sl,session));
    if(my){setSelSlot(my);setSelSt("mine");}
  },[session,activeZone]);

  if(loading) return <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-border bg-card"><LoaderCircle className="size-7 animate-spin text-muted-foreground"/></div>;
  if(!session) return <EmptyState/>;

  return(
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-muted-foreground"><Building2 size={12}/><span className="text-[10px] font-semibold uppercase tracking-widest">{building}</span></div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">So do {$fn(curFloor)}</h1>
        </div>
        {session&&<div className="flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-2.5 py-1">
          <MapPin size={12} className="text-blue-600"/><span className="text-xs font-bold text-blue-700 dark:text-blue-300">{$c(session)}</span>
          <span className="text-[10px] text-blue-500">{$zn(activeZone)}</span></div>}
      </div>
      <div className="grid gap-3 xl:grid-cols-[1fr_240px]">
        <div className="space-y-2" ref={mapRef}>
          <ParkingMap sections={sections} session={session} activeZone={activeZone} zoom={zoom} onSlotClick={handleSlotClick} floorIdx={floorIdx} totalFloors={floors.length}/>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FloorTabs floors={floors} selectedId={curFloor?.id} onSelect={setSelFloor}/>
            <ZoomCtrl zoom={zoom} onZoom={handleZoom} onReset={()=>setZoom(100)} onFs={handleFs}/>
          </div>
        </div>
        <aside className="hidden xl:block">
          {selSlot?<DetailPanel slot={selSlot} st={selSt} session={session} zone={activeZone} floor={curFloor}/>
          :<div className="rounded-2xl border border-border bg-card p-5 text-center"><MapPin className="mx-auto size-5 text-muted-foreground mb-2"/><p className="text-[10px] text-muted-foreground">Click slot de xem chi tiet</p></div>}
        </aside>
      </div>
      {selSlot&&<div className="xl:hidden"><DetailPanel slot={selSlot} st={selSt} session={session} zone={activeZone} floor={curFloor}/></div>}
    </div>
  );
}

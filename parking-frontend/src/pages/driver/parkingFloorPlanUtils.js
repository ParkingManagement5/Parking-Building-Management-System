import { getBookingStatus } from "./driverPortalUtils";

// Ham/hang so dung chung cho so do zone/slot (ParkingFloorPlan.jsx) — tach
// rieng khoi file component de Fast Refresh (HMR) hoat dong dung.

export const PAL = {
  mine:        { label: "Vị trí của bạn", fill: "#3b82f6", text: "#fff",    ring: "#1d4ed8", dot: "bg-blue-500" },
  available:   { label: "Còn trống",    fill: "#4ade80", text: "#14532d", ring: "#16a34a", dot: "bg-emerald-500" },
  occupied:    { label: "Đã có xe",     fill: "#fca5a5", text: "#7f1d1d", ring: "#dc2626", dot: "bg-red-400" },
  reserved:    { label: "Đã đặt trước", fill: "#fcd34d", text: "#78350f", ring: "#d97706", dot: "bg-amber-400" },
  maintenance: { label: "Bảo trì",      fill: "#d1d5db", text: "#6b7280", ring: "#9ca3af", dot: "bg-gray-400" },
};

export const $c = (s) => s?.slotCode || s?.parkingSlotCode || "Slot";
export const $i = (s) => s?.id || s?.slotId || s?.parkingSlotId;
export const $zi = (z) => z?.id || z?.zoneId;
export const $zn = (z) => z?.name || z?.zoneName || "Zone";
export const $fi2 = (f) => f?.id || f?.floorId || f?.parkingFloorId;
export const $fn = (f) => f?.name || f?.floorName || "Floor";
export const $vt = (z) => z?.vehicleType?.name || z?.vehicleTypeName || z?.vehicleType || "--";
export function $fx(f, fb = 1) {
  const r = f?.floorNumber || f?.level || f?.index;
  if (Number.isFinite(Number(r))) return Number(r);
  const m = String($fn(f)).match(/(\d+)/);
  return m ? Number(m[1]) : fb;
}
export function $m(sl, ses) {
  const si = ses?.slotId || ses?.parkingSlotId, sc = $c(ses);
  return (si && String($i(sl)) === String(si)) || (sc && String($c(sl)).toLowerCase() === sc.toLowerCase());
}
export function $s(sl, ses) {
  if ($m(sl, ses)) return "mine";
  return String(sl?.status || "AVAILABLE").toLowerCase();
}
export function srt(slots) {
  return [...slots].sort((a, b) => String($c(a)).localeCompare(String($c(b)), undefined, { numeric: true }));
}

// Xac dinh booking/session "dang active" cua driver de to sang "slot cua ban"
// tren so do — dung chung cho ca man hinh phien hien tai va preview ban do.
export function getActiveBooking(bk) {
  return bk.find((b) => {
    const s = getBookingStatus(b).toUpperCase();
    const u = b?.qrUsed === true || Boolean(b?.qrUsedAt);
    const e = b?.expiredAt || b?.bookingEndTime;
    const m = e ? new Date(e).getTime() : null;
    return s === "PENDING_PAYMENT" || (s === "CONFIRMED" && !u && !(Number.isFinite(m) && m < Date.now()));
  });
}
export function getCurSession(ss) {
  return ss.find((s) => String(s?.status || "").toUpperCase() === "ACTIVE")
    || ss.find((s) => String(s?.status || "").toUpperCase() === "WAITING_PAYMENT") || null;
}
export function enrichSession(ses, bk) {
  if (!ses) return null;
  const b = bk.find((i) => String(i.bookingId) === String(ses.bookingId))
    || bk.find((i) => String(i.slotId) === String(ses.slotId))
    || bk.find((i) => String(i.licensePlate || "").toLowerCase() === String(ses.licensePlate || "").toLowerCase());
  if (!b) return ses;
  return {
    ...b, ...ses, bookingId: ses.bookingId || b.bookingId, slotId: ses.slotId || b.slotId,
    slotCode: ses.slotCode || b.slotCode, licensePlate: ses.licensePlate || b.licensePlate,
    zoneId: ses.zoneId || b.zoneId, zoneName: ses.zoneName || b.zoneName,
    floorId: ses.floorId || b.floorId, floorName: ses.floorName || b.floorName,
    buildingId: ses.buildingId || b.buildingId, buildingName: ses.buildingName || b.buildingName,
    qrToken: ses.qrToken || b.qrToken,
  };
}
export function resolveMySession(bookings, sessions) {
  const cur = getCurSession(sessions);
  if (cur) return enrichSession(cur, bookings);
  return getActiveBooking(bookings) || null;
}

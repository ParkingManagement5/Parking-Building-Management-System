import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bike,
  Building2,
  CarFront,
  CheckCircle2,
  CircleDot,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  QrCode,
  SquareParking,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { floorApi } from "../../api/manager/floorApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { unwrapApiData } from "../../utils/api";
import { getBookingStatus } from "./driverPortalUtils";

const ZONE_COUNT = 6;

const STATUS_STYLE = {
  mine: {
    label: "Your slot",
    slot: "border-sky-700 bg-sky-600 text-white shadow-[0_0_0_4px_rgba(186,230,253,0.9)]",
    dot: "bg-sky-600",
  },
  available: {
    label: "Available",
    slot: "border-emerald-300 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
  occupied: {
    label: "Occupied",
    slot: "border-slate-300 bg-slate-200 text-slate-500",
    dot: "bg-slate-400",
  },
  reserved: {
    label: "Reserved",
    slot: "border-amber-300 bg-amber-50 text-amber-800",
    dot: "bg-amber-400",
  },
  maintenance: {
    label: "Maintenance",
    slot: "border-rose-300 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
};

function getActiveBooking(bookings) {
  return bookings.find((item) => {
    const status = getBookingStatus(item).toUpperCase();
    const qrUsed = item?.qrUsed === true || Boolean(item?.qrUsedAt);
    const expiryValue = item?.expiredAt || item?.bookingEndTime;
    const expiresAt = expiryValue ? new Date(expiryValue).getTime() : null;
    const isExpired = Number.isFinite(expiresAt) && expiresAt < Date.now();
    return status === "PENDING_PAYMENT" || (status === "CONFIRMED" && !qrUsed && !isExpired);
  });
}

function getCurrentSession(sessions) {
  return (
    sessions.find((item) => String(item?.status || "").toUpperCase() === "ACTIVE") ||
    sessions.find((item) => String(item?.status || "").toUpperCase() === "WAITING_PAYMENT") ||
    null
  );
}

function enrichSessionRecord(session, bookings) {
  if (!session) return null;

  const matchedBooking =
    bookings.find((item) => String(item.bookingId) === String(session.bookingId)) ||
    bookings.find((item) => String(item.slotId) === String(session.slotId)) ||
    bookings.find((item) => String(item.licensePlate || "").toLowerCase() === String(session.licensePlate || "").toLowerCase());

  if (!matchedBooking) {
    return session;
  }

  return {
    ...matchedBooking,
    ...session,
    bookingId: session.bookingId || matchedBooking.bookingId,
    slotId: session.slotId || matchedBooking.slotId,
    slotCode: session.slotCode || matchedBooking.slotCode,
    licensePlate: session.licensePlate || matchedBooking.licensePlate,
    zoneId: session.zoneId || matchedBooking.zoneId,
    zoneName: session.zoneName || matchedBooking.zoneName,
    floorId: session.floorId || matchedBooking.floorId,
    floorName: session.floorName || matchedBooking.floorName,
    buildingId: session.buildingId || matchedBooking.buildingId,
    buildingName: session.buildingName || matchedBooking.buildingName,
    qrToken: session.qrToken || matchedBooking.qrToken,
  };
}

function normalizeSlotCode(session) {
  return session?.slotCode || session?.parkingSlotCode || "Slot";
}

function getSlotId(slot) {
  return slot?.id || slot?.slotId || slot?.parkingSlotId;
}

function getSlotCode(slot) {
  return slot?.slotCode || slot?.parkingSlotCode || "S";
}

function slotMatchesSession(slot, session) {
  const sessionSlotId = session?.slotId || session?.parkingSlotId;
  const sessionSlotCode = normalizeSlotCode(session);

  return (
    (sessionSlotId && String(getSlotId(slot)) === String(sessionSlotId)) ||
    (sessionSlotCode && String(getSlotCode(slot)).toLowerCase() === String(sessionSlotCode).toLowerCase())
  );
}

function getZoneId(zone) {
  return zone?.id || zone?.zoneId;
}

function getZoneName(zone) {
  return zone?.name || zone?.zoneName || "Zone";
}

function getFloorId(floor) {
  return floor?.id || floor?.floorId || floor?.parkingFloorId;
}

function getBuildingId(item) {
  return item?.buildingId || item?.parkingBuildingId || item?.building?.id || item?.building?.buildingId;
}

function getFloorName(floor) {
  return floor?.name || floor?.floorName || "Floor";
}

function getVehicleType(zone) {
  return zone?.vehicleType?.name || zone?.vehicleTypeName || zone?.description || "Parking";
}

function getFloorIndex(floorLike, fallback = 1) {
  const raw = floorLike?.floorNumber || floorLike?.level || floorLike?.index;
  if (Number.isFinite(Number(raw))) return Number(raw);
  const match = String(getFloorName(floorLike)).match(/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

function expectedVehicleLabel(floorIndex) {
  return floorIndex === 1 ? "Motorbike" : "Car";
}

function formatGateLabel(gate) {
  const value = String(gate || "Entry").trim();
  return value.toLowerCase() === "entry" ? "Entry" : `Entry ${value}`;
}

function getSlotStatus(slot, session) {
  if (slotMatchesSession(slot, session)) return "mine";
  return String(slot?.status || "AVAILABLE").toLowerCase();
}

function sortSlots(slots) {
  return [...slots].sort((a, b) =>
    String(getSlotCode(a)).localeCompare(String(getSlotCode(b)), undefined, { numeric: true })
  );
}

function makeFallbackSlots(session, active) {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `fallback-${active ? "target" : "slot"}-${index}`,
    slotCode: active && index === 4 ? normalizeSlotCode(session) : `S-${String(index + 1).padStart(2, "0")}`,
    status: active && index === 4 ? "mine" : index % 4 === 0 ? "OCCUPIED" : "AVAILABLE",
  }));
}

function createPlaceholderZone(floorIndex, order, session, activeFloorId, currentFloorId) {
  const zoneLetter = String.fromCharCode(64 + order);
  const isActive = String(activeFloorId) === String(currentFloorId) && order === 3;

  return {
    id: `placeholder-${floorIndex}-${zoneLetter}`,
    name: `Zone ${zoneLetter}`,
    vehicleType: expectedVehicleLabel(floorIndex),
    slots: isActive ? makeFallbackSlots(session, true) : [],
  };
}

function getZoneStats(section) {
  const slots = section?.slots || [];
  const available = slots.filter((slot) => String(slot.status || "").toLowerCase() === "available").length;
  const occupied = slots.filter((slot) => String(slot.status || "").toLowerCase() === "occupied").length;
  const reserved = slots.filter((slot) => String(slot.status || "").toLowerCase() === "reserved").length;

  return { total: slots.length, available, occupied, reserved };
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-700">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function FloorTabs({ floors, selectedFloorId, onSelectFloor }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2">
      {floors.map((floor) => {
        const selected = String(floor.id) === String(selectedFloorId);
        const Icon = floor.floorIndex === 1 ? Bike : CarFront;
        const stats = floor.sections.reduce(
          (result, section) => {
            const zoneStats = getZoneStats(section);
            return {
              total: result.total + zoneStats.total,
              available: result.available + zoneStats.available,
            };
          },
          { total: 0, available: 0 }
        );

        return (
          <button
            key={floor.id}
            type="button"
            onClick={() => onSelectFloor(floor.id)}
            className={`flex min-w-[180px] items-center gap-3 rounded-md border px-3 py-2 text-left transition ${
              selected ? "border-sky-500 bg-sky-50 text-sky-950" : "border-transparent bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-md ${selected ? "bg-sky-600 text-white" : "bg-white text-slate-700"}`}>
              <Icon size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{floor.name}</span>
              <span className="block text-xs text-slate-500">
                {stats.available}/{stats.total || 0} open
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-1">
      {Object.entries(STATUS_STYLE).map(([status, config]) => (
        <div key={status} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className={`size-2.5 rounded-full ${config.dot}`} />
          <span className="text-xs font-semibold text-slate-700">{config.label}</span>
        </div>
      ))}
    </div>
  );
}

function ParkingSlot({ slot, session, activeZone }) {
  const status = getSlotStatus(slot, activeZone ? session : null);
  const config = STATUS_STYLE[status] || STATUS_STYLE.occupied;

  return (
    <div
      className={`flex h-10 min-w-[62px] items-center justify-center rounded-md border text-xs font-black ${config.slot}`}
      title={`${getSlotCode(slot)} - ${config.label}`}
    >
      {getSlotCode(slot)}
    </div>
  );
}

function ZoneBlock({ section, active, session, order, laneSide }) {
  const stats = getZoneStats(section);
  const slots = sortSlots((section.slots || []).length ? section.slots : makeFallbackSlots(session, active));
  const targetSlot = slots.find((slot) => slotMatchesSession(slot, session));
  const visibleSlots = slots.slice(0, 6);

  if (active && targetSlot && !visibleSlots.some((slot) => slotMatchesSession(slot, session))) {
    visibleSlots[5] = targetSlot;
  }

  while (visibleSlots.length < 6) {
    visibleSlots.push({
      id: `${section.id || section.name}-placeholder-${visibleSlots.length}`,
      slotCode: `S-${String(visibleSlots.length + 1).padStart(2, "0")}`,
      status: "AVAILABLE",
    });
  }
  const upperSlots = visibleSlots.slice(0, 3);
  const lowerSlots = visibleSlots.slice(3, 6);

  return (
    <section
      className={`relative flex min-h-[188px] flex-col rounded-lg border-2 p-3 ${
        active ? "border-sky-600 bg-sky-50 shadow-[0_20px_42px_-28px_rgba(2,132,199,0.9)]" : "border-slate-300 bg-white"
      }`}
    >
      {laneSide ? (
        <div
          className={`pointer-events-none absolute left-1/2 z-20 h-5 -translate-x-1/2 border-l-2 ${
            active ? "border-sky-600" : "border-slate-300"
          } ${laneSide === "bottom" ? "-bottom-5" : "-top-5"}`}
        />
      ) : null}
      {laneSide ? (
        <div
          className={`pointer-events-none absolute left-1/2 z-20 h-4 -translate-x-1/2 border-l-2 ${
            active ? "border-sky-600" : "border-slate-300"
          } ${laneSide === "bottom" ? "bottom-0" : "top-0"}`}
        />
      ) : null}

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-md text-base font-black ${active ? "bg-sky-600 text-white" : "bg-slate-900 text-white"}`}>
            {order}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-slate-950">{section.name}</h3>
            <p className="truncate text-xs font-semibold text-slate-500">{section.vehicleType}</p>
          </div>
        </div>

        {active ? <MapPin className="size-6 shrink-0 fill-sky-600 text-sky-600" /> : null}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3 px-1">
          {upperSlots.map((slot) => (
            <ParkingSlot key={getSlotId(slot) || getSlotCode(slot)} slot={slot} session={session} activeZone={active} />
          ))}
        </div>

        <div className="relative h-8">
          <svg className="absolute inset-0 size-full" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M8 16 H92"
              fill="none"
              stroke={active ? "#0284c7" : "#cbd5e1"}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            {[18, 50, 82].map((x) => (
              <g key={x}>
                <path
                  d={`M${x} 16 V10`}
                  fill="none"
                  stroke={active ? "#0284c7" : "#cbd5e1"}
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
                <path
                  d={`M${x} 16 V22`}
                  fill="none"
                  stroke={active ? "#0284c7" : "#cbd5e1"}
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>
          {laneSide ? (
            <div
              className={`absolute left-1/2 h-6 w-0.5 -translate-x-1/2 rounded-full ${
                active ? "bg-sky-600" : "bg-slate-300"
              } ${laneSide === "bottom" ? "bottom-1/2" : "top-1/2"}`}
            />
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-3 px-1">
          {lowerSlots.map((slot) => (
            <ParkingSlot key={getSlotId(slot) || getSlotCode(slot)} slot={slot} session={session} activeZone={active} />
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs font-semibold">
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{stats.available} open</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{stats.total || visibleSlots.length} slots</span>
        {active ? <span className="rounded-md bg-sky-600 px-2 py-1 text-white">Target</span> : null}
      </div>
    </section>
  );
}

function ParkingMapBoard({ floor, sections, activeSection, session, gate }) {
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => String(section.id) === String(activeSection?.id))
  );
  const activeSectionHasSlot = (activeSection?.slots || []).some((slot) => slotMatchesSession(slot, session));

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="rounded-lg border border-slate-300 bg-slate-100 p-3">
        <div className="rounded-lg border border-slate-300 bg-white p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Floor schematic</p>
              <h2 className="text-xl font-black text-slate-950">{floor?.name}</h2>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sky-700">
              <CircleDot size={16} />
              <span className="text-sm font-bold">{activeSectionHasSlot ? `Zone ${activeIndex + 1}` : "Route"}</span>
              <ArrowRight size={15} />
              <span className="text-sm font-black">{activeSectionHasSlot ? normalizeSlotCode(session) : "Main road"}</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="relative mx-auto min-w-[820px] max-w-[1040px] rounded-lg border-[3px] border-slate-800 bg-slate-200 p-14 shadow-inner">
              <svg className="pointer-events-none absolute inset-4 z-0 size-[calc(100%-2rem)]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <marker id="parking-route-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#0284c7" />
                  </marker>
                </defs>
                <path
                  d="M8 6 H92 Q96 6 96 10 V90 Q96 94 92 94 H8 Q4 94 4 90 V10 Q4 6 8 6"
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="0.55"
                  markerEnd="url(#parking-route-arrow)"
                />
              </svg>

              <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2 text-sky-800">
                <div className="flex flex-col items-center gap-1">
                  <CarFront size={18} />
                  <span className="text-[10px] font-black uppercase tracking-wide">{formatGateLabel(gate)}</span>
                </div>
              </div>

              <div className="absolute right-7 top-1/2 z-20 -translate-y-1/2 text-sky-700">
                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="-rotate-90" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wide [writing-mode:vertical-rl]">Up ramp</span>
                </div>
              </div>

              <div className="absolute bottom-2 right-10 z-20 text-sky-700">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wide">Exit</span>
                  <ArrowRight size={15} />
                </div>
              </div>

              <div className="absolute left-7 top-1/2 z-20 -translate-y-1/2 text-sky-700">
                <div className="flex flex-col items-center gap-1">
                  <ArrowRight className="rotate-90" size={15} />
                  <span className="text-[10px] font-black uppercase tracking-wide [writing-mode:vertical-rl]">Down</span>
                </div>
              </div>

              <div className="relative z-10 rounded-lg border border-slate-300 bg-white/80 p-3">
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-3">
                    {sections.slice(0, 3).map((section, index) => (
                      <ZoneBlock
                        key={section.id}
                        section={section}
                        active={activeSectionHasSlot && String(section.id) === String(activeSection?.id)}
                        session={session}
                        order={index + 1}
                        laneSide="bottom"
                      />
                    ))}
                  </div>

                  <div className="relative h-12 text-sky-700">
                    <svg className="absolute inset-x-0 top-1/2 h-4 -translate-y-1/2" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <marker id="parking-main-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                          <path d="M0,0 L6,3 L0,6 Z" fill="#0284c7" />
                        </marker>
                      </defs>
                      <path
                        d="M2 5 H98"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="0.8"
                        markerEnd="url(#parking-main-arrow)"
                      />
                      {[16.666, 50, 83.333].map((x) => (
                        <g key={x}>
                          <path d={`M${x} 5 V0.6`} fill="none" stroke="#94a3b8" strokeWidth="0.45" />
                          <path d={`M${x} 5 V9.4`} fill="none" stroke="#94a3b8" strokeWidth="0.45" />
                        </g>
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-white/90 px-2 text-[10px] font-black uppercase tracking-wide">
                        {activeSectionHasSlot ? `${activeSection?.name || "Target zone"} / ${normalizeSlotCode(session)}` : "Main road"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {sections.slice(3, 6).map((section, index) => (
                      <ZoneBlock
                        key={section.id}
                        section={section}
                        active={activeSectionHasSlot && String(section.id) === String(activeSection?.id)}
                        session={session}
                        order={index + 4}
                        laneSide="top"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-center">
          <MapPin className="mx-auto size-9 fill-sky-600 text-sky-600" />
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-sky-700">Park here</p>
          <p className="mt-1 text-4xl font-black tracking-wide text-sky-950">{normalizeSlotCode(session)}</p>
          <p className="mt-1 text-sm font-semibold text-sky-800">
            {activeSection?.name || "Zone"} · {floor?.name || "Floor"}
          </p>
        </div>

        <Legend />
      </aside>
    </div>
  );
}

function EmptyMapState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
      <SquareParking className="mx-auto size-11 text-slate-400" />
      <h2 className="mt-3 text-xl font-black text-slate-950">No active parking session</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        Your assigned floor, zone, and slot will appear here after a booking is confirmed.
      </p>
    </div>
  );
}

export default function DriverParkingMapPage() {
  const [session, setSession] = useState(null);
  const [buildingFloors, setBuildingFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [routeFocused, setRouteFocused] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [bookingRes, sessionRes] = await Promise.all([
          bookingApi.getMyBookings(),
          driverSessionApi.getMySessions(),
        ]);
        const bookings = unwrapApiData(bookingRes.data, []);
        const sessions = unwrapApiData(sessionRes.data, []);
        const activeSession = getCurrentSession(sessions);
        const activeBooking = getActiveBooking(bookings);
        const active = activeSession
          ? enrichSessionRecord(activeSession, bookings)
          : activeBooking || null;
        if (cancelled) return;
        setSession(active || null);

        const activeFloorId = getFloorId(active);
        const activeBuildingId = getBuildingId(active);

        if (!activeBuildingId && !activeFloorId) {
          setBuildingFloors([]);
          setSelectedFloorId(null);
          return;
        }

        let floors = [];
        if (activeBuildingId) {
          const floorsRes = await floorApi.getByBuilding(activeBuildingId);
          floors = unwrapApiData(floorsRes.data, []);
        }
        if (!floors.length && activeFloorId) {
          floors = [{ id: activeFloorId, name: active?.floorName || "Floor" }];
        }

        const floorSections = await Promise.all(
          floors.map(async (floorItem, index) => {
            const floorId = getFloorId(floorItem);
            const zonesRes = floorId ? await zoneApi.getByFloor(floorId) : null;
            const zones = unwrapApiData(zonesRes?.data, []);

            const sections = await Promise.all(
              zones.map(async (zone) => {
                const zoneId = getZoneId(zone);
                const slotRes = zoneId ? await parkingSlotApi.getByZone(zoneId) : { data: [] };

                return {
                  id: zoneId,
                  name: getZoneName(zone),
                  vehicleType: getVehicleType(zone),
                  slots: unwrapApiData(slotRes.data, []),
                };
              })
            );

            const floorIndex = getFloorIndex(floorItem, index + 1);

            return {
              id: floorId || `fallback-floor-${index + 1}`,
              name: getFloorName(floorItem),
              floorIndex,
              vehicleCategory: expectedVehicleLabel(floorIndex),
              sections,
            };
          })
        );

        if (!cancelled) {
          setBuildingFloors(floorSections);
          setSelectedFloorId(activeFloorId || floorSections[0]?.id || null);
        }
      } catch (error) {
        console.error("Failed to load parking map", error);
        if (!cancelled) {
          setSession(null);
          setBuildingFloors([]);
          setSelectedFloorId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const floorProfiles = useMemo(() => {
    const floors = [...buildingFloors].sort((a, b) => a.floorIndex - b.floorIndex);
    const blueprintFloors = Array.from({ length: 3 }, (_, index) => {
      const floorIndex = index + 1;

      return {
        id: `fallback-floor-${floorIndex}`,
        name: `Floor ${floorIndex}`,
        floorIndex,
        vehicleCategory: expectedVehicleLabel(floorIndex),
        sections: Array.from({ length: ZONE_COUNT }, (_, zoneIndex) =>
          createPlaceholderZone(floorIndex, zoneIndex + 1, session, getFloorId(session), `fallback-floor-${floorIndex}`)
        ),
        isFallback: true,
      };
    });

    return blueprintFloors.map((blueprint, index) => {
      const floorItem =
        floors.find((candidate) => getFloorIndex(candidate, index + 1) === blueprint.floorIndex) || blueprint;
      const floorIndex = floorItem.floorIndex || blueprint.floorIndex;
      const paddedSections = Array.from({ length: ZONE_COUNT }, (_, zoneIndex) => {
        const zoneName = `Zone ${String.fromCharCode(65 + zoneIndex)}`;
        const matched =
          (floorItem.sections || []).find((section) => getZoneName(section).toLowerCase() === zoneName.toLowerCase()) ||
          floorItem.sections?.[zoneIndex];

        return matched || createPlaceholderZone(floorIndex, zoneIndex + 1, session, getFloorId(session), floorItem.id);
      });

      return {
        ...blueprint,
        ...floorItem,
        floorIndex,
        vehicleCategory: floorItem.vehicleCategory || expectedVehicleLabel(floorIndex),
        name: floorItem.name || blueprint.name,
        sections: paddedSections,
        isActiveFloor: String(floorItem.id) === String(getFloorId(session)),
      };
    });
  }, [buildingFloors, session]);

  const currentFloor =
    floorProfiles.find((floorItem) =>
      (floorItem.sections || []).some((section) => (section.slots || []).some((slot) => slotMatchesSession(slot, session)))
    ) ||
    floorProfiles.find((floorItem) => String(floorItem.id) === String(selectedFloorId)) ||
    floorProfiles.find((floorItem) => floorItem.isActiveFloor) ||
    floorProfiles[0];
  const displaySections = currentFloor?.sections || [];
  const sectionWithSessionSlot = displaySections.find((section) =>
    (section.slots || []).some((slot) => slotMatchesSession(slot, session))
  );
  const activeSection =
    sectionWithSessionSlot ||
    displaySections.find((section) => String(section.id) === String(session?.zoneId)) ||
    displaySections.find((section) => getZoneName(section) === session?.zoneName) ||
    displaySections[0];
  const building = session?.buildingName || session?.parkingBuildingName || "Parking Building";
  const floor = currentFloor?.name || session?.floorName || "Floor";
  const zone = activeSection?.name || session?.zoneName || "Zone";
  const gate = session?.entryGateCode || session?.gateCode || "Entry";
  const slotCode = normalizeSlotCode(session);

  function handleFocusRoute() {
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setRouteFocused(true);
    window.setTimeout(() => setRouteFocused(false), 1600);
  }

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-border bg-card">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <EmptyMapState />;
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-950">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Driver parking map</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">{slotCode}</h1>
              <span className="rounded-md bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">{zone}</span>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{floor}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowQr((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <QrCode size={16} />
              QR
            </button>
            <button
              type="button"
              onClick={handleFocusRoute}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <Navigation size={16} />
              Focus route
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <StatPill icon={Building2} label="Building" value={building} />
          <StatPill icon={LocateFixed} label="Gate" value={gate} />
          <StatPill icon={currentFloor?.floorIndex === 1 ? Bike : CarFront} label="Vehicle" value={currentFloor?.vehicleCategory || "Parking"} />
          <StatPill icon={CheckCircle2} label="Destination" value={`${zone} / ${slotCode}`} />
        </div>
      </div>

      <FloorTabs floors={floorProfiles} selectedFloorId={currentFloor?.id} onSelectFloor={setSelectedFloorId} />

      {showQr && session?.qrToken ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid w-fit place-items-center rounded-lg border border-slate-200 bg-slate-50 p-4">
            <QRCodeSVG value={session.qrToken} size={180} level="M" includeMargin={false} />
          </div>
        </div>
      ) : null}

      <div
        ref={mapRef}
        className={`rounded-lg transition-shadow duration-300 ${
          routeFocused ? "shadow-[0_0_0_4px_rgba(14,165,233,0.35),0_20px_50px_-30px_rgba(2,132,199,0.8)]" : ""
        }`}
      >
        <ParkingMapBoard floor={currentFloor} sections={displaySections} activeSection={activeSection} session={session} gate={gate} />
      </div>
    </div>
  );
}

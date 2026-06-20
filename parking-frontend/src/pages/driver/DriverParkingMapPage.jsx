import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CarFront, ChevronRight, LoaderCircle, MapPin, Navigation, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { unwrapApiData } from "../../utils/api";
import { getBookingStatus } from "./driverPortalUtils";

function getActiveBooking(bookings) {
  return bookings.find((item) => {
    const status = getBookingStatus(item);
    return (
      status.includes("pending") ||
      status.includes("confirmed") ||
      status.includes("checked_in") ||
      status.includes("active")
    );
  });
}

function normalizeSlotCode(session) {
  return session?.slotCode || session?.parkingSlotCode || "Slot";
}

function getSlotId(slot) {
  return slot?.id || slot?.slotId || slot?.parkingSlotId;
}

function getZoneId(zone) {
  return zone?.id || zone?.zoneId;
}

function getZoneName(zone) {
  return zone?.name || zone?.zoneName || "Zone";
}

function getVehicleType(zone) {
  return zone?.vehicleType?.name || zone?.vehicleTypeName || zone?.description || "Parking";
}

function getSlotStatus(slot, session) {
  if (String(getSlotId(slot)) === String(session?.slotId)) return "mine";
  return String(slot?.status || "AVAILABLE").toLowerCase();
}

function slotClass(status) {
  if (status === "mine") return "border-blue-600 bg-blue-50 text-blue-800 ring-4 ring-blue-100";
  if (status === "occupied") return "border-slate-300 bg-slate-200 text-slate-500";
  if (status === "reserved") return "border-amber-400 bg-amber-50 text-amber-800";
  if (status === "maintenance") return "border-slate-400 bg-slate-100 text-slate-500";
  return "border-emerald-500 bg-white text-slate-800";
}

function arrangeSlots(slots, session) {
  const list = slots.length
    ? slots
    : Array.from({ length: 8 }, (_, index) => ({
        id: `fallback-${index}`,
        slotCode: index === 3 ? normalizeSlotCode(session) : `S-${String(index + 1).padStart(2, "0")}`,
        status: index === 3 ? "mine" : "AVAILABLE",
      }));

  const sorted = [...list].sort((a, b) =>
    String(a.slotCode || "").localeCompare(String(b.slotCode || ""), undefined, { numeric: true })
  );
  const midpoint = Math.ceil(sorted.length / 2);

  return [
    { label: "Row A", slots: sorted.slice(0, midpoint) },
    { label: "Row B", slots: sorted.slice(midpoint) },
  ];
}

function SlotCell({ slot, session, compact = false }) {
  const code = slot?.slotCode || slot?.parkingSlotCode || "Slot";
  const status = getSlotStatus(slot, session);
  const isMine = status === "mine";

  return (
    <div
      className={`relative flex ${compact ? "h-[76px] min-w-[104px] p-2" : "h-[88px] min-w-[126px] p-3"} flex-col justify-between rounded-lg border-2 ${slotClass(status)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={compact ? "text-xs font-bold" : "text-sm font-bold"}>{code}</span>
        {isMine ? <MapPin className="size-5 fill-blue-600 text-blue-600" /> : null}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
          {isMine ? "Your slot" : String(status).replace("_", " ")}
        </span>
        {isMine && !compact ? (
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">PARK</span>
        ) : null}
      </div>
    </div>
  );
}

function Chip({ value }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
      {value}
    </span>
  );
}

function Lane({ label = "Driving lane" }) {
  return (
    <div className="relative flex h-[70px] items-center justify-center rounded-xl border border-slate-300 bg-slate-100">
      <div className="absolute inset-x-5 top-1/2 border-t-2 border-dashed border-slate-300" />
      <ChevronRight className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-300" />
      <ChevronRight className="absolute right-4 top-1/2 size-5 -translate-y-1/2 text-slate-300" />
      <span className="relative z-10 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">
        {label}
      </span>
    </div>
  );
}

function ZoneSection({ section, session, active }) {
  const rows = arrangeSlots(section.slots || [], active ? session : null);
  const total = section.slots?.length || 0;
  const free = (section.slots || []).filter((slot) => String(slot.status || "").toLowerCase() === "available").length;

  return (
    <section
      className={`rounded-xl border bg-white p-4 shadow-sm ${active ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-300"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`size-2.5 rounded-full ${active ? "bg-blue-600" : "bg-slate-300"}`} />
            <h3 className="truncate text-sm font-bold text-slate-800">{section.name}</h3>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{section.vehicleType}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span>{free}/{total} free</span>
          {active ? <span className="rounded-full bg-blue-600 px-2 py-1 text-white">Your zone</span> : null}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid auto-cols-[minmax(104px,1fr)] grid-flow-col gap-2 overflow-x-auto pb-1">
          {rows[0].slots.map((slot) => (
            <SlotCell key={getSlotId(slot) || slot.slotCode} slot={slot} session={active ? session : null} compact={!active} />
          ))}
        </div>

        <Lane label={active ? "Main lane" : "Lane"} />

        <div className="grid auto-cols-[minmax(104px,1fr)] grid-flow-col gap-2 overflow-x-auto pt-1">
          {rows[1].slots.map((slot) => (
            <SlotCell key={getSlotId(slot) || slot.slotCode} slot={slot} session={active ? session : null} compact={!active} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DriverParkingMapPage() {
  const [session, setSession] = useState(null);
  const [zoneSections, setZoneSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const bookingRes = await bookingApi.getMyBookings();
        const active = getActiveBooking(unwrapApiData(bookingRes.data, []));
        if (cancelled) return;
        setSession(active || null);

        if (active?.zoneId) {
          const zonesRes = active?.floorId ? await zoneApi.getByFloor(active.floorId) : null;
          const zones = unwrapApiData(zonesRes?.data, []).length
            ? unwrapApiData(zonesRes.data, [])
            : [{ id: active.zoneId, name: active.zoneName }];

          const sections = await Promise.all(
            zones.map(async (zone) => {
              const zoneId = getZoneId(zone);
              const slotRes = await parkingSlotApi.getByZone(zoneId);
              return {
                id: zoneId,
                name: getZoneName(zone),
                vehicleType: getVehicleType(zone),
                slots: unwrapApiData(slotRes.data, []),
              };
            })
          );

          if (!cancelled) setZoneSections(sections);
        } else {
          setZoneSections([]);
        }
      } catch (error) {
        console.error("Failed to load parking map", error);
        if (!cancelled) {
          setSession(null);
          setZoneSections([]);
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

  const displaySections = useMemo(() => {
    if (zoneSections.length) return zoneSections;
    return [
      { id: session?.zoneId || "fallback-zone-a", name: session?.zoneName || "Zone A", vehicleType: "Parking", slots: [] },
      { id: "fallback-zone-b", name: "Zone B", vehicleType: "Parking", slots: [] },
      { id: "fallback-zone-c", name: "Zone C", vehicleType: "Parking", slots: [] },
    ];
  }, [session, zoneSections]);

  const activeSection = displaySections.find((section) => String(section.id) === String(session?.zoneId)) || displaySections[0];
  const slotCode = normalizeSlotCode(session);
  const building = session?.buildingName || session?.parkingBuildingName || "Parking Building";
  const floor = session?.floorName || "Floor";
  const zone = activeSection?.name || session?.zoneName || "Zone";
  const gate = session?.entryGateCode || session?.gateCode || "Entry";

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-border bg-card">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip value={building} />
          <Chip value={floor} />
          <Chip value={zone} />
          <Chip value={slotCode} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQr((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            title="Show QR"
          >
            <QrCode size={17} />
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Navigation size={16} />
            Start
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]">
        <div className="relative min-h-[720px] overflow-hidden rounded-xl border border-slate-200 bg-[#edf1f5] p-5">
          <div className="absolute inset-0 bg-[linear-gradient(#d8e0e8_1px,transparent_1px),linear-gradient(90deg,#d8e0e8_1px,transparent_1px)] bg-[size:34px_34px] opacity-70" />

          <div className="relative z-10 grid h-full grid-cols-[96px_1fr] gap-5">
            <div className="flex flex-col items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Gate</span>
              <div className="grid size-16 place-items-center rounded-full bg-blue-600 text-white shadow-md">
                <CarFront size={28} />
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{gate}</span>
              <ArrowRight className="size-5 text-slate-400" />
              <div className="h-36 w-1 rounded-full bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Exit</span>
            </div>

            <div className="rounded-xl border border-slate-300 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Floor layout</p>
                  <h2 className="text-lg font-bold text-slate-900">{floor}</h2>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <i className="size-2 rounded-full bg-emerald-500" />
                    Available
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="size-2 rounded-full bg-slate-300" />
                    Occupied
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="size-2 rounded-full bg-amber-300" />
                    Reserved
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="size-2 rounded-full bg-blue-600" />
                    Mine
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {displaySections.map((section) => (
                  <ZoneSection
                    key={section.id}
                    section={section}
                    session={session}
                    active={String(section.id) === String(activeSection?.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-800 shadow-lg">
            <span>{gate}</span>
            <ArrowRight size={15} className="text-slate-400" />
            <span>{zone}</span>
            <ArrowRight size={15} className="text-slate-400" />
            <span className="text-blue-700">{slotCode}</span>
            <span className="text-slate-400">.</span>
            <span>2 min</span>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Park here</p>
            <div className="mt-3 rounded-lg border-2 border-blue-600 bg-blue-50 p-4 text-center">
              <MapPin className="mx-auto mb-2 size-8 fill-blue-600 text-white" />
              <p className="text-2xl font-bold text-blue-700">{slotCode}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ["Gate", gate],
              ["ETA", "2 min"],
              ["Floor", floor],
              ["Zone", zone],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</p>
              </div>
            ))}
          </div>

          {showQr && session?.qrToken ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <QRCodeSVG value={session.qrToken} size={220} level="M" includeMargin={false} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

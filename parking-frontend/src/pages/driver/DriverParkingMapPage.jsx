import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  Building2,
  CarFront,
  Clock3,
  Layers3,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  QrCode,
  Route,
  ShieldCheck,
  SquareParking,
  TrafficCone,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { floorApi } from "../../api/manager/floorApi";
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
  const name = getFloorName(floorLike);
  const match = String(name).match(/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

function expectedVehicleLabel(floorIndex) {
  return floorIndex === 1 ? "Motorbike" : "Car";
}

function createPlaceholderZone(floorIndex, order, session, activeFloorId, currentFloorId) {
  const zoneLetter = String.fromCharCode(64 + order);
  const isActiveFloor = String(activeFloorId) === String(currentFloorId);
  const shouldIncludeTarget = isActiveFloor && order === 3;

  return {
    id: `placeholder-${floorIndex}-${zoneLetter}`,
    name: `Zone ${zoneLetter}`,
    vehicleType: expectedVehicleLabel(floorIndex),
    slots: shouldIncludeTarget
      ? arrangeSlots([], session).flatMap((row) => row.slots)
      : [],
  };
}

function getSlotStatus(slot, session) {
  if (String(getSlotId(slot)) === String(session?.slotId)) return "mine";
  return String(slot?.status || "AVAILABLE").toLowerCase();
}

function formatStatusLabel(status) {
  if (status === "mine") return "Your slot";
  return String(status || "available").replaceAll("_", " ");
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

function Chip({ value }) {
  return (
    <span className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
      {value}
    </span>
  );
}

function DirectionRail({ gate, zone, floor, slotCode }) {
  const steps = [
    { icon: CarFront, label: "Enter gate", value: gate },
    { icon: Route, label: "Go to floor", value: floor },
    { icon: TrafficCone, label: "Follow zone", value: zone },
    { icon: SquareParking, label: "Park at", value: slotCode },
  ];

  return (
    <div className="rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.5)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Driver route</p>
          <h3 className="mt-1 text-base font-bold text-slate-900">Follow this sequence</h3>
        </div>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Easy navigation</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div key={step.label} className="relative rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Icon size={18} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{step.label}</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{step.value}</p>
              {index < steps.length - 1 ? (
                <ArrowRight className="absolute right-3 top-1/2 hidden size-4 -translate-y-1/2 text-slate-300 lg:block" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BuildingStack({ floors, selectedFloorId, onSelectFloor }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.5)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Building stack</p>
          <h3 className="mt-1 text-base font-bold text-slate-900">3-floor parking configuration</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">6 zones per floor</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {floors.map((floorItem) => {
          const isSelected = String(floorItem.id) === String(selectedFloorId);
          const Icon = floorItem.floorIndex === 1 ? Bike : CarFront;
          const free = floorItem.sections.reduce(
            (total, section) =>
              total + (section.slots || []).filter((slot) => String(slot.status || "").toLowerCase() === "available").length,
            0
          );
          const total = floorItem.sections.reduce((sum, section) => sum + (section.slots?.length || 0), 0);

          return (
            <button
              key={floorItem.id}
              type="button"
              onClick={() => onSelectFloor(floorItem.id)}
              className={`rounded-[24px] border p-4 text-left transition-all ${
                isSelected
                  ? "border-sky-300 bg-sky-50 shadow-[0_20px_40px_-28px_rgba(2,132,199,0.65)]"
                  : "border-slate-200 bg-slate-50/80 hover:bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`flex size-12 items-center justify-center rounded-2xl ${isSelected ? "bg-sky-600 text-white" : "bg-slate-900 text-white"}`}>
                  <Icon size={20} />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${isSelected ? "bg-sky-100 text-sky-700" : "bg-white text-slate-500"}`}>
                  Floor {floorItem.floorIndex}
                </span>
              </div>

              <div className="mt-4">
                <h4 className="text-lg font-bold text-slate-900">{floorItem.name}</h4>
                <p className="mt-1 text-sm text-slate-500">{floorItem.vehicleCategory} parking layout</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/70 bg-white/90 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Zones</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{floorItem.sections.length}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/90 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Open</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{free}/{total || 0}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ZoneBadge({ section, active, order }) {
  const total = section.slots?.length || 0;
  const free = (section.slots || []).filter((slot) => String(slot.status || "").toLowerCase() === "available").length;

  return (
    <div
      className={`relative min-w-[180px] rounded-[24px] border px-4 py-3 shadow-sm ${
        active ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 bg-white/90 text-slate-800"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
            active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          Zone {order}
        </span>
        <span className="text-[11px] font-semibold text-slate-500">{free}/{total} free</span>
      </div>
      <p className="truncate text-sm font-bold">{section.name}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{section.vehicleType}</p>
      {active ? (
        <div className="mt-3 inline-flex rounded-full bg-sky-600 px-3 py-1 text-[11px] font-semibold text-white">Your zone</div>
      ) : null}
    </div>
  );
}


export default function DriverParkingMapPage() {
  const [session, setSession] = useState(null);
  const [buildingFloors, setBuildingFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
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

        const activeFloorId = getFloorId(active);
        const activeBuildingId = getBuildingId(active);

        if (activeBuildingId || activeFloorId) {
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

              return {
                id: floorId || `fallback-floor-${index + 1}`,
                name: getFloorName(floorItem),
                floorIndex: getFloorIndex(floorItem, index + 1),
                vehicleCategory: expectedVehicleLabel(getFloorIndex(floorItem, index + 1)),
                sections,
              };
            })
          );

          if (!cancelled) {
            setBuildingFloors(floorSections);
            setSelectedFloorId(activeFloorId || floorSections[0]?.id || null);
          }
        } else {
          setBuildingFloors([]);
          setSelectedFloorId(null);
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
        sections: Array.from({ length: 6 }, (_, zoneIndex) =>
          createPlaceholderZone(floorIndex, zoneIndex + 1, session, getFloorId(session), `fallback-floor-${floorIndex}`)
        ),
        isFallback: true,
      };
    });

    return blueprintFloors.map((blueprint, index) => {
      const floorItem =
        floors.find((candidate) => getFloorIndex(candidate, index + 1) === blueprint.floorIndex) || blueprint;
      const floorIndex = floorItem.floorIndex || blueprint.floorIndex;
      const paddedSections = Array.from({ length: 6 }, (_, zoneIndex) => {
        const zoneName = `Zone ${String.fromCharCode(65 + zoneIndex)}`;
        const matched =
          (floorItem.sections || []).find((section) => getZoneName(section).toLowerCase() === zoneName.toLowerCase()) ||
          floorItem.sections?.[zoneIndex];

        return (
          matched || createPlaceholderZone(floorIndex, zoneIndex + 1, session, getFloorId(session), floorItem.id)
        );
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
    floorProfiles.find((floorItem) => String(floorItem.id) === String(selectedFloorId)) ||
    floorProfiles.find((floorItem) => floorItem.isActiveFloor) ||
    floorProfiles[0];
  const displaySections = currentFloor?.sections || [];
  const activeSection =
    displaySections.find((section) => String(section.id) === String(session?.zoneId)) ||
    displaySections.find((section) => getZoneName(section) === session?.zoneName) ||
    displaySections[0];
  const slotCode = normalizeSlotCode(session);
  const building = session?.buildingName || session?.parkingBuildingName || "Parking Building";
  const floor = currentFloor?.name || session?.floorName || "Floor";
  const zone = activeSection?.name || session?.zoneName || "Zone";
  const gate = session?.entryGateCode || session?.gateCode || "Entry";
  const freeSlots = displaySections.reduce(
    (total, section) =>
      total + (section.slots || []).filter((slot) => String(slot.status || "").toLowerCase() === "available").length,
    0
  );
  const totalSlots = displaySections.reduce((total, section) => total + (section.slots?.length || 0), 0);
  const mapStats = [
    { label: "Building", value: `${floorProfiles.length || 3} floors`, icon: Building2, tone: "bg-slate-100 text-slate-700" },
    { label: "Entry gate", value: gate, icon: LocateFixed, tone: "bg-sky-100 text-sky-700" },
    { label: "Floor type", value: currentFloor?.vehicleCategory || expectedVehicleLabel(1), icon: currentFloor?.floorIndex === 1 ? Bike : CarFront, tone: "bg-amber-100 text-amber-700" },
    { label: "Open slots", value: `${freeSlots}/${totalSlots || 0}`, icon: ShieldCheck, tone: "bg-emerald-100 text-emerald-700" },
  ];
  const sideFacts = [
    ["Building", building],
    ["Floor", floor],
    ["Vehicle", currentFloor?.vehicleCategory || expectedVehicleLabel(1)],
    ["Zone", zone],
    ["Slot", slotCode],
  ];

  if (loading) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-border bg-card">
        <LoaderCircle className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4f8_100%)] text-slate-900 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.5)]">
      <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Driver parking guide</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Parking map designed for quick scanning</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Zones are separated clearly, the driving path is highlighted, and your assigned slot is pinned so the driver can recognize it immediately.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip value={building} />
              <Chip value={floor} />
              <Chip value={zone} />
              <Chip value={slotCode} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {mapStats.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                      <p className="text-sm font-bold text-slate-900">{item.value}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setShowQr((value) => !value)}
              className="inline-flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              title="Show QR"
            >
              <QrCode size={18} />
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Navigation size={17} />
              Start route
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <DirectionRail gate={gate} zone={zone} floor={floor} slotCode={slotCode} />
        <BuildingStack floors={floorProfiles} selectedFloorId={currentFloor?.id} onSelectFloor={setSelectedFloorId} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative min-h-[780px] overflow-hidden rounded-[30px] border border-slate-200 bg-[#e9f0f5] p-4 sm:p-5">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] bg-[size:36px_36px]" />
            <div className="absolute inset-y-0 left-[84px] w-px bg-slate-300/70" />

            <div className="relative z-10 grid h-full gap-5 lg:grid-cols-[92px_minmax(0,1fr)]">
              <div className="flex flex-col items-center rounded-[24px] border border-slate-200 bg-white/92 px-3 py-5 shadow-sm backdrop-blur">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Entry</span>
                <div className="mt-4 grid size-16 place-items-center rounded-[22px] bg-slate-900 text-white shadow-lg">
                  <CarFront size={28} />
                </div>
                <span className="mt-3 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">{gate}</span>
                <div className="my-5 flex flex-1 flex-col items-center">
                  <div className="w-px flex-1 rounded-full bg-gradient-to-b from-sky-200 via-slate-200 to-slate-200" />
                  <div className="my-3 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    flow
                  </div>
                  <ArrowRight className="rotate-90 text-sky-500" size={18} />
                  <div className="mt-3 w-px flex-1 rounded-full bg-gradient-to-b from-slate-200 to-slate-300" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Exit</span>
              </div>

              <div className="space-y-4 rounded-[28px] border border-white/70 bg-white/72 p-4 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Detailed floor scheme</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-950">{floor}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {currentFloor?.vehicleCategory || "Parking"} layout with 6 grouped zones. Your destination stays pinned on the selected floor.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      <i className="size-2.5 rounded-full bg-emerald-500" />
                      Available
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      <i className="size-2.5 rounded-full bg-slate-300" />
                      Occupied
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      <i className="size-2.5 rounded-full bg-amber-300" />
                      Reserved
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                      <i className="size-2.5 rounded-full bg-sky-600" />
                      Your slot
                    </span>
                  </div>
                </div>

                <FloorZoneBoard sections={displaySections} activeSection={activeSection} session={session} />
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 z-20 flex max-w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-white/70 bg-white/92 px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg backdrop-blur">
              <span>{gate}</span>
              <ArrowRight size={15} className="text-slate-400" />
              <span>{floor}</span>
              <ArrowRight size={15} className="text-slate-400" />
              <span>{zone}</span>
              <ArrowRight size={15} className="text-slate-400" />
              <span className="text-sky-700">{slotCode}</span>
              <span className="text-slate-300">|</span>
              <span>2 min</span>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white/92 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Primary destination</p>
              <div className="mt-3 rounded-[24px] border-2 border-sky-500 bg-[linear-gradient(180deg,#f0f9ff_0%,#e0f2fe_100%)] p-5 text-center shadow-[0_24px_50px_-34px_rgba(2,132,199,0.8)]">
                <MapPin className="mx-auto mb-3 size-9 fill-sky-600 text-white" />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Park here</p>
                <p className="mt-2 text-3xl font-black tracking-[0.08em] text-sky-900">{slotCode}</p>
                <p className="mt-2 text-sm text-sky-700">{zone} | {floor}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/92 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Quick facts</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {sideFacts.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {showQr && session?.qrToken ? (
              <div className="rounded-[28px] border border-slate-200 bg-white/92 p-4 shadow-sm backdrop-blur">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Entry QR</p>
                <div className="grid place-items-center rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <QRCodeSVG value={session.qrToken} size={220} level="M" includeMargin={false} />
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function SchematicSlot({ slot, session, active }) {
  const status = getSlotStatus(slot, active ? session : null);
  const code = slot?.slotCode || slot?.parkingSlotCode || "S";

  return (
    <div
      className={`flex h-14 w-10 items-center justify-center rounded-sm border text-[9px] font-bold tracking-wide ${
        status === "mine"
          ? "border-sky-600 bg-sky-100 text-sky-900 shadow-[0_0_0_3px_rgba(224,242,254,0.95)]"
          : status === "occupied"
            ? "border-slate-400 bg-slate-200 text-slate-500"
            : status === "reserved"
              ? "border-amber-400 bg-amber-50 text-amber-800"
              : status === "maintenance"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-300 bg-white text-slate-700"
      }`}
      title={`${code} - ${formatStatusLabel(status)}`}
    >
      <span className="-rotate-90 whitespace-nowrap">{code}</span>
    </div>
  );
}

function SchematicZoneStrip({ section, session, active, orientation = "horizontal", labelSide = "start" }) {
  const slots = (section.slots || []).length
    ? [...section.slots].sort((a, b) =>
        String(a.slotCode || "").localeCompare(String(b.slotCode || ""), undefined, { numeric: true })
      )
    : arrangeSlots([], active ? session : null).flatMap((row) => row.slots);

  return (
    <div
      className={`rounded-[18px] border p-2 ${
        active ? "border-sky-300 bg-sky-50/80" : "border-slate-300 bg-white/90"
      }`}
    >
      <div
        className={`mb-2 flex items-center gap-2 ${
          labelSide === "end" ? "justify-end" : "justify-start"
        }`}
      >
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}>
          {section.name}
        </span>
      </div>
      <div
        className={`flex gap-1.5 overflow-x-auto ${
          orientation === "vertical" ? "max-h-[290px] flex-col items-center overflow-y-auto overflow-x-hidden" : "flex-row"
        }`}
      >
        {slots.map((slot) => (
          <SchematicSlot key={getSlotId(slot) || slot.slotCode} slot={slot} session={session} active={active} />
        ))}
      </div>
    </div>
  );
}

function FloorZoneBoard({ sections, activeSection, session }) {
  const topSections = sections.slice(0, Math.ceil(sections.length / 2));
  const bottomSections = sections.slice(Math.ceil(sections.length / 2));
  const activeZoneIndex = Math.max(
    0,
    sections.findIndex((section) => String(section.id) === String(activeSection?.id))
  );
  const activeZoneOrder = activeZoneIndex + 1;
  const targetSlotCode = normalizeSlotCode(session);

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Parking floor drawing</p>
            <h3 className="mt-1 text-base font-bold text-slate-900">Layout grouped like a real floor plan</h3>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            Zone strips + center lane
          </span>
        </div>

        <div className="rounded-[26px] border-[1.5px] border-slate-400 bg-white p-4 shadow-inner">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {sections.map((section, index) => (
                <ZoneBadge
                  key={section.id}
                  section={section}
                  active={String(section.id) === String(activeSection?.id)}
                  order={index + 1}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-center gap-3">
              {topSections.map((section) => (
                <div key={section.id} className="min-w-[200px] flex-1">
                  <SchematicZoneStrip
                    section={section}
                    session={session}
                    active={String(section.id) === String(activeSection?.id)}
                    orientation="horizontal"
                  />
                </div>
              ))}
            </div>

            <div className="rounded-[24px] border-[1.5px] border-slate-400 bg-slate-50 px-4 py-8">
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-lg font-bold uppercase tracking-[0.24em] text-slate-700">Bai giu xe</p>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Main circulation lane</p>
                <div className="flex w-full max-w-3xl items-center justify-around text-slate-500">
                  <ArrowRight size={24} />
                  <ArrowRight size={24} />
                  <ArrowRight size={24} />
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-sky-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.95)_0%,rgba(224,242,254,0.9)_100%)] px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">Driving guide line</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Follow the highlighted route from entry to {activeSection?.name || "target zone"}, then park at {targetSlotCode}.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm">
                  Zone {activeZoneOrder} target
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)_220px] lg:items-center">
                <div className="rounded-2xl border border-white/80 bg-white/95 px-3 py-3 text-center shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Start</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">Entry Gate</p>
                </div>

                <div className="relative h-12 overflow-hidden rounded-full border border-sky-200 bg-white/80">
                  <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 border-t-[3px] border-dashed border-sky-500" />
                  <div className="absolute left-5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-sky-600 shadow-[0_0_0_5px_rgba(224,242,254,0.95)]" />
                  <div className="absolute right-5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-sky-600 shadow-[0_0_0_5px_rgba(224,242,254,0.95)]" />
                  <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-around px-8 text-sky-600">
                    <ArrowRight size={16} />
                    <ArrowRight size={16} />
                    <ArrowRight size={16} />
                    <ArrowRight size={16} />
                  </div>
                  <div
                    className="absolute top-1/2 h-7 -translate-y-1/2 rounded-full bg-sky-100/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 shadow-sm"
                    style={{ left: `${Math.min(74, 12 + activeZoneIndex * 14)}%`, transform: "translate(-50%, -50%)" }}
                  >
                    {activeSection?.name || "Target zone"}
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-white/95 px-3 py-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Finish</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900">{targetSlotCode}</span>
                    <MapPin className="fill-sky-600 text-sky-600" size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-3">
              {bottomSections.map((section) => (
                <div key={section.id} className="min-w-[200px] flex-1">
                  <SchematicZoneStrip
                    section={section}
                    session={session}
                    active={String(section.id) === String(activeSection?.id)}
                    orientation="horizontal"
                    labelSide="end"
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
              <div className="rounded-[18px] border border-slate-300 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Entry edge</p>
                <div className="mt-3 flex items-center justify-between">
                  <CarFront className="text-slate-700" size={22} />
                  <ArrowRight className="text-slate-500" size={18} />
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Gate in</span>
                </div>
              </div>

              <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50/80 p-3">
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-slate-300" /> Occupied</span>
                  <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-white ring-1 ring-slate-400" /> Available</span>
                  <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-amber-300" /> Reserved</span>
                  <span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-sky-600" /> Your slot</span>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-300 bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Target</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">{activeSection?.name}</span>
                  <MapPin className="fill-sky-600 text-sky-600" size={18} />
                  <span className="text-sm font-bold text-sky-800">{normalizeSlotCode(session)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

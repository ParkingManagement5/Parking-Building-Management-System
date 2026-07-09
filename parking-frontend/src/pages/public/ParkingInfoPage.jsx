import { useEffect, useState } from "react";
import { Building2, Clock3, DoorOpen, Layers, MapPin, SquareParking } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { gateApi } from "../../api/manager/gateApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { unwrapApiData } from "../../utils/api";

function getBuildingId(item) {
  return item?.buildingId ?? item?.id;
}

function getFloorId(item) {
  return item?.floorId ?? item?.id;
}

function getZoneId(item) {
  return item?.zoneId ?? item?.id;
}

function getSettledData(result, fallback = []) {
  if (result?.status !== "fulfilled") {
    return fallback;
  }

  return unwrapApiData(result.value?.data, fallback);
}

function formatTime(value) {
  return value?.slice(0, 5) || "--:--";
}

export default function ParkingInfoPage() {
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadBuildings() {
      try {
        const res = await buildingApi.getAll();
        const buildingList = unwrapApiData(res.data, []);

        const summaryList = await Promise.all(
          buildingList.map(async (building) => {
            const buildingId = getBuildingId(building);
            const [floorRes, gateRes] = await Promise.allSettled([
              floorApi.getByBuilding(buildingId),
              gateApi.getByBuilding(buildingId),
            ]);

            const floors = getSettledData(floorRes, []);
            const gates = getSettledData(gateRes, []);

            const zoneResponses = await Promise.allSettled(
              floors.map((floor) => zoneApi.getByFloor(getFloorId(floor)))
            );
            const zones = zoneResponses.flatMap((response) => getSettledData(response, []));

            const slotResponses = await Promise.allSettled(
              zones.map((zone) => parkingSlotApi.getByZone(getZoneId(zone)))
            );
            const slots = slotResponses.flatMap((response) => getSettledData(response, []));

            const availableSlots = slots.filter(
              (slot) => String(slot.status || "").toUpperCase() === "AVAILABLE"
            ).length;

            return {
              ...building,
              id: buildingId,
              floorCount: floors.length,
              gateCount: gates.length,
              slotCount: slots.length,
              availableSlots,
            };
          })
        );

        if (!cancelled) {
          setBuildings(summaryList);
        }
      } catch (error) {
        console.error("Failed to load parking info", error);
        if (!cancelled) {
          setBuildings([]);
        }
      }
    }

    void loadBuildings();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-gradient-to-br from-sky-50 via-background to-emerald-50/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Building2 size={12} />
              Public Parking Directory
            </div>
            <h1 className="text-4xl font-bold text-foreground">Parking Information</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Browse the parking buildings currently available in the system, together with live capacity-related data coming from the backend.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          {buildings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <p className="text-base font-medium text-foreground">No parking buildings available</p>
              <p className="mt-2 text-sm text-muted-foreground">The backend did not return any public building data.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {buildings.map((item) => (
                <div key={item.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">{item.name}</h2>
                      <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin size={15} className="mt-0.5 shrink-0" />
                        <span>{item.address || "No address"}</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${item.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {item.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <Layers size={14} />
                        <span className="text-xs">Floors</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{item.floorCount}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <DoorOpen size={14} />
                        <span className="text-xs">Gates</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{item.gateCount}</p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                        <SquareParking size={14} />
                        <span className="text-xs">Slots</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{item.slotCount}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-emerald-700">
                        <SquareParking size={14} />
                        <span className="text-xs">Available</span>
                      </div>
                      <p className="text-xl font-bold text-emerald-700">{item.availableSlots}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock3 size={15} />
                      <span>
                        {formatTime(item.openTime)} - {formatTime(item.closeTime)}
                      </span>
                    </div>
                    {item.phone ? <span>{item.phone}</span> : null}
                    {item.email ? <span>{item.email}</span> : null}
                  </div>

                  {item.description ? (
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

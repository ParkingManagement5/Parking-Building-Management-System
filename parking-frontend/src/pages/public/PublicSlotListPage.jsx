import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CarFront,
  Filter,
  Layers,
  MapPin,
  Search,
  SquareParking,
} from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
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

function getVehicleTypeId(item) {
  return item?.vehicleTypeId ?? item?.id;
}

function getSettledData(result, fallback = []) {
  if (result?.status !== "fulfilled") {
    return fallback;
  }

  return unwrapApiData(result.value?.data, fallback);
}

function normalizeSlot(item) {
  return {
    id: item.slotId ?? item.id,
    slotCode: item.slotCode,
    status: String(item.status || "AVAILABLE").toUpperCase(),
    slotSize: item.slotSize,
    buildingId: item.zone?.floor?.building?.buildingId ?? item.zone?.floor?.building?.id,
    buildingName: item.zone?.floor?.building?.name || "Unknown building",
    floorId: item.zone?.floor?.floorId ?? item.zone?.floor?.id,
    floorName: item.zone?.floor?.name || "Unknown floor",
    zoneId: item.zone?.zoneId ?? item.zone?.id,
    zoneName: item.zone?.name || "Unknown zone",
    vehicleTypeId: item.zone?.vehicleType?.vehicleTypeId ?? item.zone?.vehicleType?.id,
    vehicleTypeName: item.zone?.vehicleType?.name || "Unknown vehicle type",
  };
}

function statusClasses(status) {
  if (status === "AVAILABLE") return "bg-emerald-100 text-emerald-700";
  if (status === "OCCUPIED") return "bg-rose-100 text-rose-700";
  if (status === "RESERVED") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function statusCopy(status) {
  if (status === "AVAILABLE") return "Ready to use";
  if (status === "OCCUPIED") return "Currently in use";
  if (status === "RESERVED") return "Held for booking";
  return "Temporarily unavailable";
}

export default function PublicSlotListPage() {
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [filters, setFilters] = useState({
    keyword: "",
    buildingId: "all",
    vehicleTypeId: "all",
    status: "all",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPublicSlots() {
      setLoading(true);
      try {
        const [buildingRes, vehicleTypeRes] = await Promise.all([
          buildingApi.getAll(),
          vehicleTypeApi.getAll(),
        ]);

        const buildingList = unwrapApiData(buildingRes.data, []);
        const vehicleTypeList = unwrapApiData(vehicleTypeRes.data, []);

        const floorResponses = await Promise.allSettled(
          buildingList.map((item) => floorApi.getByBuilding(getBuildingId(item)))
        );
        const floors = floorResponses.flatMap((result) => getSettledData(result, []));

        const zoneResponses = await Promise.allSettled(
          floors.map((item) => zoneApi.getByFloor(getFloorId(item)))
        );
        const zones = zoneResponses.flatMap((result) => getSettledData(result, []));

        const slotResponses = await Promise.allSettled(
          zones.map((item) => parkingSlotApi.getByZone(getZoneId(item)))
        );
        const slotList = slotResponses.flatMap((result) =>
          getSettledData(result, []).map(normalizeSlot)
        );

        if (!cancelled) {
          setBuildings(buildingList);
          setVehicleTypes(vehicleTypeList);
          setSlots(slotList);
        }
      } catch (error) {
        console.error("Failed to load public slot list", error);
        if (!cancelled) {
          setBuildings([]);
          setVehicleTypes([]);
          setSlots([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPublicSlots();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSlots = useMemo(() => {
    return slots.filter((item) => {
      const matchesKeyword =
        !filters.keyword.trim() ||
        item.slotCode?.toLowerCase().includes(filters.keyword.trim().toLowerCase()) ||
        item.zoneName?.toLowerCase().includes(filters.keyword.trim().toLowerCase()) ||
        item.floorName?.toLowerCase().includes(filters.keyword.trim().toLowerCase());

      const matchesBuilding =
        filters.buildingId === "all" || String(item.buildingId) === String(filters.buildingId);

      const matchesVehicleType =
        filters.vehicleTypeId === "all" || String(item.vehicleTypeId) === String(filters.vehicleTypeId);

      const matchesStatus =
        filters.status === "all" || String(item.status).toLowerCase() === String(filters.status).toLowerCase();

      return matchesKeyword && matchesBuilding && matchesVehicleType && matchesStatus;
    });
  }, [slots, filters]);

  const summary = useMemo(
    () => ({
      total: filteredSlots.length,
      available: filteredSlots.filter((item) => item.status === "AVAILABLE").length,
      occupied: filteredSlots.filter((item) => item.status === "OCCUPIED").length,
      reserved: filteredSlots.filter((item) => item.status === "RESERVED").length,
      maintenance: filteredSlots.filter((item) => item.status === "MAINTENANCE").length,
    }),
    [filteredSlots]
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border bg-gradient-to-br from-sky-50 via-background to-emerald-50/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-end">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <SquareParking size={12} />
              Public Slot Availability
            </div>
            <div className="max-w-2xl">
              <h1 className="text-4xl font-bold text-foreground">Find A Slot Before You Arrive</h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Explore live parking inventory across buildings, floors, and zones in one public directory designed for quick planning before login or booking.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Buildings</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{buildings.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">Public destinations currently listed.</p>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Available Now</p>
                <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.available}</p>
                <p className="mt-2 text-sm text-emerald-700/80">Visible slots ready for drivers right now.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl space-y-6 px-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Visible Slots</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{summary.total}</p>
              <p className="mt-2 text-sm text-muted-foreground">Matching your current filters.</p>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Available</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{summary.available}</p>
              <p className="mt-2 text-sm text-emerald-700/80">Open for immediate parking.</p>
            </div>
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-rose-700">Occupied</p>
              <p className="mt-2 text-3xl font-bold text-rose-600">{summary.occupied}</p>
              <p className="mt-2 text-sm text-rose-700/80">Currently taken by active vehicles.</p>
            </div>
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Reserved</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{summary.reserved}</p>
              <p className="mt-2 text-sm text-amber-700/80">Temporarily held for bookings.</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-600">Maintenance</p>
              <p className="mt-2 text-3xl font-bold text-slate-700">{summary.maintenance}</p>
              <p className="mt-2 text-sm text-slate-600">Unavailable until serviced.</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <Filter size={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Refine Your Search</h2>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Search</span>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      name="keyword"
                      value={filters.keyword}
                      onChange={handleFilterChange}
                      placeholder="Slot, floor, zone..."
                      className="w-full rounded-2xl border border-border bg-muted py-3 pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Building</span>
                  <select
                    name="buildingId"
                    value={filters.buildingId}
                    onChange={handleFilterChange}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="all">All buildings</option>
                    {buildings.map((item) => (
                      <option key={getBuildingId(item)} value={getBuildingId(item)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehicle Type</span>
                  <select
                    name="vehicleTypeId"
                    value={filters.vehicleTypeId}
                    onChange={handleFilterChange}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="all">All vehicle types</option>
                    {vehicleTypes.map((item) => (
                      <option key={getVehicleTypeId(item)} value={getVehicleTypeId(item)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Availability</span>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="all">All statuses</option>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </label>

                <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                  Public data helps drivers preview capacity trends, but live status can still change by the time they arrive.
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Public Results</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">Live Slot Directory</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {loading
                        ? "Loading inventory from the backend..."
                        : `${filteredSlots.length} slots currently match your selected filters.`}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                    <BadgeCheck size={16} />
                    Public inventory view
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="rounded-3xl border border-border bg-card px-6 py-14 text-center shadow-sm">
                  <p className="text-base font-medium text-foreground">Loading public slot data...</p>
                  <p className="mt-2 text-sm text-muted-foreground">Fetching buildings, floors, zones, and slot inventory.</p>
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-sm">
                  <p className="text-base font-medium text-foreground">No slots match the current filters</p>
                  <p className="mt-2 text-sm text-muted-foreground">Try another building, vehicle type, or availability status.</p>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredSlots.map((item) => (
                    <article
                      key={item.id}
                      className="group rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Slot Code</p>
                          <h3 className="mt-2 text-2xl font-bold text-foreground">{item.slotCode}</h3>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${statusClasses(item.status)}`}>
                          {item.status}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">{statusCopy(item.status)}</p>

                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex items-start gap-3 text-foreground">
                          <Building2 size={16} className="mt-0.5 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Building</p>
                            <p className="font-medium">{item.buildingName}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 text-foreground">
                          <Layers size={16} className="mt-0.5 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Floor & Zone</p>
                            <p className="font-medium">
                              {item.floorName} <span className="text-muted-foreground">-</span> {item.zoneName}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 text-foreground">
                          <CarFront size={16} className="mt-0.5 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Vehicle Type</p>
                            <p className="font-medium">{item.vehicleTypeName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                        <MapPin size={15} className="shrink-0" />
                        <span className="truncate">
                          {item.buildingName} / {item.floorName} / {item.zoneName}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

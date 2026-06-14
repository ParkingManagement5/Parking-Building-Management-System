import { useEffect, useMemo, useState } from "react";
import { Building2, Filter, Layers, Search, SquareParking } from "lucide-react";
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
      <section className="border-b border-border bg-gradient-to-br from-indigo-50 via-background to-cyan-50/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <SquareParking size={12} />
              Public Slot Availability
            </div>
            <h1 className="text-4xl font-bold text-foreground">Browse Public Parking Slots</h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              View real slot inventory from the system and filter by building, vehicle type, or slot status before logging in.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-6xl space-y-6 px-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">Visible Slots</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{summary.total}</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{summary.available}</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">Occupied</p>
              <p className="mt-2 text-3xl font-bold text-rose-600">{summary.occupied}</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">Reserved</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{summary.reserved}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Filter size={16} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Filter Slots</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-foreground">Search</span>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="keyword"
                    value={filters.keyword}
                    onChange={handleFilterChange}
                    placeholder="Slot, floor, zone..."
                    className="w-full rounded-2xl border border-border bg-muted py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-foreground">Building</span>
                <select
                  name="buildingId"
                  value={filters.buildingId}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                <span className="mb-1.5 block text-xs font-medium text-foreground">Vehicle Type</span>
                <select
                  name="vehicleTypeId"
                  value={filters.vehicleTypeId}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
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
                <span className="mb-1.5 block text-xs font-medium text-foreground">Availability</span>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="all">All statuses</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr] gap-4 border-b border-border px-5 py-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Building</span>
              <span>Floor</span>
              <span>Zone</span>
              <span>Slot</span>
              <span>Vehicle Type</span>
              <span>Status</span>
            </div>

            {loading ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">Loading public slot data...</div>
            ) : filteredSlots.length === 0 ? (
              <div className="px-5 py-10 text-sm text-muted-foreground">No slots match the selected filters.</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredSlots.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr] gap-4 px-5 py-4 text-sm transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-center gap-2 text-foreground">
                      <Building2 size={15} className="text-primary" />
                      <span className="truncate">{item.buildingName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Layers size={14} />
                      <span className="truncate">{item.floorName}</span>
                    </div>
                    <div className="truncate text-muted-foreground">{item.zoneName}</div>
                    <div className="font-semibold text-foreground">{item.slotCode}</div>
                    <div className="truncate text-muted-foreground">{item.vehicleTypeName}</div>
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

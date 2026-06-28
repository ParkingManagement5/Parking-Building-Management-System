import { useEffect, useMemo, useRef, useState } from "react";
import { Edit2, Plus, SquareParking, Trash2, X } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { ManagerPageHeader, ManagerPrimaryButton } from "../../ui/components/manager/ManagerUi";

function normalizeSlot(item) {
  return {
    id: item.slotId ?? item.id,
    zoneId: item.zone?.zoneId ?? item.zone?.id,
    zoneName: item.zone?.name || "Unknown zone",
    floorId: item.zone?.floor?.floorId ?? item.zone?.floor?.id,
    floorName: item.zone?.floor?.name || "Unknown floor",
    buildingId: item.zone?.floor?.building?.buildingId ?? item.zone?.floor?.building?.id,
    buildingName: item.zone?.floor?.building?.name || "Unknown building",
    slotCode: item.slotCode,
    slotSize: item.slotSize,
    status: String(item.status || "AVAILABLE").toUpperCase(),
  };
}

const FLOOR_ORDER = ["B3", "B2", "B1", "G", "1F", "2F", "3F", "4F", "5F"];

function mapFloorLabel(floor) {
  const floorNumber = Number(floor.floorNumber);
  if (Number.isNaN(floorNumber)) {
    return floor.name || `Floor ${floor.floorId ?? floor.id}`;
  }
  if (floorNumber < 0) {
    return `B${Math.abs(floorNumber)}`;
  }
  if (floorNumber === 0) {
    return "G";
  }
  return `${floorNumber}F`;
}

function statusColor(status) {
  if (status === "AVAILABLE") return "bg-emerald-400/90 hover:bg-emerald-500";
  if (status === "OCCUPIED") return "bg-rose-400/90";
  if (status === "RESERVED") return "bg-amber-400/90";
  return "bg-slate-400/90";
}

export default function ParkingSlotPage() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [zones, setZones] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [activeFloorId, setActiveFloorId] = useState("");
  const [filter, setFilter] = useState("all");
  const [slotPage, setSlotPage] = useState(1);
  const slotListRef = useRef(null);
  const handleSlotPage = (p) => { setSlotPage(typeof p === "function" ? p : () => p); slotListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    buildingId: "",
    floorId: "",
    zoneId: "",
    slotCode: "",
    status: "AVAILABLE",
  });

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const buildingRes = await buildingApi.getAll();
      const buildingList = buildingRes.data?.data || [];
      setBuildings(buildingList);

      const floorResponses = await Promise.all(
        buildingList.map((building) => floorApi.getByBuilding(building.buildingId ?? building.id))
      );
      const floorList = floorResponses.flatMap((res) => res.data?.data || []);
      setFloors(floorList);

      const zoneResponses = await Promise.all(
        floorList.map((floor) => zoneApi.getByFloor(floor.floorId ?? floor.id))
      );
      const zoneList = zoneResponses.flatMap((res) => res.data?.data || []);
      setZones(zoneList);

      const slotResponses = await Promise.all(
        zoneList.map((zone) => parkingSlotApi.getByZone(zone.zoneId ?? zone.id))
      );
      const slotList = slotResponses.flatMap((res) => (res.data?.data || []).map(normalizeSlot));
      setSlots(slotList);

      const firstBuilding = buildingList[0]?.buildingId
        ? String(buildingList[0].buildingId)
        : buildingList[0]?.id
          ? String(buildingList[0].id)
          : "";
      setSelectedBuildingId((prev) => prev || firstBuilding);
    } catch (error) {
      console.error("Failed to load parking slot data", error);
      alert("Cannot load parking slot data");
    }
  }

  const buildingFloors = useMemo(() => {
    const items = floors
      .filter((floor) => String(floor.building?.buildingId ?? floor.building?.id) === String(selectedBuildingId))
      .map((floor) => ({
        ...floor,
        label: mapFloorLabel(floor),
      }));

    return items.sort((a, b) => {
      const aIndex = FLOOR_ORDER.indexOf(a.label);
      const bIndex = FLOOR_ORDER.indexOf(b.label);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return String(a.label).localeCompare(String(b.label));
    });
  }, [floors, selectedBuildingId]);

  const resolvedActiveFloorId = useMemo(() => {
    if (!buildingFloors.length) {
      return "";
    }
    if (buildingFloors.some((floor) => String(floor.floorId ?? floor.id) === String(activeFloorId))) {
      return String(activeFloorId);
    }
    return String(buildingFloors[0].floorId ?? buildingFloors[0].id);
  }, [buildingFloors, activeFloorId]);

  const floorZones = useMemo(
    () => zones.filter((zone) => String(zone.floor?.floorId ?? zone.floor?.id) === String(resolvedActiveFloorId)),
    [zones, resolvedActiveFloorId]
  );

  const floorSlots = useMemo(() => {
    const current = slots.filter((slot) => String(slot.floorId) === String(resolvedActiveFloorId));
    if (filter === "all") {
      return current;
    }
    return current.filter((slot) => slot.status.toLowerCase() === filter);
  }, [slots, resolvedActiveFloorId, filter]);

  const zoneGroups = useMemo(() => {
    const currentSlots = slots.filter((slot) => String(slot.floorId) === String(resolvedActiveFloorId));
    const map = {};
    currentSlots.forEach((slot) => {
      const zid = slot.zoneId || "unknown";
      if (!map[zid]) {
        const zone = floorZones.find((z) => String(z.zoneId ?? z.id) === String(zid));
        map[zid] = { name: zone?.zoneName || zone?.name || `Zone ${zid}`, vehicleType: zone?.vehicleType?.name || "", slots: [] };
      }
      map[zid].slots.push(slot);
    });
    return Object.values(map).map((g) => ({ ...g, slots: g.slots.sort((a, b) => (a.slotCode || "").localeCompare(b.slotCode || "")) }));
  }, [slots, resolvedActiveFloorId, floorZones]);

  const counts = useMemo(() => {
    const current = slots.filter((slot) => String(slot.floorId) === String(resolvedActiveFloorId));
    return {
      available: current.filter((slot) => slot.status === "AVAILABLE").length,
      occupied: current.filter((slot) => slot.status === "OCCUPIED").length,
      reserved: current.filter((slot) => slot.status === "RESERVED").length,
    };
  }, [slots, resolvedActiveFloorId]);

  const selectedZone = useMemo(
    () => zones.find((zone) => String(zone.zoneId ?? zone.id) === String(form.zoneId)),
    [zones, form.zoneId]
  );
  const derivedSlotSize = selectedZone?.vehicleType?.slotSize || "";

  const SLOT_PAGE_SIZE = 10;
  const pagedFloorSlots = useMemo(() => floorSlots.slice((slotPage - 1) * SLOT_PAGE_SIZE, slotPage * SLOT_PAGE_SIZE), [floorSlots, slotPage]);
  const totalSlotPages = Math.max(1, Math.ceil(floorSlots.length / SLOT_PAGE_SIZE));

  const filteredFloorsForForm = useMemo(
    () => floors.filter((floor) => String(floor.building?.buildingId ?? floor.building?.id) === String(form.buildingId)),
    [floors, form.buildingId]
  );
  const filteredZonesForForm = useMemo(
    () => zones.filter((zone) => String(zone.floor?.floorId ?? zone.floor?.id) === String(form.floorId)),
    [zones, form.floorId]
  );

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      buildingId: selectedBuildingId || "",
      floorId: resolvedActiveFloorId || "",
      zoneId: "",
      slotCode: "",
      status: "AVAILABLE",
    });
    setShowModal(true);
  };

  const openEditModal = (slot) => {
    setEditingId(slot.id);
    setForm({
      buildingId: String(slot.buildingId || ""),
      floorId: String(slot.floorId || ""),
      zoneId: String(slot.zoneId || ""),
      slotCode: slot.slotCode || "",
      status: slot.status || "AVAILABLE",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "buildingId" ? { floorId: "", zoneId: "" } : {}),
      ...(name === "floorId" ? { zoneId: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.buildingId || !form.floorId || !form.zoneId || !form.slotCode.trim()) {
      alert("Building, floor, zone and slot code are required");
      return;
    }
    if (!derivedSlotSize) {
      alert("Cannot determine slot size from selected zone");
      return;
    }

    const payload = {
      zoneId: Number(form.zoneId),
      slotCode: form.slotCode.trim(),
      slotSize: derivedSlotSize,
      status: form.status,
    };

    try {
      if (editingId) {
        await parkingSlotApi.update(editingId, payload);
      } else {
        await parkingSlotApi.create(payload);
      }
      closeModal();
      await loadInitialData();
      setSelectedBuildingId(String(form.buildingId));
      setActiveFloorId(String(form.floorId));
    } catch (error) {
      console.error("Failed to save parking slot", error);
      alert(error.response?.data?.message || "Save parking slot failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this parking slot?")) {
      return;
    }
    try {
      await parkingSlotApi.delete(id);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to delete parking slot", error);
      alert(error.response?.data?.message || "Delete parking slot failed");
    }
  };

  const selectedBuilding = buildings.find((item) => String(item.buildingId ?? item.id) === String(selectedBuildingId));

  return (
    <div className="space-y-4">
      <ManagerPageHeader
        title="Parking Slot Management"
        description="Browse slot status by floor and zone using the same visual map as the reference UI."
        action={
          <div className="flex items-center gap-3">
            <select
              value={selectedBuildingId}
              onChange={(event) => setSelectedBuildingId(event.target.value)}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {buildings.map((item) => (
                <option key={item.buildingId ?? item.id} value={item.buildingId ?? item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ManagerPrimaryButton type="button" className="flex items-center gap-2" onClick={openCreateModal}>
              <Plus size={14} />
              Add Slot
            </ManagerPrimaryButton>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Available", count: counts.available, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
          { label: "Occupied", count: counts.occupied, color: "bg-rose-50 border-rose-200", text: "text-rose-700", dot: "bg-rose-500" },
          { label: "Reserved", count: counts.reserved, color: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
        ].map((item) => (
          <div key={item.label} className={`${item.color} flex items-center gap-3 rounded-2xl border p-4`}>
            <div className={`size-3 rounded-full ${item.dot}`} />
            <div>
              <p className={`text-2xl font-bold ${item.text}`}>{item.count}</p>
              <p className={`text-xs ${item.text} opacity-80`}>{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex gap-1 rounded-xl bg-muted p-1">
             {buildingFloors.map((floor) => (
              <button
                key={floor.floorId ?? floor.id}
                type="button"
                onClick={() => setActiveFloorId(String(floor.floorId ?? floor.id))}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  String(resolvedActiveFloorId) === String(floor.floorId ?? floor.id)
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {floor.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-1 rounded-xl bg-muted p-1">
            {["all", "available", "occupied", "reserved"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  filter === item
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-muted/30 p-5">
          {/* Entry gate */}
          <div className="text-center mb-4">
            <span className="inline-block rounded-b-lg bg-emerald-600 px-6 py-1.5 text-[11px] font-bold text-white tracking-wider">▼ CỔNG VÀO</span>
          </div>

          {/* Top row: first 3 zones */}
          <div className="grid grid-cols-3 gap-3">
            {zoneGroups.slice(0, 3).map((zone) => (
              <div key={zone.name} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground">{zone.name}</span>
                  <span className="text-[10px] text-emerald-500 font-mono">
                    {zone.slots.filter((s) => s.status === "AVAILABLE").length}/{zone.slots.length}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mb-2">{zone.vehicleType}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {zone.slots.map((slot) => (
                    <button key={slot.id} type="button" title={`${slot.slotCode} — ${slot.status}`}
                      onClick={() => openEditModal(slot)}
                      className={`${statusColor(slot.status)} rounded-lg py-2.5 text-[10px] font-bold text-white transition hover:scale-105 hover:z-10`}>
                      {(slot.slotCode || "").split("-").pop()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Aisle */}
          {zoneGroups.length > 3 && (
            <div className="relative text-center my-3">
              <div className="absolute left-[5%] right-[5%] top-1/2 h-px bg-border" />
              <span className="relative inline-block bg-muted/30 px-4 text-[10px] font-bold text-muted-foreground tracking-widest">ĐƯỜNG ĐI</span>
            </div>
          )}

          {/* Bottom row: next 3 zones */}
          {zoneGroups.length > 3 && (
            <div className="grid grid-cols-3 gap-3">
              {zoneGroups.slice(3, 6).map((zone) => (
                <div key={zone.name} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground">{zone.name}</span>
                    <span className="text-[10px] text-emerald-500 font-mono">
                      {zone.slots.filter((s) => s.status === "AVAILABLE").length}/{zone.slots.length}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-2">{zone.vehicleType}</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {zone.slots.map((slot) => (
                      <button key={slot.id} type="button" title={`${slot.slotCode} — ${slot.status}`}
                        onClick={() => openEditModal(slot)}
                        className={`${statusColor(slot.status)} rounded-lg py-2.5 text-[10px] font-bold text-white transition hover:scale-105 hover:z-10`}>
                        {(slot.slotCode || "").split("-").pop()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Exit gate */}
          <div className="text-center mt-4">
            <span className="inline-block rounded-t-lg bg-rose-500/20 px-6 py-1.5 text-[11px] font-bold text-rose-400 tracking-wider">▲ CỔNG RA</span>
          </div>

          {zoneGroups.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              Không có slot nào cho tầng này.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Quick Slot List</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedBuilding?.name || "Current building"} - {floorZones.length} zones on this floor
            </p>
          </div>
        </div>
        <div className="space-y-2" ref={slotListRef} style={{ minHeight: "calc(100vh - 300px)" }}>
          {pagedFloorSlots.map((slot) => (
            <div
              key={`list-${slot.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3"
            >
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <SquareParking size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{slot.slotCode}</p>
                <p className="text-xs text-muted-foreground">
                  {slot.zoneName} - {slot.slotSize}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  slot.status === "AVAILABLE"
                    ? "bg-emerald-100 text-emerald-700"
                    : slot.status === "OCCUPIED"
                      ? "bg-rose-100 text-rose-700"
                      : slot.status === "RESERVED"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700"
                }`}
              >
                {slot.status}
              </span>
              <button
                type="button"
                onClick={() => openEditModal(slot)}
                className="rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-muted"
              >
                <Edit2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(slot.id)}
                className="rounded-xl border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        {totalSlotPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button onClick={() => handleSlotPage(Math.max(1, slotPage - 1))} disabled={slotPage === 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              ← Trước
            </button>
            {Array.from({ length: totalSlotPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => handleSlotPage(p)}
                className={`size-8 rounded-lg text-xs font-bold transition ${p === slotPage ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => handleSlotPage(Math.min(totalSlotPages, slotPage + 1))} disabled={slotPage === totalSlotPages}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              Sau →
            </button>
          </div>
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingId ? "Update Parking Slot" : "Add Parking Slot"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select the floor and zone first, then create or update the slot code.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Building</label>
                <select
                  name="buildingId"
                  value={form.buildingId}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Select building</option>
                  {buildings.map((item) => (
                    <option key={item.buildingId ?? item.id} value={item.buildingId ?? item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Floor</label>
                  <select
                    name="floorId"
                    value={form.floorId}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">Select floor</option>
                    {filteredFloorsForForm.map((item) => (
                      <option key={item.floorId ?? item.id} value={item.floorId ?? item.id}>
                        {mapFloorLabel(item)} ({item.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Zone</label>
                  <select
                    name="zoneId"
                    value={form.zoneId}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">Select zone</option>
                    {filteredZonesForForm.map((item) => (
                      <option key={item.zoneId ?? item.id} value={item.zoneId ?? item.id}>
                        {item.name} ({item.vehicleType?.name || "Unknown"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Slot Code</label>
                  <input
                    name="slotCode"
                    value={form.slotCode}
                    onChange={handleChange}
                    placeholder="A01"
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Slot Size</label>
                <input
                  value={derivedSlotSize}
                  readOnly
                  placeholder="Auto from selected zone"
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-2xl border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {editingId ? "Save Slot" : "Add Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

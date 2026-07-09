import { useEffect, useMemo, useState } from "react";
import { Building2, Edit2, Plus, Trash2, X } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { ManagerPageHeader, ManagerPrimaryButton, ManagerStatusBadge } from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

function normalizeTime(value) {
  return value?.slice(0, 5) || "";
}

function getBuildingId(item) {
  return item?.buildingId ?? item?.id;
}

function getFloorId(item) {
  return item?.floorId ?? item?.id;
}

function getZoneId(item) {
  return item?.zoneId ?? item?.id;
}

export default function BuildingPage() {
  const [buildings, setBuildings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    openTime: "06:00",
    closeTime: "22:00",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    void loadBuildings();
  }, []);

  async function loadBuildings() {
    try {
      const res = await buildingApi.getAll();
      const buildingList = unwrapApiData(res.data, []);

      const summaries = await Promise.all(
        buildingList.map(async (building) => {
          const buildingId = getBuildingId(building);
          try {
            const floorRes = await floorApi.getByBuilding(buildingId);
            const floors = unwrapApiData(floorRes.data, []);
            const zoneResponses = await Promise.all(floors.map((floor) => zoneApi.getByFloor(getFloorId(floor))));
            const zones = zoneResponses.flatMap((response) => unwrapApiData(response.data, []));
            const slotResponses = await Promise.all(zones.map((zone) => parkingSlotApi.getByZone(getZoneId(zone))));
            const slots = slotResponses.flatMap((response) => unwrapApiData(response.data, []));
            const available = slots.filter(
              (slot) => String(slot.status || "").toUpperCase() === "AVAILABLE"
            ).length;
            const totalSlots = slots.length;
            const occupancy = totalSlots ? Math.round(((totalSlots - available) / totalSlots) * 100) : 0;

            return {
              ...building,
              id: buildingId,
              floors: floors.length,
              totalSlots,
              available,
              occupancy,
              status: occupancy >= 85 ? "maintenance" : "active",
            };
          } catch (error) {
            console.error("Failed to summarize building", buildingId, error);
            return {
              ...building,
              id: buildingId,
              floors: 0,
              totalSlots: 0,
              available: 0,
              occupancy: 0,
              status: "active",
            };
          }
        })
      );

      setBuildings(summaries);
    } catch (error) {
      console.error("Failed to fetch buildings", error);
    }
  }

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      address: "",
      phone: "",
      email: "",
      description: "",
      openTime: "06:00",
      closeTime: "22:00",
      latitude: "",
      longitude: "",
    });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      address: item.address || "",
      phone: item.phone || "",
      email: item.email || "",
      description: item.description || "",
      openTime: normalizeTime(item.openTime) || "06:00",
      closeTime: normalizeTime(item.closeTime) || "22:00",
      latitude: item.latitude != null ? String(item.latitude) : "",
      longitude: item.longitude != null ? String(item.longitude) : "",
    });
    setShowModal(true);
  };

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.address.trim()) {
      alert("Building name and address are required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone || null,
      email: form.email || null,
      description: form.description || null,
      openTime: `${form.openTime}:00`,
      closeTime: `${form.closeTime}:00`,
      latitude: form.latitude !== "" ? parseFloat(form.latitude) : null,
      longitude: form.longitude !== "" ? parseFloat(form.longitude) : null,
    };

    try {
      if (editingId) {
        await buildingApi.update(editingId, payload);
      } else {
        await buildingApi.create(payload);
      }

      closeModal();
      await loadBuildings();
    } catch (error) {
      console.error("Failed to save building", error);
      alert("Save building failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this building?")) {
      return;
    }

    try {
      await buildingApi.delete(id);
      await loadBuildings();
    } catch (error) {
      console.error("Failed to delete building", error);
      alert("Delete building failed");
    }
  };

  const buildingCount = useMemo(() => buildings.length, [buildings]);

  return (
    <div className="space-y-4">
      <ManagerPageHeader
        title="Building Management"
        description={`${buildingCount} buildings configured`}
        action={
          <ManagerPrimaryButton type="button" className="flex items-center gap-2" onClick={openCreateModal}>
            <Plus size={14} />
            Add Building
          </ManagerPrimaryButton>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {buildings.map((item) => (
          <div key={item.id} className="rounded-3xl border border-border bg-card p-5 transition-all hover:shadow-md">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
                <Building2 size={18} className="text-primary" />
              </div>
              <ManagerStatusBadge tone={item.status === "maintenance" ? "amber" : "emerald"}>
                {item.status === "maintenance" ? "Maintenance" : "Active"}
              </ManagerStatusBadge>
            </div>

            <h3 className="text-2xl font-semibold text-foreground">{item.name}</h3>
            <p className="mb-1 mt-1 text-sm text-muted-foreground">{item.address}</p>
            {item.latitude != null && item.longitude != null ? (
              <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-400">📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</p>
            ) : (
              <p className="mb-3 text-xs text-muted-foreground/60">Chưa có tọa độ</p>
            )}

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-3xl bg-slate-100/80 p-4 text-center dark:bg-white/5">
                <p className="text-2xl font-semibold text-slate-950 dark:text-slate-100">{item.floors}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Floors</p>
              </div>
              <div className="rounded-3xl bg-slate-100/80 p-4 text-center dark:bg-white/5">
                <p className="text-2xl font-semibold text-slate-950 dark:text-slate-100">{item.totalSlots}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Total Slots</p>
              </div>
              <div className="rounded-3xl bg-emerald-50/80 p-4 text-center dark:bg-emerald-500/10">
                <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{item.available}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">Available</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Occupancy</span>
                <span>{item.occupancy}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${item.occupancy}%` }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openEditModal(item)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <Edit2 size={13} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {editingId ? "Update Building" : "Add New Building"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep building details aligned with your facility records.
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
                <label className="mb-1.5 block text-xs font-medium text-foreground">Building Name</label>
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="South Wing"
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Address</label>
                <input
                  required
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123 Street Name"
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Phone</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="090..."
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="ops@building.com"
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Description</label>
                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Short facility note"
                  className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Open Time</label>
                  <input
                    type="time"
                    name="openTime"
                    value={form.openTime}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Close Time</label>
                  <input
                    type="time"
                    name="closeTime"
                    value={form.closeTime}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Vĩ độ (Latitude)
                    <span className="ml-1 text-muted-foreground font-normal">tuỳ chọn</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={form.latitude}
                    onChange={handleChange}
                    placeholder="VD: 10.7769"
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Kinh độ (Longitude)
                    <span className="ml-1 text-muted-foreground font-normal">tuỳ chọn</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={form.longitude}
                    onChange={handleChange}
                    placeholder="VD: 106.7009"
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Nhập tọa độ thực hoặc giả lập để hiển thị bãi đỗ trên bản đồ cho driver. Lấy tọa độ tại{" "}
                <a href="https://www.latlong.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  latlong.net
                </a>.
              </p>

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
                  {editingId ? "Save Building" : "Add Building"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

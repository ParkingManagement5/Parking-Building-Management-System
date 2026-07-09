import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Car, ChevronDown, ChevronRight, Grid3x3, Layers, Plus, Search, X } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { zoneApi } from "../../api/manager/zoneApi";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerField,
  ManagerForm,
  ManagerInput,
  ManagerPageHeader,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerRow,
  ManagerSecondaryButton,
  ManagerSelect,
  ManagerStatCard,
  ManagerStatsRow,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

function normalizeZone(item) {
  return {
    id: item.zoneId ?? item.id,
    floorId: item.floor?.floorId ?? item.floor?.id,
    floorName: item.floor?.name || "Unknown floor",
    floorNumber: item.floor?.floorNumber,
    buildingId: item.floor?.building?.buildingId ?? item.floor?.building?.id,
    buildingName: item.floor?.building?.name || "Unknown building",
    vehicleTypeId: item.vehicleType?.vehicleTypeId ?? item.vehicleType?.id,
    vehicleTypeName: item.vehicleType?.name || "Unknown vehicle type",
    zoneName: item.name,
    description: item.description || "",
    isActive: item.isActive !== false,
  };
}

export default function ZonePage() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [zones, setZones] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  // Track collapsed state per building and per floor
  const [collapsedBuildings, setCollapsedBuildings] = useState({});
  const [collapsedFloors, setCollapsedFloors] = useState({});
  const [filterSearch, setFilterSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterVehicleType, setFilterVehicleType] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    buildingId: "",
    floorId: "",
    vehicleTypeId: "",
    zoneName: "",
    description: "",
  });

  const refreshZones = useCallback(async () => {
    try {
      const res = await zoneApi.getAll();
      setZones(unwrapApiData(res.data, []).map(normalizeZone));
    } catch (error) {
      console.error("Failed to fetch zones", error);
      alert("Cannot load zones");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [buildingRes, vehicleTypeRes, floorRes, zoneRes] = await Promise.all([
          buildingApi.getAll(),
          vehicleTypeApi.getAll(),
          floorApi.getAll(),
          zoneApi.getAll(),
        ]);
        if (cancelled) return;
        setBuildings(unwrapApiData(buildingRes.data, []));
        setVehicleTypes(unwrapApiData(vehicleTypeRes.data, []));
        setFloors(unwrapApiData(floorRes.data, []));
        setZones(unwrapApiData(zoneRes.data, []).map(normalizeZone));
      } catch (error) {
        console.error("Failed to load zone dependencies", error);
        alert("Cannot load zone data");
      }
    }

    void loadInitialData();
    return () => { cancelled = true; };
  }, []);

  const filteredZones = useMemo(() => {
    const q = filterSearch.toLowerCase();
    return zones.filter((z) => {
      if (q && !z.zoneName.toLowerCase().includes(q)) return false;
      if (filterBuilding && String(z.buildingId) !== String(filterBuilding)) return false;
      if (filterVehicleType && String(z.vehicleTypeId) !== String(filterVehicleType)) return false;
      if (filterStatus === "active" && !z.isActive) return false;
      if (filterStatus === "inactive" && z.isActive) return false;
      return true;
    });
  }, [zones, filterSearch, filterBuilding, filterVehicleType, filterStatus]);

  // Nested group: building → floor → zones
  const grouped = useMemo(() => {
    // buildingId → { buildingName, floors: { floorId → { floorName, floorNumber, zones[] } } }
    const map = {};
    filteredZones.forEach((zone) => {
      const bid = String(zone.buildingId);
      const fid = String(zone.floorId);
      if (!map[bid]) map[bid] = { buildingName: zone.buildingName, floors: {} };
      if (!map[bid].floors[fid]) {
        map[bid].floors[fid] = {
          floorName: zone.floorName,
          floorNumber: zone.floorNumber,
          zones: [],
        };
      }
      map[bid].floors[fid].zones.push(zone);
    });
    // Sort zones within each floor by name
    Object.values(map).forEach((building) => {
      Object.values(building.floors).forEach((floor) => {
        floor.zones.sort((a, b) => (a.zoneName || "").localeCompare(b.zoneName || ""));
      });
    });
    return map;
  }, [filteredZones]);

  const stats = useMemo(
    () => ({
      active: zones.filter((item) => item.isActive).length,
      buildings: new Set(zones.map((item) => item.buildingId)).size,
      vehicleTypesCount: new Set(zones.map((item) => item.vehicleTypeId)).size,
    }),
    [zones]
  );

  const filteredFloors = form.buildingId
    ? floors.filter((item) => String(item.building?.buildingId ?? item.building?.id) === String(form.buildingId))
    : floors;

  const toggleBuilding = (bid) => setCollapsedBuildings((p) => ({ ...p, [bid]: !p[bid] }));
  const toggleFloor = (fid) => setCollapsedFloors((p) => ({ ...p, [fid]: !p[fid] }));

  const resetForm = () => {
    setEditingId(null);
    setForm({ buildingId: "", floorId: "", vehicleTypeId: "", zoneName: "", description: "" });
  };

  const openCreateModal = (buildingId = "", floorId = "") => {
    resetForm();
    setForm({ buildingId, floorId, vehicleTypeId: "", zoneName: "", description: "" });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "buildingId" ? { floorId: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.floorId || !form.vehicleTypeId || !form.zoneName.trim()) {
      alert("Floor, vehicle type and zone name are required");
      return;
    }

    const payload = {
      floorId: Number(form.floorId),
      vehicleTypeId: Number(form.vehicleTypeId),
      name: form.zoneName.trim(),
      description: form.description || null,
    };

    try {
      if (editingId) {
        await zoneApi.update(editingId, payload);
      } else {
        await zoneApi.create(payload);
      }
      await refreshZones();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save zone", error);
      alert(error.response?.data?.message || "Save zone failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      buildingId: item.buildingId || "",
      floorId: item.floorId || "",
      vehicleTypeId: item.vehicleTypeId || "",
      zoneName: item.zoneName || "",
      description: item.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this zone?")) return;
    try {
      await zoneApi.delete(id);
      await refreshZones();
    } catch (error) {
      console.error("Failed to delete zone", error);
      alert(error.response?.data?.message || "Delete zone failed");
    }
  };

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Zone Management"
        description="Group slot areas by floor and vehicle type to control allocation rules."
        action={
          <ManagerPrimaryButton type="button" onClick={() => openCreateModal()} className="flex items-center gap-2">
            <Plus size={14} /> Add Zone
          </ManagerPrimaryButton>
        }
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={Grid3x3} label="Total Zones" value={zones.length} hint="Zone groups created" tone="violet" />
        <ManagerStatCard icon={Building2} label="Buildings Used" value={stats.buildings} hint="Facilities with active zones" tone="blue" />
        <ManagerStatCard icon={Car} label="Vehicle Profiles" value={stats.vehicleTypesCount} hint="Vehicle types mapped to zones" tone="emerald" />
        <ManagerStatCard icon={Layers} label="Active Zones" value={stats.active} hint="Ready to receive parking slots" tone="amber" />
      </ManagerStatsRow>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Tìm tên zone..."
            className="w-full rounded-xl border border-border bg-muted py-2 pl-8 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterBuilding}
          onChange={(e) => setFilterBuilding(e.target.value)}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
        >
          <option value="">Tất cả tòa nhà</option>
          {buildings.map((b) => (
            <option key={b.buildingId ?? b.id} value={b.buildingId ?? b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filterVehicleType}
          onChange={(e) => setFilterVehicleType(e.target.value)}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
        >
          <option value="">Tất cả loại xe</option>
          {vehicleTypes.map((v) => (
            <option key={v.vehicleTypeId ?? v.id} value={v.vehicleTypeId ?? v.id}>{v.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(filterSearch || filterBuilding || filterVehicleType || filterStatus !== "all") && (
          <button
            onClick={() => { setFilterSearch(""); setFilterBuilding(""); setFilterVehicleType(""); setFilterStatus("all"); }}
            className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={12} /> Xóa lọc
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filteredZones.length} / {zones.length} zone</span>
      </div>

      {/* Grouped Building → Floor → Zones */}
      <div className="space-y-3">
        {Object.entries(grouped).length === 0 ? (
          <ManagerPanel title="Zone Directory" subtitle="0 zone records available">
            <ManagerEmptyState title="No zones yet" description="Create a zone after setting up buildings, floors, and vehicle types." />
          </ManagerPanel>
        ) : (
          Object.entries(grouped).map(([bid, buildingGroup]) => {
            const isBuildingCollapsed = collapsedBuildings[bid];
            const totalBuildingZones = Object.values(buildingGroup.floors).reduce((s, f) => s + f.zones.length, 0);
            return (
              <div key={bid} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Building header */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleBuilding(bid)}
                >
                  <div className="flex items-center gap-3">
                    {isBuildingCollapsed ? <ChevronRight size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                    <Building2 size={15} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">{buildingGroup.buildingName}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {Object.keys(buildingGroup.floors).length} tầng · {totalBuildingZones} zone
                    </span>
                  </div>
                  <ManagerPrimaryButton
                    type="button"
                    className="flex items-center gap-1.5 !py-1.5 !px-3 !text-xs"
                    onClick={(e) => { e.stopPropagation(); openCreateModal(bid); }}
                  >
                    <Plus size={12} /> Thêm zone
                  </ManagerPrimaryButton>
                </div>

                {/* Floors inside building */}
                {!isBuildingCollapsed && (
                  <div className="border-t border-border divide-y divide-border">
                    {Object.entries(buildingGroup.floors)
                      .sort(([, a], [, b]) => (a.floorNumber ?? 0) - (b.floorNumber ?? 0))
                      .map(([fid, floorGroup]) => {
                        const isFloorCollapsed = collapsedFloors[fid];
                        return (
                          <div key={fid}>
                            {/* Floor sub-header */}
                            <div
                              className="flex items-center justify-between px-5 py-2.5 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                              onClick={() => toggleFloor(fid)}
                            >
                              <div className="flex items-center gap-2.5">
                                {isFloorCollapsed ? <ChevronRight size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
                                <Layers size={13} className="text-muted-foreground" />
                                <span className="text-xs font-semibold text-foreground">
                                  Tầng {floorGroup.floorNumber} — {floorGroup.floorName}
                                </span>
                                <span className="rounded-full bg-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {floorGroup.zones.length} zone
                                </span>
                              </div>
                              <ManagerSecondaryButton
                                type="button"
                                className="!py-1 !px-2.5 !text-[11px] flex items-center gap-1"
                                onClick={(e) => { e.stopPropagation(); openCreateModal(bid, fid); }}
                              >
                                <Plus size={10} /> Zone
                              </ManagerSecondaryButton>
                            </div>

                            {/* Zones table */}
                            {!isFloorCollapsed && (
                              <ManagerDataTable columns={["Loại xe", "Tên zone", "Mô tả", "Trạng thái", "Hành động"]}>
                                {floorGroup.zones.map((item) => (
                                  <ManagerRow key={item.id}>
                                    <ManagerCell>
                                      <span className="inline-flex items-center gap-1">
                                        <Car size={11} className="text-muted-foreground" />
                                        {item.vehicleTypeName}
                                      </span>
                                    </ManagerCell>
                                    <ManagerCell className="font-medium">{item.zoneName}</ManagerCell>
                                    <ManagerCell className="text-muted-foreground">{item.description || "—"}</ManagerCell>
                                    <ManagerCell>
                                      <ManagerStatusBadge tone={item.isActive ? "emerald" : "amber"}>
                                        {item.isActive ? "Active" : "Inactive"}
                                      </ManagerStatusBadge>
                                    </ManagerCell>
                                    <ManagerCell>
                                      <div className="flex gap-2">
                                        <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Edit</ManagerSecondaryButton>
                                        <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.id)}>Delete</ManagerSecondaryButton>
                                      </div>
                                    </ManagerCell>
                                  </ManagerRow>
                                ))}
                              </ManagerDataTable>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Update Zone" : "Add Zone"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Define a zone within a floor and map it to a vehicle type.</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={handleSubmit}>
              <ManagerField label="Building">
                <ManagerSelect name="buildingId" value={form.buildingId} onChange={handleChange}>
                  <option value="">Select building</option>
                  {buildings.map((item) => (
                    <option key={item.buildingId ?? item.id} value={item.buildingId ?? item.id}>{item.name}</option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <ManagerField label="Floor">
                <ManagerSelect name="floorId" value={form.floorId} onChange={handleChange}>
                  <option value="">Select floor</option>
                  {filteredFloors.map((item) => (
                    <option key={item.floorId ?? item.id} value={item.floorId ?? item.id}>
                      Tầng {item.floorNumber} — {item.name} ({item.building?.name})
                    </option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <ManagerField label="Vehicle Type">
                <ManagerSelect name="vehicleTypeId" value={form.vehicleTypeId} onChange={handleChange}>
                  <option value="">Select vehicle type</option>
                  {vehicleTypes.map((item) => (
                    <option key={item.vehicleTypeId ?? item.id} value={item.vehicleTypeId ?? item.id}>{item.name}</option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <ManagerField label="Zone Name">
                <ManagerInput name="zoneName" value={form.zoneName} onChange={handleChange} placeholder="Zone A" />
              </ManagerField>
              <ManagerField label="Description">
                <ManagerInput name="description" value={form.description} onChange={handleChange} placeholder="Reserved for sedans" />
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Create Zone"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Cancel</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

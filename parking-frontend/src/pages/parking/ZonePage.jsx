import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Car, Grid3x3, Layers, Plus, X } from "lucide-react";
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
  const [form, setForm] = useState({
    buildingId: "",
    floorId: "",
    vehicleTypeId: "",
    zoneName: "",
    description: "",
  });

  const refreshZones = useCallback(async (sourceFloors) => {
    try {
      const responses = await Promise.all(sourceFloors.map((floor) => zoneApi.getByFloor(floor.floorId ?? floor.id)));
      setZones(responses.flatMap((res) => unwrapApiData(res.data, []).map(normalizeZone)));
    } catch (error) {
      console.error("Failed to fetch zones", error);
      alert("Cannot load zones");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [buildingRes, vehicleTypeRes] = await Promise.all([
          buildingApi.getAll(),
          vehicleTypeApi.getAll(),
        ]);
        const buildingList = unwrapApiData(buildingRes.data, []);
        const vehicleTypeList = unwrapApiData(vehicleTypeRes.data, []);
        if (cancelled) {
          return;
        }
        setBuildings(buildingList);
        setVehicleTypes(vehicleTypeList);

        const floorResponses = await Promise.all(
          buildingList.map((building) => floorApi.getByBuilding(building.buildingId ?? building.id))
        );
        const floorList = floorResponses.flatMap((res) => unwrapApiData(res.data, []));
        if (cancelled) {
          return;
        }
        setFloors(floorList);

        await refreshZones(floorList);
      } catch (error) {
        console.error("Failed to load zone dependencies", error);
        alert("Cannot load zone data");
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [refreshZones]);

  const filteredFloors = form.buildingId
    ? floors.filter((item) => (item.building?.buildingId ?? item.building?.id) === Number(form.buildingId))
    : floors;

  const stats = useMemo(
    () => ({
      active: zones.filter((item) => item.isActive).length,
      buildings: new Set(zones.map((item) => item.buildingId)).size,
      vehicleTypesCount: new Set(zones.map((item) => item.vehicleTypeId)).size,
    }),
    [zones]
  );

  const resetForm = () => {
    setEditingId(null);
    setForm({
      buildingId: "",
      floorId: "",
      vehicleTypeId: "",
      zoneName: "",
      description: "",
    });
  };

  const openCreateModal = () => {
    resetForm();
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
      await refreshZones(floors);
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
      await refreshZones(floors);
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
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
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

      <ManagerPanel title="Zone Directory" subtitle={`${zones.length} zone records available`}>
        {zones.length === 0 ? (
          <ManagerEmptyState title="No zones yet" description="Create a zone after setting up buildings, floors, and vehicle types." />
        ) : (
          <ManagerDataTable columns={["Building", "Floor", "Vehicle Type", "Zone", "Description", "Status", "Actions"]}>
            {zones.map((item) => (
              <ManagerRow key={item.id}>
                <ManagerCell>{item.buildingName}</ManagerCell>
                <ManagerCell>{item.floorName}</ManagerCell>
                <ManagerCell>{item.vehicleTypeName}</ManagerCell>
                <ManagerCell className="font-medium">{item.zoneName}</ManagerCell>
                <ManagerCell>{item.description || "No description"}</ManagerCell>
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
      </ManagerPanel>

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
                    <option key={item.floorId ?? item.id} value={item.floorId ?? item.id}>{item.name} ({item.building?.name})</option>
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

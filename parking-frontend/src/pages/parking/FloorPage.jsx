import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Layers, Plus, Rows3, ShieldCheck, X } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
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

function normalizeFloor(item) {
  return {
    id: item.floorId ?? item.id,
    buildingId: item.building?.buildingId ?? item.building?.id,
    buildingName: item.building?.name || "Unknown building",
    floorNumber: item.floorNumber,
    floorName: item.name,
    capacity: item.capacity ?? 0,
    isActive: item.isActive !== false,
  };
}

export default function FloorPage() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    buildingId: "",
    floorNumber: "",
    floorName: "",
    capacity: "",
  });

  const refreshFloors = useCallback(async (buildingList) => {
    try {
      const responses = await Promise.all(
        buildingList.map((building) => floorApi.getByBuilding(building.buildingId ?? building.id))
      );
      setFloors(responses.flatMap((res) => (res.data?.data || []).map(normalizeFloor)));
    } catch (error) {
      console.error("Failed to fetch floors", error);
      alert("Cannot load floors");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const buildingRes = await buildingApi.getAll();
        const buildingList = buildingRes.data?.data || [];
        if (cancelled) {
          return;
        }
        setBuildings(buildingList);
        await refreshFloors(buildingList);
      } catch (error) {
        console.error("Failed to load buildings", error);
        alert("Cannot load buildings");
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [refreshFloors]);

  const stats = useMemo(() => {
    const active = floors.filter((item) => item.isActive).length;
    const capacity = floors.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
    return { active, capacity };
  }, [floors]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ buildingId: "", floorNumber: "", floorName: "", capacity: "" });
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
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.buildingId || !form.floorNumber || !form.floorName.trim()) {
      alert("Building, floor number and floor name are required");
      return;
    }

    const payload = {
      buildingId: Number(form.buildingId),
      floorNumber: Number(form.floorNumber),
      name: form.floorName.trim(),
      capacity: form.capacity ? Number(form.capacity) : 0,
    };

    try {
      if (editingId) {
        await floorApi.update(editingId, payload);
      } else {
        await floorApi.create(payload);
      }
      await refreshFloors(buildings);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save floor", error);
      alert(error.response?.data?.message || "Save floor failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      buildingId: item.buildingId || "",
      floorNumber: item.floorNumber ?? "",
      floorName: item.floorName || "",
      capacity: item.capacity ?? "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this floor?")) return;
    try {
      await floorApi.delete(id);
      await refreshFloors(buildings);
    } catch (error) {
      console.error("Failed to delete floor", error);
      alert(error.response?.data?.message || "Delete floor failed");
    }
  };

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Floor Management"
        description="Configure floor structure under each building and keep capacity planning visible."
        action={
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={14} /> Add Floor
          </ManagerPrimaryButton>
        }
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={Layers} label="Total Floors" value={floors.length} hint="Configured across all buildings" tone="violet" />
        <ManagerStatCard icon={Building2} label="Buildings Covered" value={new Set(floors.map((item) => item.buildingId)).size} hint="Buildings with at least one floor" tone="blue" />
        <ManagerStatCard icon={ShieldCheck} label="Active Floors" value={stats.active} hint="Ready for zone assignment" tone="emerald" />
        <ManagerStatCard icon={Rows3} label="Combined Capacity" value={stats.capacity} hint="Reported floor capacity total" tone="amber" />
      </ManagerStatsRow>

      <ManagerPanel title="Floor Directory" subtitle={`${floors.length} floor records available`}>
        {floors.length === 0 ? (
          <ManagerEmptyState title="No floors yet" description="Create a floor after adding buildings to organize parking zones properly." />
        ) : (
          <ManagerDataTable columns={["Building", "Floor #", "Name", "Capacity", "Status", "Actions"]}>
            {floors.map((item) => (
              <ManagerRow key={item.id}>
                <ManagerCell>{item.buildingName}</ManagerCell>
                <ManagerCell className="font-medium">{item.floorNumber}</ManagerCell>
                <ManagerCell>{item.floorName}</ManagerCell>
                <ManagerCell>{item.capacity}</ManagerCell>
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
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Update Floor" : "Add Floor"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Attach each floor to the right building and capacity band.</p>
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
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Floor Number">
                  <ManagerInput type="number" name="floorNumber" value={form.floorNumber} onChange={handleChange} placeholder="1" />
                </ManagerField>
                <ManagerField label="Capacity">
                  <ManagerInput type="number" name="capacity" value={form.capacity} onChange={handleChange} placeholder="50" />
                </ManagerField>
              </div>
              <ManagerField label="Floor Name">
                <ManagerInput name="floorName" value={form.floorName} onChange={handleChange} placeholder="Ground Floor" />
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Create Floor"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Cancel</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

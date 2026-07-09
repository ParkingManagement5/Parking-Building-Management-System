import { useEffect, useMemo, useState } from "react";
import { Car, CircleDollarSign, LayoutGrid, Plus, ScanSearch, X } from "lucide-react";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
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

export default function VehicleTypePage() {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    slotSize: "SMALL",
    hourlyRate: 5000,
    dailyRate: 50000,
  });

  useEffect(() => {
    void fetchVehicleTypes();
  }, []);

  async function fetchVehicleTypes() {
    try {
      const res = await vehicleTypeApi.getAll();
      setVehicleTypes(unwrapApiData(res.data, []));
    } catch (error) {
      console.error("Failed to fetch vehicle types", error);
      alert("Cannot load vehicle types");
    }
  }

  const stats = useMemo(() => {
    const avgHourly = vehicleTypes.length
      ? Math.round(vehicleTypes.reduce((sum, item) => sum + Number(item.hourlyRate || 0), 0) / vehicleTypes.length)
      : 0;
    return {
      large: vehicleTypes.filter((item) => item.slotSize === "LARGE").length,
      avgHourly,
    };
  }, [vehicleTypes]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      slotSize: "SMALL",
      hourlyRate: 5000,
      dailyRate: 50000,
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      alert("Vehicle type name is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      slotSize: form.slotSize,
      hourlyRate: Number(form.hourlyRate),
      dailyRate: Number(form.dailyRate),
    };

    try {
      if (editingId) {
        await vehicleTypeApi.update(editingId, payload);
      } else {
        await vehicleTypeApi.create(payload);
      }
      await fetchVehicleTypes();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save vehicle type", error);
      alert("Save vehicle type failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.vehicleTypeId || item.id);
    setForm({
      name: item.name || "",
      description: item.description || "",
      slotSize: item.slotSize || "SMALL",
      hourlyRate: item.hourlyRate || 5000,
      dailyRate: item.dailyRate || 50000,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle type?")) return;
    try {
      await vehicleTypeApi.delete(id);
      await fetchVehicleTypes();
    } catch (error) {
      console.error("Failed to delete vehicle type", error);
      alert("Delete vehicle type failed");
    }
  };

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Vehicle Type Management"
        description="Define slot sizing and pricing defaults for each supported vehicle category."
        action={
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={14} /> Add Vehicle Type
          </ManagerPrimaryButton>
        }
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={Car} label="Vehicle Types" value={vehicleTypes.length} hint="Categories available for zoning" tone="violet" />
        <ManagerStatCard icon={LayoutGrid} label="Large Slot Types" value={stats.large} hint="Categories needing large parking slots" tone="blue" />
        <ManagerStatCard icon={CircleDollarSign} label="Avg Hourly Rate" value={`${stats.avgHourly.toLocaleString("vi-VN")}d`} hint="Average default hourly fee" tone="emerald" />
        <ManagerStatCard icon={ScanSearch} label="Slot Sizes" value={new Set(vehicleTypes.map((item) => item.slotSize)).size} hint="Different slot size groups in use" tone="amber" />
      </ManagerStatsRow>

      <ManagerPanel title="Vehicle Type Directory" subtitle={`${vehicleTypes.length} vehicle type records available`}>
        {vehicleTypes.length === 0 ? (
          <ManagerEmptyState title="No vehicle types yet" description="Create a vehicle type before configuring zones, slots, or pricing policies." />
        ) : (
          <ManagerDataTable columns={["Name", "Description", "Slot Size", "Hourly", "Daily", "Actions"]}>
            {vehicleTypes.map((item) => (
              <ManagerRow key={item.vehicleTypeId || item.id}>
                <ManagerCell className="font-medium">{item.name}</ManagerCell>
                <ManagerCell>{item.description || "No description"}</ManagerCell>
                <ManagerCell><ManagerStatusBadge tone="blue">{item.slotSize}</ManagerStatusBadge></ManagerCell>
                <ManagerCell>{Number(item.hourlyRate || 0).toLocaleString("vi-VN")}d</ManagerCell>
                <ManagerCell>{Number(item.dailyRate || 0).toLocaleString("vi-VN")}d</ManagerCell>
                <ManagerCell>
                  <div className="flex gap-2">
                    <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Edit</ManagerSecondaryButton>
                    <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.vehicleTypeId || item.id)}>Delete</ManagerSecondaryButton>
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
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Update Vehicle Type" : "Add Vehicle Type"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Keep vehicle dimensions and default rates aligned with policy setup.</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={handleSubmit}>
              <ManagerField label="Vehicle Type Name">
                <ManagerInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Car" />
              </ManagerField>
              <ManagerField label="Description">
                <ManagerInput value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Standard passenger vehicle" />
              </ManagerField>
              <ManagerField label="Slot Size">
                <ManagerSelect value={form.slotSize} onChange={(event) => setForm({ ...form, slotSize: event.target.value })}>
                  <option value="SMALL">SMALL</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LARGE">LARGE</option>
                </ManagerSelect>
              </ManagerField>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Hourly Rate">
                  <ManagerInput type="number" value={form.hourlyRate} onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })} />
                </ManagerField>
                <ManagerField label="Daily Rate">
                  <ManagerInput type="number" value={form.dailyRate} onChange={(event) => setForm({ ...form, dailyRate: event.target.value })} />
                </ManagerField>
              </div>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Create Type"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Cancel</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

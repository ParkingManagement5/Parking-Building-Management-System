import { useEffect, useState } from "react";
import { Car, Plus, X } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { unwrapApiData } from "../../utils/api";
import { getStatusClasses } from "./driverPortalUtils";

function getVehicleTypeId(item) {
  return item?.vehicleTypeId ?? item?.id ?? "";
}

export default function MyVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    licensePlate: "",
    vehicleTypeId: "",
    color: "",
    brand: "",
    model: "",
    year: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadVehicles() {
      try {
        const [vehiclesRes, typesRes] = await Promise.all([
          axiosClient.get("/vehicles/my"),
          vehicleTypeApi.getAll(),
        ]);
        if (!cancelled) {
          const types = unwrapApiData(typesRes.data, []);
          setVehicles(unwrapApiData(vehiclesRes.data, []));
          setVehicleTypes(types);
          setForm((prev) => ({
            ...prev,
            vehicleTypeId: prev.vehicleTypeId || String(getVehicleTypeId(types[0])),
          }));
        }
      } catch (error) {
        console.error("Failed to load vehicles or vehicle types", error);
        if (!cancelled) {
          setVehicles([]);
          setVehicleTypes([]);
        }
      }
    }

    void loadVehicles();

    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      licensePlate: "",
      vehicleTypeId: String(getVehicleTypeId(vehicleTypes[0])),
      color: "",
      brand: "",
      model: "",
      year: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.vehicleId || item.id);
    setForm({
      licensePlate: item.licensePlate || "",
      vehicleTypeId: String(item.vehicleType?.vehicleTypeId || item.vehicleType?.id || item.vehicleTypeId || getVehicleTypeId(vehicleTypes[0])),
      color: item.color || "",
      brand: item.brand || "",
      model: item.model || "",
      year: item.year || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.licensePlate.trim()) {
      alert("License plate is required");
      return;
    }
    if (!form.vehicleTypeId) {
      alert("Vehicle type is required. Please ask a manager to create vehicle types first.");
      return;
    }

    const payload = {
      vehicleTypeId: Number(form.vehicleTypeId),
      licensePlate: form.licensePlate.trim().toUpperCase(),
      brand: form.brand || "Unknown",
      model: form.model || "Unknown",
      color: form.color || "",
    };

    try {
      if (editingId) {
        await axiosClient.put(`/vehicles/${editingId}`, payload);
      } else {
        await axiosClient.post("/vehicles", payload);
      }

      const res = await axiosClient.get("/vehicles/my");
      setVehicles(unwrapApiData(res.data, []));
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save vehicle", error);
      alert(error.response?.data?.message || "Save vehicle failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this vehicle? It will be hidden from new bookings but history is kept.")) {
      return;
    }

    try {
      await axiosClient.delete(`/vehicles/${id}`);
      const res = await axiosClient.get("/vehicles/my");
      setVehicles(unwrapApiData(res.data, []));
    } catch (error) {
      console.error("Failed to delete vehicle", error);
      alert(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Deactivate vehicle failed"
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">My Vehicles</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {vehicles.length} registered vehicles
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Add Vehicle
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((item) => {
          const id = item.vehicleId || item.id;
          const status =
            item.isActive !== false && item.status !== "INACTIVE" ? "active" : "inactive";
          const typeName =
            item.vehicleType?.name || item.vehicleTypeName || item.vehicleType || "Vehicle";
          const displayName = [item.brand, item.model].filter(Boolean).join(" ") || "Vehicle";

          return (
            <div
              key={id}
              className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="size-10 bg-muted rounded-xl flex items-center justify-center">
                  <Car size={18} className="text-muted-foreground" />
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusClasses(
                    status
                  )}`}
                >
                  {status}
                </span>
              </div>

              <div className="font-mono text-lg font-bold text-foreground mb-1">
                {item.licensePlate}
              </div>
              <p className="text-sm text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {typeName} - {item.color || "No color"} {item.year ? `- ${item.year}` : ""}
              </p>

              <div className="flex items-center gap-2 mt-4">
                <button
                  className="flex-1 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  onClick={() => openEdit(item)}
                >
                  Edit
                </button>
                <button
                  className="flex-1 py-1.5 text-xs border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                  onClick={() => handleDelete(id)}
                >
                  Deactivate
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={openCreate}
          className="border-2 border-dashed border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary min-h-[220px]"
        >
          <Plus size={24} />
          <span className="text-sm font-medium">Add new vehicle</span>
        </button>
      </div>

      {vehicles.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
          No vehicles returned from the backend yet.
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">
                {editingId ? "Update Vehicle" : "Add New Vehicle"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  License Plate *
                </label>
                <input
                  required
                  value={form.licensePlate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, licensePlate: event.target.value }))
                  }
                  placeholder="51L-666.66"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Vehicle Type
                  </label>
                  <select
                    value={form.vehicleTypeId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        vehicleTypeId: event.target.value,
                      }))
                    }
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Select type</option>
                    {vehicleTypes.map((item) => (
                      <option key={getVehicleTypeId(item)} value={getVehicleTypeId(item)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Year
                  </label>
                  <input
                    value={form.year}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, year: event.target.value }))
                    }
                    placeholder="2024"
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Make
                </label>
                <input
                  value={form.brand}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, brand: event.target.value }))
                  }
                  placeholder="Toyota"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Model
                </label>
                <input
                  value={form.model}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, model: event.target.value }))
                  }
                  placeholder="Camry"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Color
                </label>
                <input
                  value={form.color}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, color: event.target.value }))
                  }
                  placeholder="Silver"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {editingId ? "Update Vehicle" : "Add Vehicle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

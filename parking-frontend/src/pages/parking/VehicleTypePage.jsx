import { useEffect, useState } from "react";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";

export default function VehicleTypePage() {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [editingId, setEditingId] = useState(null);

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
      setVehicleTypes(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch vehicle types", error);
      alert("Cannot load vehicle types");
    }
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Vehicle type name is required");
      return;
    }

    const payload = {
      name: form.name,
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

      resetForm();
      await fetchVehicleTypes();
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
    <div>
      <div className="page-header">
        <div>
          <h1>Vehicle Type Management</h1>
          <p>Manage vehicle categories used in parking system</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Vehicle Type" : "Add Vehicle Type"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Vehicle Type Name</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Example: Car"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Description"
              />
            </div>

            <div className="form-group">
              <label>Slot Size</label>
              <select
                value={form.slotSize}
                onChange={(e) =>
                  setForm({ ...form, slotSize: e.target.value })
                }
              >
                <option value="SMALL">SMALL</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LARGE">LARGE</option>
              </select>
            </div>

            <div className="form-group">
              <label>Hourly Rate</label>
              <input
                type="number"
                value={form.hourlyRate}
                onChange={(e) =>
                  setForm({ ...form, hourlyRate: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Daily Rate</label>
              <input
                type="number"
                value={form.dailyRate}
                onChange={(e) =>
                  setForm({ ...form, dailyRate: e.target.value })
                }
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn">
                {editingId ? "Update" : "Create"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Name</th>
                <th>Slot Size</th>
                <th>Hourly</th>
                <th>Daily</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {vehicleTypes.map((item, index) => (
                <tr key={item.vehicleTypeId || item.id}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.slotSize}</td>
                  <td>{item.hourlyRate}</td>
                  <td>{item.dailyRate}</td>
                  <td>
                    <button
                      className="text-btn"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>

                    <button
                      className="text-btn danger"
                      onClick={() =>
                        handleDelete(item.vehicleTypeId || item.id)
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {vehicleTypes.length === 0 && (
                <tr>
                  <td colSpan="6">No vehicle types found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

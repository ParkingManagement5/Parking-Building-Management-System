import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";

export default function MyVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    licensePlate: "",
    vehicleTypeId: 1,
    color: "",
    brand: "",
    model: "",
  });

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadInitialVehicles = async () => {
      try {
        const res = await axiosClient.get("/vehicles/my");
        const data = res.data?.data || res.data || [];

        if (isMounted) {
          setVehicles(data);
        }
      } catch (error) {
        console.error("Failed to load vehicles", error);
      }
    };

    void loadInitialVehicles();

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadVehicles() {
    const res = await axiosClient.get("/vehicles/my");
    const data = res.data?.data || res.data || [];
    setVehicles(data);
  }

  const resetForm = () => {
    setEditingId(null);
    setForm({
      licensePlate: "",
      vehicleTypeId: 1,
      color: "",
      brand: "",
      model: "",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.name === "vehicleTypeId"
          ? Number(e.target.value)
          : e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.licensePlate.trim()) {
      alert("License plate is required");
      return;
    }

    const payload = {
      vehicleTypeId: form.vehicleTypeId,
      licensePlate: form.licensePlate,
      brand: form.brand || "Unknown",
      model: form.model || "Unknown",
      color: form.color,
    };

    if (editingId) {
      await axiosClient.put(`/vehicles/${editingId}`, payload);
    } else {
      await axiosClient.post("/vehicles", payload);
    }

    resetForm();
    await loadVehicles();
  };

  const handleEdit = (item) => {
    setEditingId(item.vehicleId || item.id);
    setForm({
      licensePlate: item.licensePlate || "",
      vehicleTypeId: item.vehicleType?.vehicleTypeId || item.vehicleTypeId || 1,
      color: item.color || "",
      brand: item.brand || "",
      model: item.model || "",
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this vehicle?"
    );

    if (!confirmDelete) return;

    await axiosClient.delete(`/vehicles/${id}`);
    await loadVehicles();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Vehicles</h1>
          <p>Manage your registered vehicles</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Vehicle" : "Add Vehicle"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>License Plate</label>
              <input
                name="licensePlate"
                value={form.licensePlate}
                onChange={handleChange}
                placeholder="Example: 51A-12345"
              />
            </div>

            <div className="form-group">
              <label>Vehicle Type</label>
              <select
                name="vehicleTypeId"
                value={form.vehicleTypeId}
                onChange={handleChange}
              >
                <option value={1}>Car</option>
                <option value={2}>Motorbike</option>
              </select>
            </div>

            <div className="form-group">
              <label>Brand</label>
              <input
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="Example: Toyota"
              />
            </div>

            <div className="form-group">
              <label>Model</label>
              <input
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="Example: Vios"
              />
            </div>

            <div className="form-group">
              <label>Color</label>
              <input
                name="color"
                value={form.color}
                onChange={handleChange}
                placeholder="Example: White"
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
                <th>License Plate</th>
                <th>Vehicle Type</th>
                <th>Color</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {vehicles.map((item, index) => {
                const id = item.vehicleId || item.id;
                const typeName =
                  item.vehicleType?.name ||
                  item.vehicleTypeName ||
                  item.vehicleType ||
                  "Unknown";

                return (
                  <tr key={id}>
                    <td>{index + 1}</td>
                    <td>{item.licensePlate}</td>
                    <td>{typeName}</td>
                    <td>{item.color}</td>
                    <td>
                      <span className="badge success">
                        {item.status || "Active"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-btn"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>

                      <button
                        className="text-btn danger"
                        onClick={() => handleDelete(id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

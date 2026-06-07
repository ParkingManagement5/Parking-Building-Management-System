import { useState } from "react";

export default function MyVehiclesPage() {
  const [vehicles, setVehicles] = useState([
    {
      vehicleId: 1,
      licensePlate: "51A-12345",
      vehicleType: "Car",
      color: "White",
      status: "Active",
    },
    {
      vehicleId: 2,
      licensePlate: "59B1-88888",
      vehicleType: "Motorbike",
      color: "Black",
      status: "Active",
    },
  ]);

  const [form, setForm] = useState({
    licensePlate: "",
    vehicleType: "Car",
    color: "",
  });

  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      licensePlate: "",
      vehicleType: "Car",
      color: "",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.licensePlate.trim()) {
      alert("License plate is required");
      return;
    }

    if (editingId) {
      setVehicles(
        vehicles.map((item) =>
          item.vehicleId === editingId
            ? {
                ...item,
                ...form,
              }
            : item
        )
      );
    } else {
      setVehicles([
        ...vehicles,
        {
          vehicleId: Date.now(),
          ...form,
          status: "Active",
        },
      ]);
    }

    resetForm();
  };

  const handleEdit = (item) => {
    setEditingId(item.vehicleId);
    setForm({
      licensePlate: item.licensePlate,
      vehicleType: item.vehicleType,
      color: item.color,
    });
  };

  const handleDelete = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this vehicle?"
    );

    if (!confirmDelete) return;

    setVehicles(vehicles.filter((item) => item.vehicleId !== id));
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
                name="vehicleType"
                value={form.vehicleType}
                onChange={handleChange}
              >
                <option value="Car">Car</option>
                <option value="Motorbike">Motorbike</option>
              </select>
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
                <th>ID</th>
                <th>License Plate</th>
                <th>Vehicle Type</th>
                <th>Color</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {vehicles.map((item) => (
                <tr key={item.vehicleId}>
                  <td>{item.vehicleId}</td>
                  <td>{item.licensePlate}</td>
                  <td>{item.vehicleType}</td>
                  <td>{item.color}</td>
                  <td>
                    <span className="badge success">{item.status}</span>
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
                      onClick={() => handleDelete(item.vehicleId)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
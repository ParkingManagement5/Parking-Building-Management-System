import { useEffect, useState } from "react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";

function normalizeFloor(item) {
  return {
    id: item.id,
    buildingId: item.building?.id,
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
  const [form, setForm] = useState({
    buildingId: "",
    floorNumber: "",
    floorName: "",
    capacity: "",
  });

  useEffect(() => {
    // load once on page mount
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitialData() {
    try {
      const buildingRes = await buildingApi.getAll();
      const buildingList = buildingRes.data?.data || [];
      setBuildings(buildingList);
      await refreshFloors(buildingList);
    } catch (error) {
      console.error("Failed to load buildings", error);
      alert("Cannot load buildings");
    }
  }

  async function refreshFloors(buildingList = buildings) {
    try {
      const responses = await Promise.all(
        buildingList.map((building) => floorApi.getByBuilding(building.id))
      );

      const merged = responses.flatMap((res) =>
        (res.data?.data || []).map(normalizeFloor)
      );

      setFloors(merged);
    } catch (error) {
      console.error("Failed to fetch floors", error);
      alert("Cannot load floors");
    }
  }

  const resetForm = () => {
    setEditingId(null);
    setForm({
      buildingId: "",
      floorNumber: "",
      floorName: "",
      capacity: "",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

      await refreshFloors();
      resetForm();
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
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this floor?")) return;

    try {
      await floorApi.delete(id);
      await refreshFloors();
    } catch (error) {
      console.error("Failed to delete floor", error);
      alert(error.response?.data?.message || "Delete floor failed");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Floor Management</h1>
          <p>Manage floors by parking building</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Floor" : "Add Floor"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Building</label>
              <select
                name="buildingId"
                value={form.buildingId}
                onChange={handleChange}
              >
                <option value="">Select building</option>
                {buildings.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Floor Number</label>
              <input
                type="number"
                name="floorNumber"
                value={form.floorNumber}
                onChange={handleChange}
                placeholder="Example: 1"
              />
            </div>

            <div className="form-group">
              <label>Floor Name</label>
              <input
                name="floorName"
                value={form.floorName}
                onChange={handleChange}
                placeholder="Example: Ground Floor"
              />
            </div>

            <div className="form-group">
              <label>Capacity</label>
              <input
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                placeholder="Example: 50"
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
                <th>Building</th>
                <th>Floor Number</th>
                <th>Floor Name</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {floors.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.buildingName}</td>
                  <td>{item.floorNumber}</td>
                  <td>{item.floorName}</td>
                  <td>{item.capacity}</td>
                  <td>
                    <span className={`badge ${item.isActive ? "success" : "warning"}`}>
                      {item.isActive ? "Active" : "Inactive"}
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
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {floors.length === 0 && (
                <tr>
                  <td colSpan="7">No floors found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

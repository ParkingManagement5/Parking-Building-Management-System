import { useEffect, useState } from "react";
import { floorApi } from "../../api/manager/floorApi";

export default function FloorPage() {
  const [floors, setFloors] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    buildingId: "",
    floorNumber: "",
    floorName: "",
    status: "Active",
  });

  const buildings = [
    { buildingId: 1, name: "Main Parking Building" },
    { buildingId: 2, name: "Airport Parking Building" },
  ];

  const mockData = [
    {
      floorId: 1,
      buildingId: 1,
      buildingName: "Main Parking Building",
      floorNumber: 1,
      floorName: "Ground Floor",
      status: "Active",
    },
    {
      floorId: 2,
      buildingId: 1,
      buildingName: "Main Parking Building",
      floorNumber: 2,
      floorName: "Second Floor",
      status: "Active",
    },
  ];

  useEffect(() => {
    fetchFloors();
  }, []);

  const fetchFloors = async () => {
    try {
      // Sau này mở khi Backend có API:
      // const res = await floorApi.getAll();
      // setFloors(res.data.data);

      setFloors(mockData);
    } catch (error) {
      console.error("Failed to fetch floors", error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      buildingId: "",
      floorNumber: "",
      floorName: "",
      status: "Active",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const getBuildingName = (buildingId) => {
    const building = buildings.find(
      (item) => item.buildingId === Number(buildingId)
    );

    return building ? building.name : "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.buildingId || !form.floorNumber) {
      alert("Building and floor number are required");
      return;
    }

    const payload = {
      buildingId: Number(form.buildingId),
      floorNumber: Number(form.floorNumber),
      floorName: form.floorName,
      status: form.status,
    };

    try {
      if (editingId) {
        // await floorApi.update(editingId, payload);

        setFloors(
          floors.map((item) =>
            item.floorId === editingId
              ? {
                  ...item,
                  ...payload,
                  buildingName: getBuildingName(payload.buildingId),
                }
              : item
          )
        );
      } else {
        // await floorApi.create(payload);

        setFloors([
          ...floors,
          {
            floorId: Date.now(),
            ...payload,
            buildingName: getBuildingName(payload.buildingId),
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save floor", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.floorId);

    setForm({
      buildingId: item.buildingId,
      floorNumber: item.floorNumber,
      floorName: item.floorName,
      status: item.status,
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this floor?"
    );

    if (!confirmDelete) return;

    try {
      // await floorApi.delete(id);

      setFloors(floors.filter((item) => item.floorId !== id));
    } catch (error) {
      console.error("Failed to delete floor", error);
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
                  <option key={item.buildingId} value={item.buildingId}>
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
              <label>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
              </select>
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
                <th>Building</th>
                <th>Floor Number</th>
                <th>Floor Name</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {floors.map((item) => (
                <tr key={item.floorId}>
                  <td>{item.floorId}</td>
                  <td>{item.buildingName}</td>
                  <td>{item.floorNumber}</td>
                  <td>{item.floorName}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === "Active" ? "success" : "warning"
                      }`}
                    >
                      {item.status}
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
                      onClick={() => handleDelete(item.floorId)}
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
import { useEffect, useState } from "react";
import { buildingApi } from "../../api/buildingApi";

export default function BuildingPage() {
  const [buildings, setBuildings] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    operatingHours: "",
    totalFloors: "",
    status: "Active",
  });

  const mockData = [
    {
      buildingId: 1,
      name: "Main Parking Building",
      address: "District 1, Ho Chi Minh City",
      operatingHours: "24/7",
      totalFloors: 5,
      status: "Active",
    },
    {
      buildingId: 2,
      name: "Airport Parking Building",
      address: "Tan Son Nhat Airport",
      operatingHours: "24/7",
      totalFloors: 3,
      status: "Active",
    },
  ];

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      // Sau này mở khi Backend có API:
      // const res = await buildingApi.getAll();
      // setBuildings(res.data.data);

      setBuildings(mockData);
    } catch (error) {
      console.error("Failed to fetch buildings", error);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      address: "",
      operatingHours: "",
      totalFloors: "",
      status: "Active",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.address.trim()) {
      alert("Building name and address are required");
      return;
    }

    const payload = {
      name: form.name,
      address: form.address,
      operatingHours: form.operatingHours,
      totalFloors: Number(form.totalFloors),
      status: form.status,
    };

    try {
      if (editingId) {
        // await buildingApi.update(editingId, payload);

        setBuildings(
          buildings.map((item) =>
            item.buildingId === editingId
              ? { ...item, ...payload }
              : item
          )
        );
      } else {
        // await buildingApi.create(payload);

        setBuildings([
          ...buildings,
          {
            buildingId: Date.now(),
            ...payload,
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save building", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.buildingId);

    setForm({
      name: item.name,
      address: item.address,
      operatingHours: item.operatingHours,
      totalFloors: item.totalFloors,
      status: item.status,
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this building?"
    );

    if (!confirmDelete) return;

    try {
      // await buildingApi.delete(id);

      setBuildings(buildings.filter((item) => item.buildingId !== id));
    } catch (error) {
      console.error("Failed to delete building", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Building Management</h1>
          <p>Manage parking buildings in the system</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Building" : "Add Building"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Building Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter building name"
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Enter address"
              />
            </div>

            <div className="form-group">
              <label>Operating Hours</label>
              <input
                name="operatingHours"
                value={form.operatingHours}
                onChange={handleChange}
                placeholder="Example: 24/7"
              />
            </div>

            <div className="form-group">
              <label>Total Floors</label>
              <input
                type="number"
                name="totalFloors"
                value={form.totalFloors}
                onChange={handleChange}
                placeholder="Enter total floors"
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
                <th>Building Name</th>
                <th>Address</th>
                <th>Hours</th>
                <th>Total Floors</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {buildings.map((item) => (
                <tr key={item.buildingId}>
                  <td>{item.buildingId}</td>
                  <td>{item.name}</td>
                  <td>{item.address}</td>
                  <td>{item.operatingHours}</td>
                  <td>{item.totalFloors}</td>
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
                      onClick={() => handleDelete(item.buildingId)}
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
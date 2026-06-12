import { useEffect, useState } from "react";
import { buildingApi } from "../../api/manager/buildingApi";

export default function BuildingPage() {
  const [buildings, setBuildings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    openTime: "06:00",
    closeTime: "22:00",
  });

  useEffect(() => {
    void fetchBuildings();
  }, []);

  async function fetchBuildings() {
    try {
      const res = await buildingApi.getAll();
      setBuildings(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch buildings", error);
    }
  }

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
      phone: "",
      email: "",
      description: "",
      openTime: "06:00",
      closeTime: "22:00",
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
      phone: form.phone || null,
      email: form.email || null,
      description: form.description || null,
      openTime: `${form.openTime}:00`,
      closeTime: `${form.closeTime}:00`,
    };

    try {
      if (editingId) {
        await buildingApi.update(editingId, payload);
      } else {
        await buildingApi.create(payload);
      }

      await fetchBuildings();
      resetForm();
    } catch (error) {
      console.error("Failed to save building", error);
      alert("Save building failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      address: item.address || "",
      phone: item.phone || "",
      email: item.email || "",
      description: item.description || "",
      openTime: item.openTime?.slice(0, 5) || "06:00",
      closeTime: item.closeTime?.slice(0, 5) || "22:00",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this building?")) return;

    try {
      await buildingApi.delete(id);
      await fetchBuildings();
    } catch (error) {
      console.error("Failed to delete building", error);
      alert("Delete building failed");
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
              <label>Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter contact email"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter description"
              />
            </div>

            <div className="form-group">
              <label>Open Time</label>
              <input
                type="time"
                name="openTime"
                value={form.openTime}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Close Time</label>
              <input
                type="time"
                name="closeTime"
                value={form.closeTime}
                onChange={handleChange}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn">
                {editingId ? "Update" : "Create"}
              </button>

              {editingId && (
                <button type="button" className="secondary-btn" onClick={resetForm}>
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
                <th>Building Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Open</th>
                <th>Close</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {buildings.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.address}</td>
                  <td>{item.phone || "-"}</td>
                  <td>{item.email || "-"}</td>
                  <td>{item.openTime || "-"}</td>
                  <td>{item.closeTime || "-"}</td>
                  <td>
                    <button className="text-btn" onClick={() => handleEdit(item)}>
                      Edit
                    </button>

                    <button className="text-btn danger" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {buildings.length === 0 && (
                <tr>
                  <td colSpan="8">No buildings found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

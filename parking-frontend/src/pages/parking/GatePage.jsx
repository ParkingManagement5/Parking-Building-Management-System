import { useEffect, useState } from "react";
import { buildingApi } from "../../api/manager/buildingApi";
import { gateApi } from "../../api/manager/gateApi";

function normalizeGate(item) {
  return {
    id: item.id,
    buildingId: item.building?.id,
    buildingName: item.building?.name || "Unknown building",
    gateCode: item.gateCode,
    gateType: item.gateType,
    isActive: item.isActive !== false,
  };
}

export default function GatePage() {
  const [buildings, setBuildings] = useState([]);
  const [gates, setGates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    buildingId: "",
    gateCode: "",
    gateType: "ENTRY",
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
      await refreshGates(buildingList);
    } catch (error) {
      console.error("Failed to load gate dependencies", error);
      alert("Cannot load buildings");
    }
  }

  async function refreshGates(buildingList = buildings) {
    try {
      const responses = await Promise.all(
        buildingList.map((building) => gateApi.getByBuilding(building.id))
      );

      const merged = responses.flatMap((res) =>
        (res.data?.data || []).map(normalizeGate)
      );

      setGates(merged);
    } catch (error) {
      console.error("Failed to fetch gates", error);
      alert("Cannot load gates");
    }
  }

  const resetForm = () => {
    setEditingId(null);
    setForm({
      buildingId: "",
      gateCode: "",
      gateType: "ENTRY",
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

    if (!form.buildingId || !form.gateCode.trim()) {
      alert("Building and gate code are required");
      return;
    }

    const payload = {
      buildingId: Number(form.buildingId),
      gateCode: form.gateCode.trim(),
      gateType: form.gateType,
    };

    try {
      if (editingId) {
        await gateApi.update(editingId, payload);
      } else {
        await gateApi.create(payload);
      }

      await refreshGates();
      resetForm();
    } catch (error) {
      console.error("Failed to save gate", error);
      alert(error.response?.data?.message || "Save gate failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      buildingId: item.buildingId || "",
      gateCode: item.gateCode || "",
      gateType: item.gateType || "ENTRY",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this gate?")) return;

    try {
      await gateApi.delete(id);
      await refreshGates();
    } catch (error) {
      console.error("Failed to delete gate", error);
      alert(error.response?.data?.message || "Delete gate failed");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gate Management</h1>
          <p>Manage entry and exit gates of parking buildings</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Gate" : "Add Gate"}</h3>

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
              <label>Gate Code</label>
              <input
                name="gateCode"
                value={form.gateCode}
                onChange={handleChange}
                placeholder="Example: GATE-IN-01"
              />
            </div>

            <div className="form-group">
              <label>Gate Type</label>
              <select
                name="gateType"
                value={form.gateType}
                onChange={handleChange}
              >
                <option value="ENTRY">ENTRY</option>
                <option value="EXIT">EXIT</option>
                <option value="BOTH">BOTH</option>
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
                <th>STT</th>
                <th>Building</th>
                <th>Gate Code</th>
                <th>Gate Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {gates.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.buildingName}</td>
                  <td>{item.gateCode}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.gateType === "ENTRY"
                          ? "success"
                          : item.gateType === "EXIT"
                          ? "warning"
                          : "info"
                      }`}
                    >
                      {item.gateType}
                    </span>
                  </td>
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

              {gates.length === 0 && (
                <tr>
                  <td colSpan="6">No gates found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

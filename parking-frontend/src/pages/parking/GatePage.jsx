import { useEffect, useState } from "react";
import { gateApi } from "../../api/gateApi";

export default function GatePage() {
  const [gates, setGates] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    buildingId: "",
    gateCode: "",
    gateType: "ENTRY",
  });

  const buildings = [
    { buildingId: 1, name: "Main Parking Building" },
    { buildingId: 2, name: "Airport Parking Building" },
  ];

  const mockData = [
    {
      gateId: 1,
      buildingId: 1,
      buildingName: "Main Parking Building",
      gateCode: "GATE-IN-01",
      gateType: "ENTRY",
    },
    {
      gateId: 2,
      buildingId: 1,
      buildingName: "Main Parking Building",
      gateCode: "GATE-OUT-01",
      gateType: "EXIT",
    },
  ];

  useEffect(() => {
    fetchGates();
  }, []);

  const fetchGates = async () => {
    try {
      // Sau này mở khi Backend có API:
      // const res = await gateApi.getAll();
      // setGates(res.data.data);

      setGates(mockData);
    } catch (error) {
      console.error("Failed to fetch gates", error);
    }
  };

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

  const getBuildingName = (buildingId) => {
    const building = buildings.find(
      (item) => item.buildingId === Number(buildingId)
    );

    return building ? building.name : "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.buildingId || !form.gateCode.trim()) {
      alert("Building and gate code are required");
      return;
    }

    const payload = {
      buildingId: Number(form.buildingId),
      gateCode: form.gateCode,
      gateType: form.gateType,
    };

    try {
      if (editingId) {
        // await gateApi.update(editingId, payload);

        setGates(
          gates.map((item) =>
            item.gateId === editingId
              ? {
                  ...item,
                  ...payload,
                  buildingName: getBuildingName(payload.buildingId),
                }
              : item
          )
        );
      } else {
        // await gateApi.create(payload);

        setGates([
          ...gates,
          {
            gateId: Date.now(),
            ...payload,
            buildingName: getBuildingName(payload.buildingId),
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save gate", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.gateId);

    setForm({
      buildingId: item.buildingId,
      gateCode: item.gateCode,
      gateType: item.gateType,
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this gate?"
    );

    if (!confirmDelete) return;

    try {
      // await gateApi.delete(id);

      setGates(gates.filter((item) => item.gateId !== id));
    } catch (error) {
      console.error("Failed to delete gate", error);
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
                  <option key={item.buildingId} value={item.buildingId}>
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
                <th>ID</th>
                <th>Building</th>
                <th>Gate Code</th>
                <th>Gate Type</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {gates.map((item) => (
                <tr key={item.gateId}>
                  <td>{item.gateId}</td>
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
                    <button
                      className="text-btn"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>

                    <button
                      className="text-btn danger"
                      onClick={() => handleDelete(item.gateId)}
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
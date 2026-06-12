import { useState } from "react";

export default function SystemConfigPage() {
  const mockData = [
    {
      configId: 1,
      configKey: "MAX_BOOKING_DURATION",
      configValue: "4",
      description: "Maximum booking duration in hours",
    },
    {
      configId: 2,
      configKey: "QR_EXPIRE_MINUTES",
      configValue: "15",
      description: "QR code expiration time in minutes",
    },
  ];

  const [configs, setConfigs] = useState(mockData);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    configKey: "",
    configValue: "",
    description: "",
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      configKey: "",
      configValue: "",
      description: "",
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

    if (!form.configKey.trim()) {
      alert("Config key is required");
      return;
    }

    const payload = {
      configKey: form.configKey,
      configValue: form.configValue,
      description: form.description,
    };

    try {
      if (editingId) {
        setConfigs(
          configs.map((item) =>
            item.configId === editingId ? { ...item, ...payload } : item
          )
        );
      } else {
        setConfigs([
          ...configs,
          {
            configId: Date.now(),
            ...payload,
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save system config", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.configId);

    setForm({
      configKey: item.configKey,
      configValue: item.configValue,
      description: item.description,
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this config?"
    );

    if (!confirmDelete) return;

    try {
      setConfigs(configs.filter((item) => item.configId !== id));
    } catch (error) {
      console.error("Failed to delete system config", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System Configuration</h1>
          <p>Manage global configuration values of the system</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Config" : "Add Config"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Config Key</label>
              <input
                name="configKey"
                value={form.configKey}
                onChange={handleChange}
                placeholder="Example: QR_EXPIRE_MINUTES"
              />
            </div>

            <div className="form-group">
              <label>Config Value</label>
              <input
                name="configValue"
                value={form.configValue}
                onChange={handleChange}
                placeholder="Enter config value"
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
                <th>ID</th>
                <th>Config Key</th>
                <th>Config Value</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {configs.map((item) => (
                <tr key={item.configId}>
                  <td>{item.configId}</td>
                  <td>{item.configKey}</td>
                  <td>{item.configValue}</td>
                  <td>{item.description}</td>
                  <td>
                    <button className="text-btn" onClick={() => handleEdit(item)}>
                      Edit
                    </button>

                    <button
                      className="text-btn danger"
                      onClick={() => handleDelete(item.configId)}
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

import { useEffect, useState } from "react";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";

export default function ParkingSlotPage() {
  const [slots, setSlots] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    zoneId: "",
    slotCode: "",
    priority: "",
    distanceToGate: "",
    status: "Available",
  });

  const zones = [
    { zoneId: 1, zoneName: "Zone A" },
    { zoneId: 2, zoneName: "Zone B" },
  ];

  const mockData = [
    {
      slotId: 1,
      zoneId: 1,
      zoneName: "Zone A",
      slotCode: "A-001",
      priority: 1,
      distanceToGate: 10,
      status: "Available",
    },
    {
      slotId: 2,
      zoneId: 1,
      zoneName: "Zone A",
      slotCode: "A-002",
      priority: 2,
      distanceToGate: 15,
      status: "Occupied",
    },
  ];

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      // Sau này mở khi Backend có API:
      // const res = await parkingSlotApi.getAll();
      // setSlots(res.data.data);

      setSlots(mockData);
    } catch (error) {
      console.error("Failed to fetch parking slots", error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      zoneId: "",
      slotCode: "",
      priority: "",
      distanceToGate: "",
      status: "Available",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const getZoneName = (zoneId) => {
    const zone = zones.find((item) => item.zoneId === Number(zoneId));
    return zone ? zone.zoneName : "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.zoneId || !form.slotCode.trim()) {
      alert("Zone and slot code are required");
      return;
    }

    const payload = {
      zoneId: Number(form.zoneId),
      slotCode: form.slotCode,
      priority: Number(form.priority),
      distanceToGate: Number(form.distanceToGate),
      status: form.status,
    };

    try {
      if (editingId) {
        // await parkingSlotApi.update(editingId, payload);

        setSlots(
          slots.map((item) =>
            item.slotId === editingId
              ? {
                  ...item,
                  ...payload,
                  zoneName: getZoneName(payload.zoneId),
                }
              : item
          )
        );
      } else {
        // await parkingSlotApi.create(payload);

        setSlots([
          ...slots,
          {
            slotId: Date.now(),
            ...payload,
            zoneName: getZoneName(payload.zoneId),
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save parking slot", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.slotId);

    setForm({
      zoneId: item.zoneId,
      slotCode: item.slotCode,
      priority: item.priority,
      distanceToGate: item.distanceToGate,
      status: item.status,
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this parking slot?"
    );

    if (!confirmDelete) return;

    try {
      // await parkingSlotApi.delete(id);

      setSlots(slots.filter((item) => item.slotId !== id));
    } catch (error) {
      console.error("Failed to delete parking slot", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Parking Slot Management</h1>
          <p>Manage parking slots and slot status</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Parking Slot" : "Add Parking Slot"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Zone</label>
              <select
                name="zoneId"
                value={form.zoneId}
                onChange={handleChange}
              >
                <option value="">Select zone</option>
                {zones.map((item) => (
                  <option key={item.zoneId} value={item.zoneId}>
                    {item.zoneName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Slot Code</label>
              <input
                name="slotCode"
                value={form.slotCode}
                onChange={handleChange}
                placeholder="Example: A-001"
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <input
                type="number"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                placeholder="Example: 1"
              />
            </div>

            <div className="form-group">
              <label>Distance To Gate</label>
              <input
                type="number"
                name="distanceToGate"
                value={form.distanceToGate}
                onChange={handleChange}
                placeholder="Example: 10"
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
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
                <th>Zone</th>
                <th>Slot Code</th>
                <th>Priority</th>
                <th>Distance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {slots.map((item) => (
                <tr key={item.slotId}>
                  <td>{item.slotId}</td>
                  <td>{item.zoneName}</td>
                  <td>{item.slotCode}</td>
                  <td>{item.priority}</td>
                  <td>{item.distanceToGate}m</td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === "Available"
                          ? "success"
                          : item.status === "Occupied"
                          ? "warning"
                          : "info"
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
                      onClick={() => handleDelete(item.slotId)}
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
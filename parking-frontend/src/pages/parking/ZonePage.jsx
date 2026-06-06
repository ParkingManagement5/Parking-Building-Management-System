import { useEffect, useState } from "react";
import { zoneApi } from "../../api/zoneApi";

export default function ZonePage() {
  const [zones, setZones] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    floorId: "",
    vehicleTypeId: "",
    zoneName: "",
    status: "Active",
  });

  const floors = [
    { floorId: 1, floorName: "Ground Floor" },
    { floorId: 2, floorName: "Second Floor" },
  ];

  const vehicleTypes = [
    { vehicleTypeId: 1, name: "Car" },
    { vehicleTypeId: 2, name: "Motorbike" },
  ];

  const mockData = [
    {
      zoneId: 1,
      floorId: 1,
      floorName: "Ground Floor",
      vehicleTypeId: 1,
      vehicleTypeName: "Car",
      zoneName: "Zone A",
      status: "Active",
    },
    {
      zoneId: 2,
      floorId: 1,
      floorName: "Ground Floor",
      vehicleTypeId: 2,
      vehicleTypeName: "Motorbike",
      zoneName: "Zone B",
      status: "Active",
    },
  ];

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      // Sau này mở khi Backend có API:
      // const res = await zoneApi.getAll();
      // setZones(res.data.data);

      setZones(mockData);
    } catch (error) {
      console.error("Failed to fetch zones", error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      floorId: "",
      vehicleTypeId: "",
      zoneName: "",
      status: "Active",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const getFloorName = (floorId) => {
    const floor = floors.find((item) => item.floorId === Number(floorId));
    return floor ? floor.floorName : "";
  };

  const getVehicleTypeName = (vehicleTypeId) => {
    const vehicleType = vehicleTypes.find(
      (item) => item.vehicleTypeId === Number(vehicleTypeId)
    );

    return vehicleType ? vehicleType.name : "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.floorId || !form.vehicleTypeId || !form.zoneName.trim()) {
      alert("Floor, vehicle type and zone name are required");
      return;
    }

    const payload = {
      floorId: Number(form.floorId),
      vehicleTypeId: Number(form.vehicleTypeId),
      zoneName: form.zoneName,
      status: form.status,
    };

    try {
      if (editingId) {
        // await zoneApi.update(editingId, payload);

        setZones(
          zones.map((item) =>
            item.zoneId === editingId
              ? {
                  ...item,
                  ...payload,
                  floorName: getFloorName(payload.floorId),
                  vehicleTypeName: getVehicleTypeName(payload.vehicleTypeId),
                }
              : item
          )
        );
      } else {
        // await zoneApi.create(payload);

        setZones([
          ...zones,
          {
            zoneId: Date.now(),
            ...payload,
            floorName: getFloorName(payload.floorId),
            vehicleTypeName: getVehicleTypeName(payload.vehicleTypeId),
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save zone", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.zoneId);

    setForm({
      floorId: item.floorId,
      vehicleTypeId: item.vehicleTypeId,
      zoneName: item.zoneName,
      status: item.status,
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this zone?"
    );

    if (!confirmDelete) return;

    try {
      // await zoneApi.delete(id);

      setZones(zones.filter((item) => item.zoneId !== id));
    } catch (error) {
      console.error("Failed to delete zone", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Zone Management</h1>
          <p>Manage parking zones by floor and vehicle type</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Zone" : "Add Zone"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Floor</label>
              <select
                name="floorId"
                value={form.floorId}
                onChange={handleChange}
              >
                <option value="">Select floor</option>
                {floors.map((item) => (
                  <option key={item.floorId} value={item.floorId}>
                    {item.floorName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Vehicle Type</label>
              <select
                name="vehicleTypeId"
                value={form.vehicleTypeId}
                onChange={handleChange}
              >
                <option value="">Select vehicle type</option>
                {vehicleTypes.map((item) => (
                  <option key={item.vehicleTypeId} value={item.vehicleTypeId}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Zone Name</label>
              <input
                name="zoneName"
                value={form.zoneName}
                onChange={handleChange}
                placeholder="Example: Zone A"
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
                <th>Floor</th>
                <th>Vehicle Type</th>
                <th>Zone Name</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {zones.map((item) => (
                <tr key={item.zoneId}>
                  <td>{item.zoneId}</td>
                  <td>{item.floorName}</td>
                  <td>{item.vehicleTypeName}</td>
                  <td>{item.zoneName}</td>
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
                      onClick={() => handleDelete(item.zoneId)}
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
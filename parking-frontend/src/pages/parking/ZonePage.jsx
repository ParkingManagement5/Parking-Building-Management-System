import { useEffect, useState } from "react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { zoneApi } from "../../api/manager/zoneApi";

function normalizeZone(item) {
  return {
    id: item.id,
    floorId: item.floor?.id,
    floorName: item.floor?.name || "Unknown floor",
    buildingId: item.floor?.building?.id,
    buildingName: item.floor?.building?.name || "Unknown building",
    vehicleTypeId: item.vehicleType?.id,
    vehicleTypeName: item.vehicleType?.name || "Unknown vehicle type",
    zoneName: item.name,
    description: item.description || "",
    isActive: item.isActive !== false,
  };
}

export default function ZonePage() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [zones, setZones] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    buildingId: "",
    floorId: "",
    vehicleTypeId: "",
    zoneName: "",
    description: "",
  });

  useEffect(() => {
    // load once on page mount
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitialData() {
    try {
      const [buildingRes, vehicleTypeRes] = await Promise.all([
        buildingApi.getAll(),
        vehicleTypeApi.getAll(),
      ]);

      const buildingList = buildingRes.data?.data || [];
      const vehicleTypeList = vehicleTypeRes.data?.data || [];

      setBuildings(buildingList);
      setVehicleTypes(vehicleTypeList);

      const floorResponses = await Promise.all(
        buildingList.map((building) => floorApi.getByBuilding(building.id))
      );
      const floorList = floorResponses.flatMap((res) => res.data?.data || []);

      setFloors(floorList);
      await refreshZones(floorList);
    } catch (error) {
      console.error("Failed to load zone dependencies", error);
      alert("Cannot load zone data");
    }
  }

  async function refreshZones(sourceFloors = floors) {
    try {
      const responses = await Promise.all(
        sourceFloors.map((floor) => zoneApi.getByFloor(floor.id))
      );

      const merged = responses.flatMap((res) =>
        (res.data?.data || []).map(normalizeZone)
      );

      setZones(merged);
    } catch (error) {
      console.error("Failed to fetch zones", error);
      alert("Cannot load zones");
    }
  }

  const filteredFloors = form.buildingId
    ? floors.filter((item) => item.building?.id === Number(form.buildingId))
    : floors;

  const resetForm = () => {
    setEditingId(null);
    setForm({
      buildingId: "",
      floorId: "",
      vehicleTypeId: "",
      zoneName: "",
      description: "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "buildingId" ? { floorId: "" } : {}),
    }));
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
      name: form.zoneName.trim(),
      description: form.description || null,
    };

    try {
      if (editingId) {
        await zoneApi.update(editingId, payload);
      } else {
        await zoneApi.create(payload);
      }

      await refreshZones();
      resetForm();
    } catch (error) {
      console.error("Failed to save zone", error);
      alert(error.response?.data?.message || "Save zone failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      buildingId: item.buildingId || "",
      floorId: item.floorId || "",
      vehicleTypeId: item.vehicleTypeId || "",
      zoneName: item.zoneName || "",
      description: item.description || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this zone?")) return;

    try {
      await zoneApi.delete(id);
      await refreshZones();
    } catch (error) {
      console.error("Failed to delete zone", error);
      alert(error.response?.data?.message || "Delete zone failed");
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
              <label>Floor</label>
              <select
                name="floorId"
                value={form.floorId}
                onChange={handleChange}
              >
                <option value="">Select floor</option>
                {filteredFloors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.building?.name})
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
                  <option key={item.id} value={item.id}>
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
                <th>Floor</th>
                <th>Vehicle Type</th>
                <th>Zone Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {zones.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.buildingName}</td>
                  <td>{item.floorName}</td>
                  <td>{item.vehicleTypeName}</td>
                  <td>{item.zoneName}</td>
                  <td>{item.description || "-"}</td>
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

              {zones.length === 0 && (
                <tr>
                  <td colSpan="8">No zones found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";

function normalizeSlot(item) {
  return {
    id: item.id,
    zoneId: item.zone?.id,
    zoneName: item.zone?.name || "Unknown zone",
    floorId: item.zone?.floor?.id,
    floorName: item.zone?.floor?.name || "Unknown floor",
    buildingId: item.zone?.floor?.building?.id,
    buildingName: item.zone?.floor?.building?.name || "Unknown building",
    slotCode: item.slotCode,
    slotSize: item.slotSize,
    status: item.status,
  };
}

export default function ParkingSlotPage() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [zones, setZones] = useState([]);
  const [slots, setSlots] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    buildingId: "",
    floorId: "",
    zoneId: "",
    slotCode: "",
    status: "AVAILABLE",
  });

  useEffect(() => {
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitialData() {
    try {
      const buildingRes = await buildingApi.getAll();
      const buildingList = buildingRes.data?.data || [];
      setBuildings(buildingList);

      const floorResponses = await Promise.all(
        buildingList.map((building) => floorApi.getByBuilding(building.id))
      );
      const floorList = floorResponses.flatMap((res) => res.data?.data || []);
      setFloors(floorList);

      const zoneResponses = await Promise.all(
        floorList.map((floor) => zoneApi.getByFloor(floor.id))
      );
      const zoneList = zoneResponses.flatMap((res) => res.data?.data || []);
      setZones(zoneList);

      await refreshSlots(zoneList);
    } catch (error) {
      console.error("Failed to load parking slot data", error);
      alert("Cannot load parking slot data");
    }
  }

  async function refreshSlots(sourceZones = zones) {
    try {
      const responses = await Promise.all(
        sourceZones.map((zone) => parkingSlotApi.getByZone(zone.id))
      );

      const merged = responses.flatMap((res) =>
        (res.data?.data || []).map(normalizeSlot)
      );

      setSlots(merged);
    } catch (error) {
      console.error("Failed to fetch parking slots", error);
      alert("Cannot load parking slots");
    }
  }

  const filteredFloors = useMemo(() => {
    if (!form.buildingId) return [];
    return floors.filter((item) => item.building?.id === Number(form.buildingId));
  }, [floors, form.buildingId]);

  const filteredZones = useMemo(() => {
    if (!form.floorId) return [];
    return zones.filter((item) => item.floor?.id === Number(form.floorId));
  }, [zones, form.floorId]);

  const selectedZone = useMemo(
    () => zones.find((item) => item.id === Number(form.zoneId)),
    [zones, form.zoneId]
  );

  const derivedSlotSize = selectedZone?.vehicleType?.slotSize || "";

  const resetForm = () => {
    setEditingId(null);
    setForm({
      buildingId: "",
      floorId: "",
      zoneId: "",
      slotCode: "",
      status: "AVAILABLE",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "buildingId" ? { floorId: "", zoneId: "" } : {}),
      ...(name === "floorId" ? { zoneId: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.buildingId || !form.floorId || !form.zoneId || !form.slotCode.trim()) {
      alert("Building, floor, zone and slot code are required");
      return;
    }

    if (!derivedSlotSize) {
      alert("Cannot determine slot size from selected zone");
      return;
    }

    const payload = {
      zoneId: Number(form.zoneId),
      slotCode: form.slotCode.trim(),
      slotSize: derivedSlotSize,
      status: form.status,
    };

    try {
      if (editingId) {
        await parkingSlotApi.update(editingId, payload);
      } else {
        await parkingSlotApi.create(payload);
      }

      await refreshSlots();
      resetForm();
    } catch (error) {
      console.error("Failed to save parking slot", error);
      alert(error.response?.data?.message || "Save parking slot failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      buildingId: item.buildingId || "",
      floorId: item.floorId || "",
      zoneId: item.zoneId || "",
      slotCode: item.slotCode || "",
      status: item.status || "AVAILABLE",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this parking slot?")) return;

    try {
      await parkingSlotApi.delete(id);
      await refreshSlots();
    } catch (error) {
      console.error("Failed to delete parking slot", error);
      alert(error.response?.data?.message || "Delete parking slot failed");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Parking Slot Management</h1>
          <p>Manage parking slots by building, floor and zone</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Parking Slot" : "Add Parking Slot"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Building</label>
              <select name="buildingId" value={form.buildingId} onChange={handleChange}>
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
              <select name="floorId" value={form.floorId} onChange={handleChange}>
                <option value="">Select floor</option>
                {filteredFloors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Zone</label>
              <select name="zoneId" value={form.zoneId} onChange={handleChange}>
                <option value="">Select zone</option>
                {filteredZones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.vehicleType?.name || "Unknown type"})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Slot Size</label>
              <input value={derivedSlotSize} readOnly placeholder="Auto from selected zone" />
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
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="OCCUPIED">OCCUPIED</option>
                <option value="RESERVED">RESERVED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
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
                <th>Building</th>
                <th>Floor</th>
                <th>Zone</th>
                <th>Slot Code</th>
                <th>Slot Size</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {slots.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.buildingName}</td>
                  <td>{item.floorName}</td>
                  <td>{item.zoneName}</td>
                  <td>{item.slotCode}</td>
                  <td>{item.slotSize}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === "AVAILABLE"
                          ? "success"
                          : item.status === "OCCUPIED"
                          ? "warning"
                          : "info"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
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

              {slots.length === 0 && (
                <tr>
                  <td colSpan="8">No parking slots found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

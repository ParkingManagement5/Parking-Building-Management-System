import { useState } from "react";

export default function PricingPolicyPage() {
  const vehicleTypes = [
    { vehicleTypeId: 1, name: "Car" },
    { vehicleTypeId: 2, name: "Motorbike" },
  ];

  const mockData = [
    {
      policyId: 1,
      vehicleTypeId: 1,
      vehicleTypeName: "Car",
      timeType: "HOURLY",
      dayType: "WEEKDAY",
      startHour: 7,
      endHour: 22,
      pricePerHour: 20000,
      isActive: true,
    },
    {
      policyId: 2,
      vehicleTypeId: 2,
      vehicleTypeName: "Motorbike",
      timeType: "HOURLY",
      dayType: "WEEKDAY",
      startHour: 7,
      endHour: 22,
      pricePerHour: 5000,
      isActive: true,
    },
  ];

  const [policies, setPolicies] = useState(mockData);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    vehicleTypeId: "",
    timeType: "HOURLY",
    dayType: "WEEKDAY",
    startHour: "",
    endHour: "",
    pricePerHour: "",
    isActive: true,
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      vehicleTypeId: "",
      timeType: "HOURLY",
      dayType: "WEEKDAY",
      startHour: "",
      endHour: "",
      pricePerHour: "",
      isActive: true,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const getVehicleTypeName = (vehicleTypeId) => {
    const vehicleType = vehicleTypes.find(
      (item) => item.vehicleTypeId === Number(vehicleTypeId)
    );

    return vehicleType ? vehicleType.name : "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.vehicleTypeId || !form.pricePerHour) {
      alert("Vehicle type and price are required");
      return;
    }

    const payload = {
      vehicleTypeId: Number(form.vehicleTypeId),
      timeType: form.timeType,
      dayType: form.dayType,
      startHour: form.startHour ? Number(form.startHour) : null,
      endHour: form.endHour ? Number(form.endHour) : null,
      pricePerHour: Number(form.pricePerHour),
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        setPolicies(
          policies.map((item) =>
            item.policyId === editingId
              ? {
                  ...item,
                  ...payload,
                  vehicleTypeName: getVehicleTypeName(payload.vehicleTypeId),
                }
              : item
          )
        );
      } else {
        setPolicies([
          ...policies,
          {
            policyId: Date.now(),
            ...payload,
            vehicleTypeName: getVehicleTypeName(payload.vehicleTypeId),
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save pricing policy", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.policyId);

    setForm({
      vehicleTypeId: item.vehicleTypeId,
      timeType: item.timeType,
      dayType: item.dayType,
      startHour: item.startHour,
      endHour: item.endHour,
      pricePerHour: item.pricePerHour,
      isActive: item.isActive,
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this pricing policy?"
    );

    if (!confirmDelete) return;

    try {
      setPolicies(policies.filter((item) => item.policyId !== id));
    } catch (error) {
      console.error("Failed to delete pricing policy", error);
    }
  };

  const formatCurrency = (value) => {
    return Number(value).toLocaleString("vi-VN") + "d";
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Pricing Policy Management</h1>
          <p>Manage parking price policies by vehicle type and time</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Pricing Policy" : "Add Pricing Policy"}</h3>

          <form onSubmit={handleSubmit}>
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
              <label>Time Type</label>
              <select
                name="timeType"
                value={form.timeType}
                onChange={handleChange}
              >
                <option value="HOURLY">HOURLY</option>
                <option value="DAILY">DAILY</option>
                <option value="MONTHLY">MONTHLY</option>
              </select>
            </div>

            <div className="form-group">
              <label>Day Type</label>
              <select
                name="dayType"
                value={form.dayType}
                onChange={handleChange}
              >
                <option value="WEEKDAY">WEEKDAY</option>
                <option value="WEEKEND">WEEKEND</option>
                <option value="HOLIDAY">HOLIDAY</option>
              </select>
            </div>

            <div className="form-group">
              <label>Start Hour</label>
              <input
                type="number"
                name="startHour"
                value={form.startHour}
                onChange={handleChange}
                placeholder="Example: 7"
              />
            </div>

            <div className="form-group">
              <label>End Hour</label>
              <input
                type="number"
                name="endHour"
                value={form.endHour}
                onChange={handleChange}
                placeholder="Example: 22"
              />
            </div>

            <div className="form-group">
              <label>Price Per Hour</label>
              <input
                type="number"
                name="pricePerHour"
                value={form.pricePerHour}
                onChange={handleChange}
                placeholder="Example: 20000"
              />
            </div>

            <div className="form-checkbox">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
              />
              <label>Active policy</label>
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
                <th>Vehicle Type</th>
                <th>Time Type</th>
                <th>Day Type</th>
                <th>Hour Range</th>
                <th>Price / Hour</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {policies.map((item) => (
                <tr key={item.policyId}>
                  <td>{item.policyId}</td>
                  <td>{item.vehicleTypeName}</td>
                  <td>{item.timeType}</td>
                  <td>{item.dayType}</td>
                  <td>
                    {item.startHour} - {item.endHour}
                  </td>
                  <td>{formatCurrency(item.pricePerHour)}</td>
                  <td>
                    <span
                      className={`badge ${item.isActive ? "success" : "warning"}`}
                    >
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
                      onClick={() => handleDelete(item.policyId)}
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

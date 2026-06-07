import { useState } from "react";
import { vehicleEntryApi } from "../../api/staff/vehicleEntryApi";

export default function VehicleEntryPage() {
  const [form, setForm] = useState({
    licensePlate: "",
    vehicleType: "Car",
    gateCode: "GATE-IN-01",
    qrCode: "",
  });

  const [entries, setEntries] = useState([
    {
      id: 1,
      licensePlate: "51A-12345",
      vehicleType: "Car",
      gateCode: "GATE-IN-01",
      entryTime: "2026-06-06 08:30",
      status: "Checked In",
    },
  ]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.licensePlate.trim()) {
      alert("License plate is required");
      return;
    }

    const payload = {
      licensePlate: form.licensePlate,
      vehicleType: form.vehicleType,
      gateCode: form.gateCode,
      qrCode: form.qrCode,
    };

    try {
      // Sau này mở khi Backend có API:
      // await vehicleEntryApi.createEntry(payload);

      setEntries([
        ...entries,
        {
          id: Date.now(),
          ...payload,
          entryTime: new Date().toLocaleString(),
          status: "Checked In",
        },
      ]);

      setForm({
        licensePlate: "",
        vehicleType: "Car",
        gateCode: "GATE-IN-01",
        qrCode: "",
      });
    } catch (error) {
      console.error("Failed to check in vehicle", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vehicle Entry</h1>
          <p>Check in vehicles entering the parking building</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>Check In Vehicle</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>License Plate</label>
              <input
                name="licensePlate"
                value={form.licensePlate}
                onChange={handleChange}
                placeholder="Example: 51A-12345"
              />
            </div>

            <div className="form-group">
              <label>Vehicle Type</label>
              <select
                name="vehicleType"
                value={form.vehicleType}
                onChange={handleChange}
              >
                <option value="Car">Car</option>
                <option value="Motorbike">Motorbike</option>
              </select>
            </div>

            <div className="form-group">
              <label>Gate</label>
              <select
                name="gateCode"
                value={form.gateCode}
                onChange={handleChange}
              >
                <option value="GATE-IN-01">GATE-IN-01</option>
                <option value="GATE-IN-02">GATE-IN-02</option>
              </select>
            </div>

            <div className="form-group">
              <label>QR Code / Booking Code</label>
              <input
                name="qrCode"
                value={form.qrCode}
                onChange={handleChange}
                placeholder="Optional booking QR code"
              />
            </div>

            <button type="submit" className="primary-btn">
              Check In
            </button>
          </form>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>License Plate</th>
                <th>Vehicle Type</th>
                <th>Gate</th>
                <th>Entry Time</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {entries.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.licensePlate}</td>
                  <td>{item.vehicleType}</td>
                  <td>{item.gateCode}</td>
                  <td>{item.entryTime}</td>
                  <td>
                    <span className="badge success">{item.status}</span>
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
import { useState } from "react";

export default function FeeCalculationPage() {
  const [form, setForm] = useState({
    licensePlate: "",
    vehicleType: "Car",
    durationHours: "",
  });

  const [fee, setFee] = useState(null);

  const priceMap = {
    Car: 20000,
    Motorbike: 5000,
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleCalculate = (e) => {
    e.preventDefault();

    if (!form.licensePlate || !form.durationHours) {
      alert("License plate and duration are required");
      return;
    }

    const pricePerHour = priceMap[form.vehicleType];
    const totalAmount = Number(form.durationHours) * pricePerHour;

    setFee({
      licensePlate: form.licensePlate,
      vehicleType: form.vehicleType,
      durationHours: form.durationHours,
      pricePerHour,
      totalAmount,
    });
  };

  const formatCurrency = (value) => {
    return Number(value).toLocaleString("vi-VN") + "đ";
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Fee Calculation</h1>
          <p>Calculate parking fee based on session duration</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>Calculate Fee</h3>

          <form onSubmit={handleCalculate}>
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
              <label>Duration Hours</label>
              <input
                type="number"
                name="durationHours"
                value={form.durationHours}
                onChange={handleChange}
                placeholder="Example: 3"
              />
            </div>

            <button type="submit" className="primary-btn">
              Calculate
            </button>
          </form>
        </div>

        {fee && (
          <div className="table-card">
            <table>
              <tbody>
                <tr>
                  <th>License Plate</th>
                  <td>{fee.licensePlate}</td>
                </tr>
                <tr>
                  <th>Vehicle Type</th>
                  <td>{fee.vehicleType}</td>
                </tr>
                <tr>
                  <th>Duration</th>
                  <td>{fee.durationHours} hours</td>
                </tr>
                <tr>
                  <th>Price / Hour</th>
                  <td>{formatCurrency(fee.pricePerHour)}</td>
                </tr>
                <tr>
                  <th>Total Amount</th>
                  <td>
                    <strong>{formatCurrency(fee.totalAmount)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
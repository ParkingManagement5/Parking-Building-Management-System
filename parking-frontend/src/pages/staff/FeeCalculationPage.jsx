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
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <table className="w-full">
              <tbody className="divide-y divide-border">
                <tr>
                  <th className="w-1/2 bg-muted/30 px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    License Plate
                  </th>
                  <td className="px-5 py-4 text-sm text-foreground">{fee.licensePlate}</td>
                </tr>
                <tr>
                  <th className="w-1/2 bg-muted/30 px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Vehicle Type
                  </th>
                  <td className="px-5 py-4 text-sm text-foreground">{fee.vehicleType}</td>
                </tr>
                <tr>
                  <th className="w-1/2 bg-muted/30 px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Duration
                  </th>
                  <td className="px-5 py-4 text-sm text-foreground">{fee.durationHours} hours</td>
                </tr>
                <tr>
                  <th className="w-1/2 bg-muted/30 px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Price / Hour
                  </th>
                  <td className="px-5 py-4 text-sm text-foreground">
                    {formatCurrency(fee.pricePerHour)}
                  </td>
                </tr>
                <tr>
                  <th className="w-1/2 bg-muted/30 px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Total Amount
                  </th>
                  <td className="px-5 py-4 text-sm font-semibold text-foreground">
                    {formatCurrency(fee.totalAmount)}
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

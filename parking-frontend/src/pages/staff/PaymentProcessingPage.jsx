import { useState } from "react";

export default function PaymentProcessingPage() {
  const [payments, setPayments] = useState([
    {
      paymentId: 1,
      licensePlate: "51A-12345",
      amount: 60000,
      method: "Cash",
      status: "Paid",
      paidAt: "2026-06-06 11:30",
    },
  ]);

  const [form, setForm] = useState({
    licensePlate: "",
    amount: "",
    method: "Cash",
  });

  const formatCurrency = (value) => {
    return Number(value).toLocaleString("vi-VN") + "đ";
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handlePayment = (e) => {
    e.preventDefault();

    if (!form.licensePlate || !form.amount) {
      alert("License plate and amount are required");
      return;
    }

    setPayments([
      ...payments,
      {
        paymentId: Date.now(),
        licensePlate: form.licensePlate,
        amount: Number(form.amount),
        method: form.method,
        status: "Paid",
        paidAt: new Date().toLocaleString(),
      },
    ]);

    setForm({
      licensePlate: "",
      amount: "",
      method: "Cash",
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Payment Processing</h1>
          <p>Process parking payment for vehicle exit</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>Process Payment</h3>

          <form onSubmit={handlePayment}>
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
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="Example: 60000"
              />
            </div>

            <div className="form-group">
              <label>Payment Method</label>
              <select name="method" value={form.method} onChange={handleChange}>
                <option value="Cash">Cash</option>
                <option value="VNPay">VNPay</option>
                <option value="Momo">Momo</option>
                <option value="Banking">Banking</option>
              </select>
            </div>

            <button type="submit" className="primary-btn">
              Confirm Payment
            </button>
          </form>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>License Plate</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Paid At</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((item) => (
                <tr key={item.paymentId}>
                  <td>{item.paymentId}</td>
                  <td>{item.licensePlate}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>{item.method}</td>
                  <td>
                    <span className="badge success">{item.status}</span>
                  </td>
                  <td>{item.paidAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
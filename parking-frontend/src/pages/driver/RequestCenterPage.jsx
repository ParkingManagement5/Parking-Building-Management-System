import { useState } from "react";

export default function RequestCenterPage() {
  const [requests, setRequests] = useState([
    {
      requestId: 1,
      type: "Booking Support",
      content: "I want to change my parking slot.",
      status: "Pending",
      createdAt: "2026-06-06 09:00",
    },
  ]);

  const [form, setForm] = useState({
    type: "Booking Support",
    content: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.content.trim()) {
      alert("Request content is required");
      return;
    }

    setRequests([
      ...requests,
      {
        requestId: Date.now(),
        ...form,
        status: "Pending",
        createdAt: new Date().toLocaleString(),
      },
    ]);

    setForm({ type: "Booking Support", content: "" });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Request Center</h1>
          <p>Send support requests to parking staff</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>Create Request</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Request Type</label>
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="Booking Support">Booking Support</option>
                <option value="Payment Issue">Payment Issue</option>
                <option value="Vehicle Issue">Vehicle Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Content</label>
              <input
                name="content"
                value={form.content}
                onChange={handleChange}
                placeholder="Describe your issue"
              />
            </div>

            <button className="primary-btn" type="submit">
              Send Request
            </button>
          </form>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Content</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((item) => (
                <tr key={item.requestId}>
                  <td>{item.requestId}</td>
                  <td>{item.type}</td>
                  <td>{item.content}</td>
                  <td><span className="badge warning">{item.status}</span></td>
                  <td>{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
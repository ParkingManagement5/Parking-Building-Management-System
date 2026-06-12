import { useState } from "react";

export default function RequestProcessingPage() {
  const [requests, setRequests] = useState([
    {
      requestId: 1,
      customerName: "Nguyen Van A",
      type: "Booking Support",
      content: "I want to change my parking slot.",
      status: "Pending",
      createdAt: "2026-06-06 09:00",
    },
    {
      requestId: 2,
      customerName: "Tran Thi B",
      type: "Payment Issue",
      content: "Payment was deducted but not confirmed.",
      status: "Resolved",
      createdAt: "2026-06-06 10:15",
    },
  ]);

  const handleResolve = (id) => {
    setRequests(
      requests.map((item) =>
        item.requestId === id ? { ...item, status: "Resolved" } : item
      )
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Request Processing</h1>
          <p>Handle support requests from parking users</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Content</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((item) => (
              <tr key={item.requestId}>
                <td>{item.requestId}</td>
                <td>{item.customerName}</td>
                <td>{item.type}</td>
                <td>{item.content}</td>
                <td>
                  <span
                    className={`badge ${
                      item.status === "Resolved" ? "success" : "warning"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td>{item.createdAt}</td>
                <td>
                  {item.status !== "Resolved" && (
                    <button
                      className="text-btn"
                      onClick={() => handleResolve(item.requestId)}
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
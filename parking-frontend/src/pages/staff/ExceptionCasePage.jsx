import { useState } from "react";

export default function ExceptionCasePage() {
  const [cases, setCases] = useState([
    {
      caseId: 1,
      title: "License plate mismatch",
      licensePlate: "51A-12345",
      description: "OCR result does not match booking plate.",
      status: "Open",
      createdAt: "2026-06-06 11:00",
    },
    {
      caseId: 2,
      title: "Gate QR verification failed",
      licensePlate: "59B1-88888",
      description: "QR code expired before entry.",
      status: "Handled",
      createdAt: "2026-06-06 11:20",
    },
  ]);

  const handleCase = (id) => {
    setCases(
      cases.map((item) =>
        item.caseId === id ? { ...item, status: "Handled" } : item
      )
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Exception Case Handling</h1>
          <p>Handle abnormal parking cases and verification issues</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>License Plate</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {cases.map((item) => (
              <tr key={item.caseId}>
                <td>{item.caseId}</td>
                <td>{item.title}</td>
                <td>{item.licensePlate}</td>
                <td>{item.description}</td>
                <td>
                  <span
                    className={`badge ${
                      item.status === "Handled" ? "success" : "warning"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td>{item.createdAt}</td>
                <td>
                  {item.status !== "Handled" && (
                    <button
                      className="text-btn"
                      onClick={() => handleCase(item.caseId)}
                    >
                      Handle
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
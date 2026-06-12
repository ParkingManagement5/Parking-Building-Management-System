import { useState } from "react";

export default function OcrCorrectionPage() {
  const [records, setRecords] = useState([
    {
      id: 1,
      detectedPlate: "51A-1234S",
      correctedPlate: "",
      confidence: "82%",
      status: "Pending",
    },
    {
      id: 2,
      detectedPlate: "59B1-88888",
      correctedPlate: "59B1-88888",
      confidence: "97%",
      status: "Confirmed",
    },
  ]);

  const handleCorrect = (id, value) => {
    setRecords(
      records.map((item) =>
        item.id === id ? { ...item, correctedPlate: value } : item
      )
    );
  };

  const handleConfirm = (id) => {
    setRecords(
      records.map((item) =>
        item.id === id ? { ...item, status: "Confirmed" } : item
      )
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>OCR Correction</h1>
          <p>Correct and confirm OCR license plate results</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Detected Plate</th>
              <th>Corrected Plate</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {records.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.detectedPlate}</td>
                <td>
                  <input
                    className="table-input"
                    value={item.correctedPlate}
                    onChange={(e) => handleCorrect(item.id, e.target.value)}
                    placeholder="Enter correct plate"
                  />
                </td>
                <td>{item.confidence}</td>
                <td>
                  <span
                    className={`badge ${
                      item.status === "Confirmed" ? "success" : "warning"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td>
                  <button
                    className="text-btn"
                    onClick={() => handleConfirm(item.id)}
                  >
                    Confirm
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
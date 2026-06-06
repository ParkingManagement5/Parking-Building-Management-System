import { useState } from "react";

export default function OcrScanPage() {
  const [plateImage, setPlateImage] = useState(null);
  const [result, setResult] = useState(null);

  const handleScan = (e) => {
    e.preventDefault();

    setResult({
      licensePlate: "51A-12345",
      confidence: "96%",
      vehicleType: "Car",
      gateCode: "GATE-IN-01",
      scanTime: new Date().toLocaleString(),
      status: "Detected",
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>OCR Scan</h1>
          <p>Scan vehicle license plate using OCR</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>Upload Plate Image</h3>

          <form onSubmit={handleScan}>
            <div className="form-group">
              <label>Plate Image</label>
              <input
                type="file"
                onChange={(e) => setPlateImage(e.target.files[0])}
              />
            </div>

            <button className="primary-btn" type="submit">
              Scan OCR
            </button>
          </form>
        </div>

        {result && (
          <div className="table-card">
            <table>
              <tbody>
                <tr>
                  <th>License Plate</th>
                  <td>{result.licensePlate}</td>
                </tr>
                <tr>
                  <th>Confidence</th>
                  <td>{result.confidence}</td>
                </tr>
                <tr>
                  <th>Vehicle Type</th>
                  <td>{result.vehicleType}</td>
                </tr>
                <tr>
                  <th>Gate</th>
                  <td>{result.gateCode}</td>
                </tr>
                <tr>
                  <th>Scan Time</th>
                  <td>{result.scanTime}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>
                    <span className="badge success">{result.status}</span>
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
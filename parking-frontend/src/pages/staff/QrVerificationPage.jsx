import { useState } from "react";

export default function QrVerificationPage() {
  const [qrCode, setQrCode] = useState("");
  const [result, setResult] = useState(null);

  const handleVerify = (e) => {
    e.preventDefault();

    if (!qrCode.trim()) {
      alert("QR code is required");
      return;
    }

    setResult({
      bookingCode: qrCode,
      driverName: "Nguyen Van A",
      licensePlate: "51A-12345",
      vehicleType: "Car",
      slotCode: "A-001",
      status: "Valid",
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>QR Verification</h1>
          <p>Verify booking QR code before vehicle entry</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>Verify QR Code</h3>

          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>QR / Booking Code</label>
              <input
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Enter or scan QR code"
              />
            </div>

            <button className="primary-btn" type="submit">
              Verify
            </button>
          </form>
        </div>

        {result && (
          <div className="table-card">
            <table>
              <tbody>
                <tr>
                  <th>Booking Code</th>
                  <td>{result.bookingCode}</td>
                </tr>
                <tr>
                  <th>Driver</th>
                  <td>{result.driverName}</td>
                </tr>
                <tr>
                  <th>License Plate</th>
                  <td>{result.licensePlate}</td>
                </tr>
                <tr>
                  <th>Vehicle Type</th>
                  <td>{result.vehicleType}</td>
                </tr>
                <tr>
                  <th>Slot</th>
                  <td>{result.slotCode}</td>
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
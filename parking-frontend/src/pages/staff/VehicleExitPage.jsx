import { useState } from "react";

export default function VehicleExitPage() {
  const [licensePlate, setLicensePlate] = useState("");
  const [session, setSession] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();

    if (!licensePlate.trim()) {
      alert("License plate is required");
      return;
    }

    setSession({
      sessionId: 1,
      licensePlate,
      slotCode: "A-001",
      entryTime: "2026-06-06 08:30",
      exitTime: new Date().toLocaleString(),
      duration: "3 hours",
      status: "Ready for checkout",
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vehicle Exit</h1>
          <p>Search active parking session before vehicle exits</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>Search Vehicle</h3>

          <form onSubmit={handleSearch}>
            <div className="form-group">
              <label>License Plate</label>
              <input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="Example: 51A-12345"
              />
            </div>

            <button className="primary-btn" type="submit">
              Search Session
            </button>
          </form>
        </div>

        {session && (
          <div className="table-card">
            <table>
              <tbody>
                <tr>
                  <th>Session ID</th>
                  <td>{session.sessionId}</td>
                </tr>
                <tr>
                  <th>License Plate</th>
                  <td>{session.licensePlate}</td>
                </tr>
                <tr>
                  <th>Slot</th>
                  <td>{session.slotCode}</td>
                </tr>
                <tr>
                  <th>Entry Time</th>
                  <td>{session.entryTime}</td>
                </tr>
                <tr>
                  <th>Exit Time</th>
                  <td>{session.exitTime}</td>
                </tr>
                <tr>
                  <th>Duration</th>
                  <td>{session.duration}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>
                    <span className="badge warning">{session.status}</span>
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
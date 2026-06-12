export default function CurrentSessionPage() {
  const session = {
    sessionId: 1,
    licensePlate: "51A-12345",
    building: "Main Parking Building",
    slotCode: "A-001",
    entryTime: "2026-06-06 08:30",
    status: "Parking",
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Current Parking Session</h1>
          <p>View your active parking session</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <tbody>
            <tr><th>Session ID</th><td>{session.sessionId}</td></tr>
            <tr><th>License Plate</th><td>{session.licensePlate}</td></tr>
            <tr><th>Building</th><td>{session.building}</td></tr>
            <tr><th>Slot</th><td>{session.slotCode}</td></tr>
            <tr><th>Entry Time</th><td>{session.entryTime}</td></tr>
            <tr>
              <th>Status</th>
              <td><span className="badge success">{session.status}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
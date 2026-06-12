import { useState } from "react";

export default function ParkingSessionPage() {
  const [sessions] = useState([
    {
      sessionId: 1,
      licensePlate: "51A-12345",
      slotCode: "A-01",
      entryTime: "2025-08-10 08:00",
      status: "PARKING",
    },
    {
      sessionId: 2,
      licensePlate: "59B-88888",
      slotCode: "B-05",
      entryTime: "2025-08-10 09:30",
      status: "PARKING",
    },
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Parking Session Management</h1>
          <p>Monitor active parking sessions</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>License Plate</th>
              <th>Slot</th>
              <th>Entry Time</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {sessions.map((item) => (
              <tr key={item.sessionId}>
                <td>{item.sessionId}</td>
                <td>{item.licensePlate}</td>
                <td>{item.slotCode}</td>
                <td>{item.entryTime}</td>
                <td>
                  <span className="badge success">{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

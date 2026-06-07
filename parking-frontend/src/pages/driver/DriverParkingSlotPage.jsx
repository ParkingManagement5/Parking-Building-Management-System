export default function DriverParkingSlotPage() {
  const slots = [
    {
      slotId: 1,
      building: "Main Parking Building",
      floor: "Ground Floor",
      zone: "Zone A",
      slotCode: "A-001",
      vehicleType: "Car",
      status: "Available",
    },
    {
      slotId: 2,
      building: "Main Parking Building",
      floor: "Ground Floor",
      zone: "Zone A",
      slotCode: "A-002",
      vehicleType: "Car",
      status: "Occupied",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Parking Slots</h1>
          <p>View available parking slots</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Building</th>
              <th>Floor</th>
              <th>Zone</th>
              <th>Slot Code</th>
              <th>Vehicle Type</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {slots.map((item) => (
              <tr key={item.slotId}>
                <td>{item.building}</td>
                <td>{item.floor}</td>
                <td>{item.zone}</td>
                <td>{item.slotCode}</td>
                <td>{item.vehicleType}</td>
                <td>
                  <span
                    className={`badge ${
                      item.status === "Available" ? "success" : "warning"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
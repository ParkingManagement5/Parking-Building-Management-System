export default function PublicSlotListPage() {
  const slots = [
    {
      id: 1,
      building: "Main Parking Building",
      floor: "Ground Floor",
      zone: "Zone A",
      slotCode: "A-001",
      vehicleType: "Car",
      status: "Available",
    },
    {
      id: 2,
      building: "Main Parking Building",
      floor: "Ground Floor",
      zone: "Zone B",
      slotCode: "B-001",
      vehicleType: "Motorbike",
      status: "Available",
    },
    {
      id: 3,
      building: "Airport Parking Building",
      floor: "Floor 1",
      zone: "Zone C",
      slotCode: "C-001",
      vehicleType: "Car",
      status: "Occupied",
    },
  ];

  return (
    <div className="public-section">
      <div className="page-header">
        <div>
          <h1>Public Parking Slots</h1>
          <p>Check parking slot availability before login</p>
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
              <tr key={item.id}>
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
export default function VehicleTypePage() {
  const vehicleTypes = [
    {
      vehicleTypeId: 1,
      name: "Car",
      status: "Active",
    },
    {
      vehicleTypeId: 2,
      name: "Motorbike",
      status: "Active",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vehicle Type Management</h1>
          <p>Manage vehicle categories used in parking system</p>
        </div>

        <button className="primary-btn">+ Add Vehicle Type</button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehicle Type</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {vehicleTypes.map((item) => (
              <tr key={item.vehicleTypeId}>
                <td>{item.vehicleTypeId}</td>
                <td>{item.name}</td>
                <td>
                  <span className="badge success">{item.status}</span>
                </td>
                <td>
                  <button className="text-btn">Edit</button>
                  <button className="text-btn danger">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
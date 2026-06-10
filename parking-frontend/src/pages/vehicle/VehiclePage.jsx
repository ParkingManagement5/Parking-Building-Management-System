export default function VehiclePage() {
  const vehicles = [
    {
      id: 1,
      owner: "Customer User",
      type: "Car",
      licensePlate: "51A-12345",
      status: "Active",
    },
    {
      id: 2,
      owner: "Customer User",
      type: "Motorbike",
      licensePlate: "59B1-88888",
      status: "Active",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vehicle Management</h1>
          <p>Manage customer vehicles</p>
        </div>
        <button className="primary-btn">+ Add Vehicle</button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Owner</th>
              <th>Vehicle Type</th>
              <th>License Plate</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {vehicles.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.owner}</td>
                <td>{item.type}</td>
                <td>{item.licensePlate}</td>
                <td>
                  <span className="badge success">{item.status}</span>
                </td>
                <td>
                  <button className="text-btn">View</button>
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
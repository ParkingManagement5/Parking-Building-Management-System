export default function ParkingInfoPage() {
  const buildings = [
    {
      id: 1,
      name: "Main Parking Building",
      address: "District 1, Ho Chi Minh City",
      floors: 5,
      hours: "24/7",
    },
    {
      id: 2,
      name: "Airport Parking Building",
      address: "Tan Son Nhat Airport",
      floors: 3,
      hours: "24/7",
    },
  ];

  return (
    <div className="public-section">
      <div className="page-header">
        <div>
          <h1>Parking Information</h1>
          <p>View parking building information and operating hours</p>
        </div>
      </div>

      <div className="service-grid">
        {buildings.map((item) => (
          <div className="service-card" key={item.id}>
            <h3>{item.name}</h3>
            <p>{item.address}</p>
            <p>
              <strong>Floors:</strong> {item.floors}
            </p>
            <p>
              <strong>Operating Hours:</strong> {item.hours}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
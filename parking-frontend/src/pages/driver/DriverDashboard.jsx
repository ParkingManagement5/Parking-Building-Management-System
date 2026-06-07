export default function DriverDashboard() {
  const stats = [
    {
      title: "My Vehicles",
      value: "2",
      description: "Registered vehicles",
    },
    {
      title: "Active Booking",
      value: "1",
      description: "Current reserved slot",
    },
    {
      title: "Parking Sessions",
      value: "5",
      description: "Total parking sessions",
    },
    {
      title: "Unread Notifications",
      value: "3",
      description: "New notifications",
    },
  ];

  return (
    <div>
      <div className="page-title">
        <h1>Driver Dashboard</h1>
        <p>Overview of your vehicles, bookings and parking sessions</p>
      </div>

      <div className="stats-grid">
        {stats.map((item) => (
          <div className="stat-card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.value}</p>
            <span>{item.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
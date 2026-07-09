export default function DashboardPage() {
  const stats = [
    {
      title: "Total Slots",
      value: "120",
      description: "Total parking slots",
    },
    {
      title: "Available Slots",
      value: "85",
      description: "Ready for booking",
    },
    {
      title: "Occupied Slots",
      value: "35",
      description: "Currently in use",
    },
    {
      title: "Today Revenue",
      value: "2,500,000đ",
      description: "Total payment today",
    },
  ];

  const activities = [
    "Vehicle 51A-12345 checked in at Gate A",
    "Booking #BK1023 was created",
    "Vehicle 59B-88888 checked out",
    "Payment #PM2041 completed",
  ];

  return (
    <div className="dashboard-page">
      <div className="page-title">
        <h1>Dashboard</h1>
        <p>Parking Building Management System overview</p>
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

      <div className="dashboard-section">
        <div className="panel">
          <h3>Parking Status</h3>

          <div className="status-list">
            <div>
              <span>Available</span>
              <strong>70%</strong>
            </div>
            <div className="progress">
              <div style={{ width: "70%" }}></div>
            </div>

            <div>
              <span>Occupied</span>
              <strong>30%</strong>
            </div>
            <div className="progress">
              <div style={{ width: "30%" }}></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Recent Activities</h3>

          <ul className="activity-list">
            {activities.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
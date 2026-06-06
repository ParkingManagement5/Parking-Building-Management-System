export default function StaffDashboard() {
  const stats = [
    { title: "Check-in Today", value: "42", description: "Vehicles entered today" },
    { title: "Check-out Today", value: "35", description: "Vehicles exited today" },
    { title: "Active Sessions", value: "78", description: "Currently parking" },
    { title: "Pending Exceptions", value: "3", description: "Need handling" },
  ];

  return (
    <div>
      <div className="page-title">
        <h1>Parking Staff Dashboard</h1>
        <p>Overview of vehicle entry, exit and parking sessions</p>
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
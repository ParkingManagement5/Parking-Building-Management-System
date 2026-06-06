export default function AdminDashboard() {
  const stats = [
    { title: "Total Users", value: "35", description: "All system users" },
    { title: "Active Users", value: "30", description: "Currently active accounts" },
    { title: "Roles", value: "4", description: "Driver, Staff, Manager, Admin" },
    { title: "Activity Logs Today", value: "128", description: "System actions recorded" },
  ];

  return (
    <div>
      <div className="page-title">
        <h1>System Administrator Dashboard</h1>
        <p>Overview of users, roles and system activities</p>
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
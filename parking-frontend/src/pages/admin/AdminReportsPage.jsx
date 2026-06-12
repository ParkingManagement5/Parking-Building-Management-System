export default function AdminReportsPage() {
  const reports = [
    {
      id: 1,
      title: "User Account Report",
      description: "View total users by role and account status.",
      type: "User",
    },
    {
      id: 2,
      title: "System Activity Report",
      description: "View system activities and audit log statistics.",
      type: "Audit",
    },
    {
      id: 3,
      title: "Role Permission Report",
      description: "View role distribution and permission usage.",
      type: "Role",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System Reports</h1>
          <p>View administrator reports and system overview</p>
        </div>
      </div>

      <div className="report-grid">
        {reports.map((item) => (
          <div className="report-card" key={item.id}>
            <span className="badge info">{item.type}</span>

            <h3>{item.title}</h3>
            <p>{item.description}</p>

            <button className="primary-btn">View Report</button>
          </div>
        ))}
      </div>
    </div>
  );
}
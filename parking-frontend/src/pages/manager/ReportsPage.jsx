export default function ReportsPage() {
  const reports = [
    {
      id: 1,
      title: "Occupancy Report",
      description: "View parking slot usage and availability statistics.",
      type: "Operational",
      path: "/reports/occupancy",
    },
    {
      id: 2,
      title: "Revenue Report",
      description: "View revenue by day, month, vehicle type and payment method.",
      type: "Financial",
      path: "/reports/revenue",
    },
    {
      id: 3,
      title: "Parking Session Report",
      description: "View vehicle entry, exit, active sessions and session history.",
      type: "Session",
      path: "/reports/sessions",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>View operational reports and system statistics</p>
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
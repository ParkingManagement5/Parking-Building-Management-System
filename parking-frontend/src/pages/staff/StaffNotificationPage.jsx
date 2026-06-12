export default function StaffNotificationPage() {
  const notifications = [
    {
      id: 1,
      title: "New vehicle entry request",
      body: "A vehicle is waiting at Gate IN-01.",
      type: "Entry",
      status: "Unread",
    },
    {
      id: 2,
      title: "Exception case assigned",
      body: "License plate mismatch needs your review.",
      type: "Exception",
      status: "Read",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notification Center</h1>
          <p>View staff notifications and alerts</p>
        </div>
      </div>

      <div className="notification-list">
        {notifications.map((item) => (
          <div className="notification-card" key={item.id}>
            <div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>

            <div className="notification-actions">
              <span className="badge info">{item.type}</span>
              <span
                className={`badge ${
                  item.status === "Unread" ? "warning" : "success"
                }`}
              >
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
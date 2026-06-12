export default function DriverNotificationPage() {
  const notifications = [
    {
      id: 1,
      title: "Booking confirmed",
      body: "Your booking BK1002 has been confirmed.",
      status: "Unread",
    },
    {
      id: 2,
      title: "Payment successful",
      body: "Your payment for session #1 was successful.",
      status: "Read",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>View your parking notifications</p>
        </div>
      </div>

      <div className="notification-list">
        {notifications.map((item) => (
          <div className="notification-card" key={item.id}>
            <div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>

            <span
              className={`badge ${
                item.status === "Unread" ? "warning" : "success"
              }`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
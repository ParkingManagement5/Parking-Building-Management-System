import { useEffect, useState } from "react";
import { notificationApi } from "../../api/notificationApi";

export default function ManagerNotificationPage() {
  const [notifications, setNotifications] = useState([]);

  const mockData = [
    {
      notificationId: 1,
      title: "Low available slots",
      body: "Zone A has less than 10 available parking slots.",
      type: "Warning",
      isRead: false,
      createdAt: "2026-06-06 08:30",
    },
    {
      notificationId: 2,
      title: "Staff shift reminder",
      body: "Evening shift starts at 15:00 today.",
      type: "Reminder",
      isRead: true,
      createdAt: "2026-06-06 09:00",
    },
  ];

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      // Sau này mở khi Backend có API:
      // const res = await notificationApi.getAll();
      // setNotifications(res.data.data);

      setNotifications(mockData);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      // await notificationApi.markAsRead(id);

      setNotifications(
        notifications.map((item) =>
          item.notificationId === id ? { ...item, isRead: true } : item
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (!confirmDelete) return;

    try {
      // await notificationApi.delete(id);

      setNotifications(
        notifications.filter((item) => item.notificationId !== id)
      );
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Notification Center</h1>
          <p>View and manage parking manager notifications</p>
        </div>
      </div>

      <div className="notification-list">
        {notifications.map((item) => (
          <div className="notification-card" key={item.notificationId}>
            <div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <small>{item.createdAt}</small>
            </div>

            <div className="notification-actions">
              <span className="badge info">{item.type}</span>

              <span className={`badge ${item.isRead ? "success" : "warning"}`}>
                {item.isRead ? "Read" : "Unread"}
              </span>

              {!item.isRead && (
                <button
                  className="text-btn"
                  onClick={() => handleMarkAsRead(item.notificationId)}
                >
                  Mark as read
                </button>
              )}

              <button
                className="text-btn danger"
                onClick={() => handleDelete(item.notificationId)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
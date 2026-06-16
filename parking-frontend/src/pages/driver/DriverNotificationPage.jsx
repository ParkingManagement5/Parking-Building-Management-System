import { useEffect, useState } from "react";
import { AlertCircle, Bell, CheckCircle2 } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { getUserId } from "../../utils/auth";
import { formatRelativeTime } from "./driverPortalUtils";

export default function DriverNotificationPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      const userId = getUserId();
      if (!userId) {
        if (!cancelled) {
          setNotifications([]);
        }
        return;
      }

      try {
        const res = await notificationApi.getByUser(userId);
        if (!cancelled) {
          setNotifications(Array.isArray(res.data) ? res.data : res.data?.data || []);
        }
      } catch (error) {
        console.error("Failed to load notifications", error);
        if (!cancelled) {
          setNotifications([]);
        }
      }
    }

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      const userId = getUserId();
      if (!userId) {
        setNotifications([]);
        return;
      }
      const res = await notificationApi.getByUser(userId);
      setNotifications(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAll = async () => {
    const userId = getUserId();
    if (!userId) {
      return;
    }

    try {
      await notificationApi.markAllAsRead(userId);
      const res = await notificationApi.getByUser(userId);
      setNotifications(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const iconFor = (item) => {
    const type = String(item.type || item.level || "").toLowerCase();
    if (type.includes("success")) {
      return {
        wrap: "bg-emerald-100 dark:bg-emerald-500/15",
        icon: <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-300" />,
      };
    }
    if (type.includes("warning")) {
      return {
        wrap: "bg-amber-100 dark:bg-amber-500/15",
        icon: <AlertCircle size={14} className="text-amber-600 dark:text-amber-300" />,
      };
    }
    if (type.includes("info")) {
      return {
        wrap: "bg-blue-100 dark:bg-blue-500/15",
        icon: <Bell size={14} className="text-blue-600 dark:text-blue-300" />,
      };
    }
    return {
      wrap: item.isRead ? "bg-muted" : "bg-blue-100 dark:bg-blue-500/15",
      icon: <Bell size={14} className={item.isRead ? "text-muted-foreground" : "text-blue-600 dark:text-blue-300"} />,
    };
  };

  return (
    <div className="max-w-2xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Notifications</h2>
        <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
          Mark all as read
        </button>
      </div>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {notifications.map((item) => (
          <div
            key={item.notificationId}
            onClick={() => !item.isRead && handleMarkAsRead(item.notificationId)}
            className={`flex items-start gap-3.5 p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
              !item.isRead ? "bg-primary/[0.02]" : ""
            }`}
          >
            <div
              className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                iconFor(item).wrap
              }`}
            >
              {iconFor(item).icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${!item.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                  {item.title || "Notification"}
                </p>
                {!item.isRead && <span className="size-1.5 bg-primary rounded-full shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {item.body || item.message || item.content || "No details available."}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(item.createdAt || item.sentAt)}
            </span>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="p-5 text-sm text-muted-foreground">
            There are no notifications for the current user.
          </div>
        )}
      </div>
    </div>
  );
}

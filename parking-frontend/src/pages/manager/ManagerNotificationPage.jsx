import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, MailWarning, ShieldAlert } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { getUserId } from "../../utils/auth";
import {
  ManagerEmptyState,
  ManagerPageHeader,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerStatCard,
  ManagerStatsRow,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

export default function ManagerNotificationPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function loadNotifications() {
    const userId = getUserId();
    if (!userId) return;

    try {
      const res = await notificationApi.getByUser(userId);
      setNotifications(unwrapApiData(res.data, []));
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      await loadNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const userId = getUserId();
    if (!userId) return;
    try {
      await notificationApi.markAllAsRead(userId);
      await loadNotifications();
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const stats = useMemo(
    () => ({
      unread: notifications.filter((item) => !item.isRead).length,
      read: notifications.filter((item) => item.isRead).length,
      alert: notifications.filter((item) => String(item.type || "").toUpperCase().includes("ALERT")).length,
    }),
    [notifications]
  );

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Notification Center"
        description="Monitor manager-facing system alerts and operational messages in one inbox."
        action={<ManagerPrimaryButton type="button" onClick={handleMarkAllAsRead}>Mark All As Read</ManagerPrimaryButton>}
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={Bell} label="Total Notifications" value={notifications.length} hint="Messages returned for current manager" tone="violet" />
        <ManagerStatCard icon={MailWarning} label="Unread" value={stats.unread} hint="Needs your attention" tone="amber" />
        <ManagerStatCard icon={CheckCheck} label="Read" value={stats.read} hint="Already reviewed" tone="emerald" />
        <ManagerStatCard icon={ShieldAlert} label="Alerts" value={stats.alert} hint="Alert-type notifications only" tone="rose" />
      </ManagerStatsRow>
      <ManagerPanel title="Manager Inbox" subtitle={`${notifications.length} notifications loaded`}>
        {notifications.length === 0 ? (
          <ManagerEmptyState title="No notifications" description="There are no notifications for the current manager account yet." />
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.notificationId} className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <ManagerStatusBadge tone={item.isRead ? "emerald" : "amber"}>
                        {item.isRead ? "Read" : "Unread"}
                      </ManagerStatusBadge>
                      <ManagerStatusBadge tone="blue">{item.type || "INFO"}</ManagerStatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body || item.message || "No content"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.createdAt || "No timestamp"}</p>
                  </div>
                  {!item.isRead ? (
                    <ManagerPrimaryButton type="button" onClick={() => handleMarkAsRead(item.notificationId)}>
                      Mark as read
                    </ManagerPrimaryButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </ManagerPanel>
    </div>
  );
}

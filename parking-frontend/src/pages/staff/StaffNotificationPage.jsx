import { useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { getUserId } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
import { formatStaffDateTime } from "./staffPortalState";
import {
  StaffEmptyState,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffStatusBadge,
} from "./StaffUi";

function toneFromType(type, isRead) {
  if (!isRead) return "blue";
  if (String(type || "").toUpperCase().includes("WARN")) return "amber";
  return "slate";
}

export default function StaffNotificationPage() {
  const userId = getUserId();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  async function loadNotifications() {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const res = await notificationApi.getByUser(userId);
    setNotifications(unwrapApiData(res.data, []));
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchNotifications() {
      if (!userId) {
        if (!cancelled) {
          setNotifications([]);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await notificationApi.getByUser(userId);
        if (!cancelled) {
          setNotifications(unwrapApiData(res.data, []));
        }
      } catch (error) {
        console.error("Failed to load notifications", error);
        if (!cancelled) {
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const paged = useMemo(() => notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [notifications, page]);
  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      await loadNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;
    try {
      await notificationApi.markAllAsRead(userId);
      await loadNotifications();
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Total Notifications</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{notifications.length}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Unread</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{unreadCount}</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Actions</p>
          <div className="mt-3 flex gap-3">
            <StaffPrimaryButton onClick={handleMarkAllAsRead} disabled={unreadCount === 0} className="flex-1">
              Mark All Read
            </StaffPrimaryButton>
            <StaffSecondaryButton onClick={() => void loadNotifications()} className="flex-1">
              Refresh
            </StaffSecondaryButton>
          </div>
        </div>
      </div>

      <StaffPageSection title="Notification Feed" subtitle="Live operational updates from the backend">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <StaffEmptyState
            title="No notifications"
            description="There are currently no alerts for this staff account."
            tone="success"
          />
        ) : (
          <div className="space-y-3">
            {paged.map((item) => (
              <div
                key={item.notificationId}
                className={`rounded-2xl border px-4 py-4 transition-colors ${
                  item.isRead ? "border-border bg-background" : "border-primary/20 bg-primary/5"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex size-10 items-center justify-center rounded-2xl bg-background shadow-sm dark:bg-white/5">
                    <BellRing size={16} className={item.isRead ? "text-slate-500 dark:text-slate-300" : "text-primary"} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <StaffStatusBadge tone={toneFromType(item.type, item.isRead)}>
                        {item.isRead ? "read" : "unread"}
                      </StaffStatusBadge>
                      {item.type ? (
                        <StaffStatusBadge tone="violet">{String(item.type).toLowerCase()}</StaffStatusBadge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {formatStaffDateTime(item.createdAt)}
                    </p>
                  </div>
                  {!item.isRead ? (
                    <StaffSecondaryButton onClick={() => handleMarkAsRead(item.notificationId)}>
                      Mark Read
                    </StaffSecondaryButton>
                  ) : null}
                </div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, PAGE_SIZE - paged.length) }, (_, index) => (
              <div key={`filler-${index}`} aria-hidden="true" className="invisible rounded-2xl border px-4 py-4">
                &nbsp;
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              ← Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`size-8 rounded-lg text-xs font-bold transition ${p === page ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              Sau →
            </button>
          </div>
        )}
      </StaffPageSection>
    </div>
  );
}

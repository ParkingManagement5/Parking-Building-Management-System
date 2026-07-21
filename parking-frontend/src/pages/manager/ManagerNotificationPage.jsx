import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { getUserId } from "../../utils/auth";
import {
  ManagerEmptyState,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

const NOTIFICATION_TYPE_LABELS = {
  info: "Thông tin",
  success: "Thành công",
  warning: "Cảnh báo",
  error: "Lỗi",
};

function notificationTypeLabel(type) {
  const key = String(type || "info").toLowerCase();
  return NOTIFICATION_TYPE_LABELS[key] || type || "Thông tin";
}

export default function ManagerNotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const PAGE_SIZE = 8;

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

  const filteredNotifications = useMemo(() => {
    if (!from && !to) return notifications;
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return notifications.filter((item) => {
      const ts = item.createdAt ? new Date(item.createdAt).getTime() : null;
      if (ts == null || Number.isNaN(ts)) return false;
      if (fromMs != null && ts < fromMs) return false;
      if (toMs != null && ts > toMs) return false;
      return true;
    });
  }, [notifications, from, to]);

  const paged = useMemo(
    () => filteredNotifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredNotifications, page]
  );
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Trung tâm thông báo</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Theo dõi cảnh báo hệ thống và thông báo vận hành dành cho quản lý tại một nơi.</p>
        </div>
        <ManagerPrimaryButton type="button" onClick={handleMarkAllAsRead}>Đánh dấu tất cả đã đọc</ManagerPrimaryButton>
      </div>

      <ManagerPanel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Hộp thư quản lý</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{filteredNotifications.length} / {notifications.length} thông báo</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <span className="text-xs text-muted-foreground">đến</span>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
            />
            {(from || to) && (
              <button
                onClick={() => { setFrom(""); setTo(""); setPage(1); }}
                className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} /> Xóa lọc
              </button>
            )}
          </div>
        </div>
        {filteredNotifications.length === 0 ? (
          <ManagerEmptyState
            title="Không có thông báo"
            description={notifications.length === 0
              ? "Tài khoản quản lý hiện chưa có thông báo nào."
              : "Không có thông báo nào trong khoảng thời gian đã lọc."}
          />
        ) : (
          <div className="space-y-3">
            {paged.map((item) => (
              <div key={item.notificationId} className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <ManagerStatusBadge tone={item.isRead ? "emerald" : "amber"}>
                        {item.isRead ? "Đã đọc" : "Chưa đọc"}
                      </ManagerStatusBadge>
                      <ManagerStatusBadge tone="blue">{notificationTypeLabel(item.type)}</ManagerStatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body || item.message || "Không có nội dung"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.createdAt || "Không rõ thời gian"}</p>
                  </div>
                  {!item.isRead ? (
                    <ManagerPrimaryButton type="button" onClick={() => handleMarkAsRead(item.notificationId)}>
                      Đánh dấu đã đọc
                    </ManagerPrimaryButton>
                  ) : null}
                </div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, PAGE_SIZE - paged.length) }, (_, index) => (
              <div key={`filler-${index}`} aria-hidden="true" className="invisible rounded-2xl border border-border bg-muted/20 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">&nbsp;</h3>
                  </div>
                  <p className="mt-2 text-sm">&nbsp;</p>
                  <p className="mt-2 text-xs">&nbsp;</p>
                </div>
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
      </ManagerPanel>
    </div>
  );
}

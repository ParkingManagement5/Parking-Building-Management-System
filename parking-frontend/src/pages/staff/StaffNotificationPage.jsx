import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BellRing, X } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { requestApi } from "../../api/driver/requestApi";
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

const REQUEST_STATUS_LABELS = {
  OPEN: "Đang mở",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
};

function requestStatusLabel(status) {
  return REQUEST_STATUS_LABELS[String(status || "").toUpperCase()] || status;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function StaffNotificationPage() {
  const userId = getUserId();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "requests" ? "requests" : "notifications";

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterDate, setFilterDate] = useState(todayDateString());
  const PAGE_SIZE = 8;

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [requestError, setRequestError] = useState("");

  function setActiveTab(tab) {
    setSearchParams(tab === "requests" ? { tab: "requests" } : {});
  }

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

  useEffect(() => {
    void loadRequests();
  }, []);

  async function loadRequests() {
    setRequestsLoading(true);
    setRequestError("");
    try {
      const [openRes, progressRes] = await Promise.all([
        requestApi.getByStatus("OPEN"),
        requestApi.getByStatus("IN_PROGRESS"),
      ]);
      setRequests([
        ...unwrapApiData(openRes.data, []),
        ...unwrapApiData(progressRes.data, []),
      ]);
    } catch (err) {
      console.error("Failed to load requests", err);
      setRequestError(err.response?.data?.message || "Không tải được danh sách yêu cầu.");
    } finally {
      setRequestsLoading(false);
    }
  }

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (!filterDate) return notifications;
    return notifications.filter((item) => String(item.createdAt || "").slice(0, 10) === filterDate);
  }, [notifications, filterDate]);

  const paged = useMemo(
    () => filteredNotifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredNotifications, page]
  );
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));

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

  const assignToMe = async (request) => {
    const staffId = Number(localStorage.getItem("userId"));
    if (!staffId) {
      setRequestError("Không tìm thấy staff userId trong localStorage.");
      return;
    }
    setSavingId(request.requestId);
    setRequestError("");
    try {
      await requestApi.assign(request.requestId, staffId);
      await loadRequests();
    } catch (err) {
      console.error("Assign request failed", err);
      setRequestError(err.response?.data?.message || "Không assign được request.");
    } finally {
      setSavingId(null);
    }
  };

  const resolveRequest = async (request) => {
    setSavingId(request.requestId);
    setRequestError("");
    try {
      await requestApi.resolve(request.requestId);
      await loadRequests();
    } catch (err) {
      console.error("Resolve request failed", err);
      setRequestError(err.response?.data?.message || "Không resolve được request.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <StaffPageSection
        title="Thông báo & Yêu cầu"
        subtitle={`${unreadCount} thông báo chưa đọc · ${requests.length} yêu cầu cần xử lý`}
        action={
          <StaffSecondaryButton onClick={() => { void loadNotifications(); void loadRequests(); }}>
            Làm mới
          </StaffSecondaryButton>
        }
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-xl border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "notifications" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Thông báo{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("requests")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "requests" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yêu cầu hỗ trợ{requests.length > 0 ? ` (${requests.length})` : ""}
            </button>
          </div>

          {activeTab === "notifications" ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(event) => { setFilterDate(event.target.value); setPage(1); }}
                className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
              />
              {filterDate ? (
                <button
                  type="button"
                  onClick={() => { setFilterDate(""); setPage(1); }}
                  className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={12} /> Xem tất cả ngày
                </button>
              ) : null}
              <StaffPrimaryButton onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
                Đánh dấu đã đọc tất cả
              </StaffPrimaryButton>
            </div>
          ) : null}
        </div>

        {activeTab === "notifications" ? (
          <>
            {loading ? (
              <p className="text-sm text-muted-foreground">Đang tải thông báo...</p>
            ) : filteredNotifications.length === 0 ? (
              <StaffEmptyState
                title={notifications.length === 0 ? "Không có thông báo" : "Không có thông báo cho ngày này"}
                description={
                  notifications.length === 0
                    ? "Hiện chưa có cảnh báo nào cho tài khoản nhân viên này."
                    : "Chọn ngày khác hoặc bấm \"Xem tất cả ngày\" để xem toàn bộ."
                }
                tone="success"
              />
            ) : (
              <div className="space-y-2">
                {paged.map((item) => (
                  <div
                    key={item.notificationId}
                    className={`rounded-2xl border px-4 py-3 transition-colors ${
                      item.isRead ? "border-border bg-background" : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 items-center justify-center rounded-xl bg-background shadow-sm dark:bg-white/5">
                        <BellRing size={14} className={item.isRead ? "text-slate-500 dark:text-slate-300" : "text-primary"} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                          <StaffStatusBadge tone={toneFromType(item.type, item.isRead)}>
                            {item.isRead ? "Đã đọc" : "Chưa đọc"}
                          </StaffStatusBadge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.body}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatStaffDateTime(item.createdAt)}</span>
                      {!item.isRead ? (
                        <StaffSecondaryButton onClick={() => handleMarkAsRead(item.notificationId)}>
                          Đánh dấu đã đọc
                        </StaffSecondaryButton>
                      ) : null}
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
          </>
        ) : (
          <>
            {requestError ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {requestError}
              </div>
            ) : null}

            {requests.length === 0 ? (
              <StaffEmptyState
                title={requestsLoading ? "Đang tải yêu cầu" : "Không có yêu cầu nào đang mở"}
                description="Yêu cầu hỗ trợ từ tài xế sẽ hiện ở đây khi được tạo."
                tone="success"
              />
            ) : (
              <div className="space-y-2">
                {requests.map((item) => (
                  <div key={item.requestId} className="rounded-2xl border border-border p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{item.subject || item.requestType}</p>
                          <StaffStatusBadge tone={item.status === "IN_PROGRESS" ? "blue" : "amber"}>
                            {requestStatusLabel(item.status)}
                          </StaffStatusBadge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Request #{item.requestId} - {item.username || `User #${item.userId}`} - {formatStaffDateTime(item.createdAt)}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.description}</p>
                        {item.assignedStaffName ? (
                          <p className="mt-1 text-xs text-muted-foreground">Đã giao cho {item.assignedStaffName}</p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {item.status === "OPEN" ? (
                          <StaffSecondaryButton
                            type="button"
                            onClick={() => assignToMe(item)}
                            disabled={savingId === item.requestId}
                          >
                            Nhận xử lý
                          </StaffSecondaryButton>
                        ) : null}
                        <StaffPrimaryButton
                          type="button"
                          onClick={() => resolveRequest(item)}
                          disabled={savingId === item.requestId}
                        >
                          {savingId === item.requestId ? "Đang lưu..." : "Xử lý xong"}
                        </StaffPrimaryButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </StaffPageSection>
    </div>
  );
}

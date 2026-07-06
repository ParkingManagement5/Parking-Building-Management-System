import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { activityLogApi } from "../../api/admin/activityLogApi";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerPageHeader,
  ManagerPanel,
  ManagerRow,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

const ACTION_TYPE_LABELS = {
  LOGIN: "Đăng nhập",
  USER_ROLE_CHANGE: "Đổi vai trò",
  USER_STATUS_CHANGE: "Đổi trạng thái",
  SYSTEM_CONFIG_CHANGE: "Cấu hình hệ thống",
};

const ACTION_TYPE_TONES = {
  LOGIN: "blue",
  USER_ROLE_CHANGE: "violet",
  USER_STATUS_CHANGE: "amber",
  SYSTEM_CONFIG_CHANGE: "emerald",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      try {
        const res = await activityLogApi.getAll();
        if (cancelled) return;
        setError("");
        setLogs(unwrapApiData(res.data, []));
      } catch (err) {
        console.error("Failed to load activity logs", err);
        if (!cancelled) {
          setError("Không tải được nhật ký hoạt động.");
          setLogs([]);
        }
      }
    }

    void loadLogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const actionTypes = useMemo(() => {
    const set = new Set(logs.map((item) => item.actionType).filter(Boolean));
    return ["ALL", ...set];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59`).getTime() : null;

    return logs.filter((item) => {
      if (actionType !== "ALL" && item.actionType !== actionType) return false;
      if (query) {
        const haystack = `${item.username || ""} ${item.action || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (fromMs != null || toMs != null) {
        const ts = item.createdAt ? new Date(item.createdAt).getTime() : null;
        if (ts == null || Number.isNaN(ts)) return false;
        if (fromMs != null && ts < fromMs) return false;
        if (toMs != null && ts > toMs) return false;
      }
      return true;
    });
  }, [logs, search, actionType, from, to]);

  const paged = useMemo(
    () => filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredLogs, page]
  );
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Nhật ký hoạt động"
        description="Theo dõi đăng nhập, đổi vai trò, khóa/mở tài khoản và thay đổi cấu hình hệ thống."
        action={
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {filteredLogs.length} / {logs.length} bản ghi
          </span>
        }
      />

      <ManagerPanel>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex max-w-sm items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2.5">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo người dùng hoặc nội dung..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={actionType}
              onChange={(e) => { setActionType(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
            >
              {actionTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "ALL" ? "Tất cả hành động" : ACTION_TYPE_LABELS[type] || type}
                </option>
              ))}
            </select>
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
          </div>
        </div>

        {error ? (
          <ManagerEmptyState title="Không tải được nhật ký" description={error} />
        ) : filteredLogs.length === 0 ? (
          <ManagerEmptyState
            title="Chưa có nhật ký nào"
            description={logs.length === 0 ? "Hệ thống chưa ghi nhận hoạt động nào." : "Không có bản ghi nào khớp với bộ lọc hiện tại."}
          />
        ) : (
          <ManagerDataTable columns={["Thời gian", "Người dùng", "Hành động", "Nội dung", "Địa chỉ IP"]} minRows={PAGE_SIZE}>
            {paged.map((item) => (
              <ManagerRow key={item.logId}>
                <ManagerCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "Không rõ thời gian"}
                </ManagerCell>
                <ManagerCell className="font-medium">{item.username || "Hệ thống"}</ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={ACTION_TYPE_TONES[item.actionType] || "slate"}>
                    {ACTION_TYPE_LABELS[item.actionType] || item.actionType || "Khác"}
                  </ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>{item.action}</ManagerCell>
                <ManagerCell className="font-mono text-xs text-muted-foreground">{item.ipAddress || "-"}</ManagerCell>
              </ManagerRow>
            ))}
          </ManagerDataTable>
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

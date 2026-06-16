import { useEffect, useState } from "react";
import { activityLogApi } from "../../api/admin/activityLogApi";

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchLogs() {
      try {
        const res = await activityLogApi.getAll();
        if (!cancelled) {
          setError("");
          setLogs(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load activity logs", err);
        if (!cancelled) {
          setError("Activity log API is not available yet.");
          setLogs([]);
        }
      }
    }

    void fetchLogs();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">View system audit logs and user activities</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {error ? (
          <div className="border-b border-border px-5 py-4 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-muted/40">
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">ID</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">User</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Action Type</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Action</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">IP Address</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Created At</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {logs.map((item) => (
                <tr key={item.logId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{item.logId}</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{item.user}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      {item.actionType}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{item.action}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{item.ipAddress}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{item.createdAt}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No activity logs available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

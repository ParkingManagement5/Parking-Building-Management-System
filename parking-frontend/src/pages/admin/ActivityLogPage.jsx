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
    <div>
      <div className="page-header">
        <div>
          <h1>Activity Logs</h1>
          <p>View system audit logs and user activities</p>
        </div>
      </div>

      <div className="table-card">
        {error && <p>{error}</p>}

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Action Type</th>
              <th>Action</th>
              <th>IP Address</th>
              <th>Created At</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((item) => (
              <tr key={item.logId}>
                <td>{item.logId}</td>
                <td>{item.user}</td>
                <td>
                  <span className="badge info">{item.actionType}</span>
                </td>
                <td>{item.action}</td>
                <td>{item.ipAddress}</td>
                <td>{item.createdAt}</td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td colSpan="6">No activity logs available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

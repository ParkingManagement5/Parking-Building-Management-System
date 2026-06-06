import { useEffect, useState } from "react";
import { activityLogApi } from "../../api/activityLogApi";

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);

  const mockData = [
    {
      logId: 1,
      user: "admin01",
      actionType: "CREATE",
      action: "Created new system config QR_EXPIRE_MINUTES",
      ipAddress: "127.0.0.1",
      createdAt: "2026-06-06 09:10",
    },
    {
      logId: 2,
      user: "manager01",
      actionType: "UPDATE",
      action: "Updated parking slot A-001 status",
      ipAddress: "127.0.0.1",
      createdAt: "2026-06-06 10:25",
    },
  ];

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      // const res = await activityLogApi.getAll();
      // setLogs(res.data.data);

      setLogs(mockData);
    } catch (error) {
      console.error("Failed to fetch activity logs", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Activity Logs</h1>
          <p>View system audit logs and user activities</p>
        </div>
      </div>

      <div className="table-card">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
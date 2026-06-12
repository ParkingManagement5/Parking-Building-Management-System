import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    { title: "Total Users", value: "0", description: "All system users" },
    { title: "Active Users", value: "0", description: "Currently active accounts" },
    { title: "Roles", value: "0", description: "System roles" },
    { title: "Activity Logs Today", value: "0", description: "System actions recorded" },
  ]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, rolesRes, logsRes] = await Promise.all([
          axiosClient.get("/admin/users"),
          axiosClient.get("/admin/roles"),
          axiosClient.get("/admin/activity-logs/today"),
        ]);

        const users = usersRes.data?.data || usersRes.data || [];
        const roles = rolesRes.data?.data || rolesRes.data || [];
        const logs = logsRes.data?.data || logsRes.data || [];

        setStats([
          {
            title: "Total Users",
            value: users.length,
            description: "All system users",
          },
          {
            title: "Active Users",
            value: users.filter((u) => u.status === "ACTIVE").length,
            description: "Currently active accounts",
          },
          {
            title: "Roles",
            value: roles.length,
            description: "System roles",
          },
          {
            title: "Activity Logs Today",
            value: logs.length,
            description: "System actions recorded",
          },
        ]);
      } catch (error) {
        console.error("Load dashboard stats failed:", error);
      }
    };

    loadStats();
  }, []);

  return (
    <div>
      <div className="page-title">
        <h1>System Administrator Dashboard</h1>
        <p>Overview of users, roles and system activities</p>
      </div>

      <div className="stats-grid">
        {stats.map((item) => (
          <div className="stat-card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.value}</p>
            <span>{item.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { roleApi } from "../../api/admin/roleApi";
import { userApi } from "../../api/admin/userApi";
import {
  ManagerEmptyState,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

const ROLE_DESCRIPTIONS = {
  ADMIN: "Full system administration, monitoring, and configuration access.",
  MANAGER: "Manage buildings, pricing, slots, and staff assignment workflows.",
  STAFF: "Handle parking operations, entry/exit, and operational tasks.",
  DRIVER: "Book slots, manage vehicles, and track parking activity.",
};

const ROLE_PERMISSIONS = {
  ADMIN: ["manage_users", "view_logs", "system_config", "manage_roles"],
  MANAGER: ["manage_buildings", "manage_pricing", "manage_staff", "view_reports"],
  STAFF: ["process_entry", "process_exit", "verify_qr", "ocr_scan"],
  DRIVER: ["book_slot", "manage_vehicles", "view_sessions", "submit_requests"],
};

function roleTone(name) {
  if (name === "ADMIN") return "border-border bg-card text-foreground";
  if (name === "MANAGER") return "border-border bg-card text-foreground";
  if (name === "STAFF") return "border-border bg-card text-foreground";
  return "border-border bg-card text-foreground";
}

function roleAccent(name) {
  if (name === "ADMIN") return "#ef4444";
  if (name === "MANAGER") return "#8b5cf6";
  if (name === "STAFF") return "#10b981";
  return "#3b82f6";
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRoleData() {
      try {
        const [roleRes, userRes] = await Promise.all([roleApi.getAll(), userApi.getAll()]);
        const roleList = unwrapApiData(roleRes.data, []);
        const userList = unwrapApiData(userRes.data, []);

        if (!cancelled) {
          setError("");
          setRoles(roleList);
          setUsers(userList);
        }
      } catch (err) {
        console.error("Failed to load roles", err);
        if (!cancelled) {
          setError("Unable to load roles from backend.");
          setRoles([]);
          setUsers([]);
        }
      }
    }

    void loadRoleData();

    return () => {
      cancelled = true;
    };
  }, []);

  const roleCards = useMemo(
    () =>
      roles.map((item) => ({
        ...item,
        title: item.roleName,
        description:
          ROLE_DESCRIPTIONS[item.roleName] || "System role available in the current backend.",
        permissions: ROLE_PERMISSIONS[item.roleName] || ["system_role"],
      })),
    [roles]
  );

  const roleCounts = useMemo(() => {
    const counts = new Map();
    roles.forEach((role) => counts.set(role.roleName, 0));
    users.forEach((user) => {
      const roleName = String(user.role || "").replace(/^ROLE_/, "");
      counts.set(roleName, (counts.get(roleName) || 0) + 1);
    });
    return counts;
  }, [roles, users]);
  return (
    <div className="space-y-4">
      {error ? (
        <ManagerEmptyState title="Cannot load roles" description={error} />
      ) : roleCards.length === 0 ? (
        <ManagerEmptyState title="No roles available" description="The backend did not return any role definitions." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {roleCards.map((item) => (
              <div key={item.roleId} className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="size-3 rounded-full" style={{ background: roleAccent(item.roleName) }} />
                      <h3 className="text-lg font-bold text-foreground">{item.roleName}</h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Role ID: {item.roleId}</p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${roleAccent(item.roleName)}20`, color: roleAccent(item.roleName) }}>
                    {roleCounts.get(item.roleName) || 0} users
                  </span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">{item.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.permissions.map((permission) => (
                    <span key={permission} className="rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-mono text-muted-foreground">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

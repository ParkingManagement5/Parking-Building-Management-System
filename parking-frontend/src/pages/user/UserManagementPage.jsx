import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { roleApi } from "../../api/admin/roleApi";
import { userApi } from "../../api/admin/userApi";
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

function toneForRole(role) {
  const value = String(role || "").replace(/^ROLE_/, "").toUpperCase();
  if (value === "ADMIN") return "rose";
  if (value === "MANAGER") return "violet";
  if (value === "STAFF") return "emerald";
  return "blue";
}

function toneForStatus(status) {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "emerald";
  if (value === "LOCKED") return "rose";
  return "amber";
}

function roleLabel(value) {
  return String(value || "UNKNOWN").replace(/^ROLE_/, "");
}

export default function UserManagementPage() {
  const [allUsers, setAllUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      try {
        const res = await roleApi.getAll();
        if (!cancelled) {
          setRoles(unwrapApiData(res.data, []));
        }
      } catch (err) {
        console.error("Failed to load roles", err);
        if (!cancelled) {
          setRoles([]);
        }
      }
    }

    void loadRoles();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const res =
          selectedRole !== "ALL" ? await userApi.getAll(selectedRole) : await userApi.getAll();
        if (!cancelled) {
          setError("");
          setAllUsers(unwrapApiData(res.data, []));
        }
      } catch (err) {
        console.error("Failed to load users", err);
        if (!cancelled) {
          setError("Unable to load users from backend.");
          setAllUsers([]);
        }
      }
    }

    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [selectedRole]);

  const users = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return allUsers;
    }

    return allUsers.filter((item) =>
      [item.username, item.fullName, item.email, item.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [allUsers, search]);

  const roleFilters = useMemo(
    () => ["ALL", ...roles.map((item) => item.roleName)],
    [roles]
  );

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="User Management"
        description="Browse users from the live backend and filter by role or search terms."
      />

      <ManagerPanel>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex max-w-sm items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2.5">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search users..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-2xl bg-muted p-1">
            {roleFilters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSelectedRole(item)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  selectedRole === item
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item === "ALL" ? "All" : item}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <ManagerEmptyState title="Cannot load users" description={error} />
        ) : users.length === 0 ? (
          <ManagerEmptyState title="No users available" description="No users matched the current role filter or search query." />
        ) : (
          <ManagerDataTable columns={["User", "Role", "Status", "Contact", "User ID"]}>
            {users.map((item) => (
              <ManagerRow key={item.userId}>
                <ManagerCell>
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {String(item.fullName || item.username || "U")
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0] || "")
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.fullName || item.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.email || "No email"}</p>
                    </div>
                  </div>
                </ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={toneForRole(item.role)}>{roleLabel(item.role)}</ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={toneForStatus(item.status)}>{item.status}</ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>
                  <div>{item.phone || "-"}</div>
                  <div className="text-xs text-muted-foreground">{item.username}</div>
                </ManagerCell>
                <ManagerCell className="font-mono text-xs">{item.userId}</ManagerCell>
              </ManagerRow>
            ))}
          </ManagerDataTable>
        )}
      </ManagerPanel>
    </div>
  );
}

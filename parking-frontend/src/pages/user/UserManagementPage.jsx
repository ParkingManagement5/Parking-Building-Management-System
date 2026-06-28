import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { roleApi } from "../../api/admin/roleApi";
import { userApi } from "../../api/admin/userApi";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerRow,
  ManagerSecondaryButton,
  ManagerSelect,
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
  const [editingUser, setEditingUser] = useState(null);
  const [roleDraft, setRoleDraft] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

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

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

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

  const paged = useMemo(() => users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [users, page]);
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));

  const roleFilters = useMemo(
    () => ["ALL", ...roles.map((item) => item.roleName)],
    [roles]
  );

  const roleOptions = useMemo(() => roles.map((item) => item.roleName), [roles]);

  const openRoleEditor = (user) => {
    setEditingUser(user);
    setRoleDraft(roleLabel(user.role));
    setActionError("");
    setActionMessage("");
  };

  const closeRoleEditor = () => {
    setEditingUser(null);
    setRoleDraft("");
    setSavingRole(false);
  };

  const loadUsers = async (roleFilter = selectedRole) => {
    const res =
      roleFilter !== "ALL" ? await userApi.getAll(roleFilter) : await userApi.getAll();
    setAllUsers(unwrapApiData(res.data, []));
  };

  const handleRoleChange = async () => {
    if (!editingUser || !roleDraft) {
      return;
    }

    setSavingRole(true);
    setActionError("");
    setActionMessage("");

    try {
      await userApi.changeRole(editingUser.userId, roleDraft);
      await loadUsers();
      setActionMessage(`Updated role for ${editingUser.username} to ${roleDraft}.`);
      closeRoleEditor();
    } catch (err) {
      console.error("Failed to update user role", err);
      setActionError(err.response?.data?.message || "Unable to update user role.");
      setSavingRole(false);
    }
  };

  return (
    <div className="space-y-5">
      <ManagerPanel>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex max-w-sm items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2.5">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search users..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-2xl bg-muted p-1">
            {roleFilters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setSelectedRole(item); setPage(1); }}
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

        {actionMessage ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            {actionMessage}
          </div>
        ) : null}

        {actionError ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {actionError}
          </div>
        ) : null}

        {error ? (
          <ManagerEmptyState title="Cannot load users" description={error} />
        ) : users.length === 0 ? (
          <ManagerEmptyState title="No users available" description="No users matched the current role filter or search query." />
        ) : (
          <ManagerDataTable columns={["User", "Role", "Status", "Contact", "User ID", "Actions"]}>
            {paged.map((item) => (
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
                <ManagerCell>
                  <button
                    type="button"
                    onClick={() => openRoleEditor(item)}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    Change Role
                  </button>
                </ManagerCell>
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

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-foreground">Change Role</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Update role for <span className="font-medium text-foreground">{editingUser.fullName || editingUser.username}</span>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="font-medium text-foreground">{editingUser.username}</div>
                <div className="text-muted-foreground">{editingUser.email || "No email"}</div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-foreground">Target Role</span>
                <ManagerSelect value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)}>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </ManagerSelect>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <ManagerSecondaryButton type="button" className="flex-1" onClick={closeRoleEditor}>
                Cancel
              </ManagerSecondaryButton>
              <ManagerPrimaryButton
                type="button"
                className="flex-1"
                onClick={handleRoleChange}
                disabled={savingRole || !roleDraft || roleDraft === roleLabel(editingUser.role)}
              >
                {savingRole ? "Saving..." : "Save Role"}
              </ManagerPrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

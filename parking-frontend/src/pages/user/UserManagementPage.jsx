import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { roleApi } from "../../api/admin/roleApi";
import { userApi } from "../../api/admin/userApi";
import { buildingApi } from "../../api/manager/buildingApi";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerField,
  ManagerForm,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerRow,
  ManagerSecondaryButton,
  ManagerSelect,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";
import { useToast } from "../../ui/components/Toast";
import { useConfirm } from "../../ui/components/ConfirmDialog";

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

const USER_STATUS_LABELS = { ACTIVE: "Đang hoạt động", LOCKED: "Đã khóa", INACTIVE: "Ngừng hoạt động" };

export default function UserManagementPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [allUsers, setAllUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [roleDraft, setRoleDraft] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [buildingModalUser, setBuildingModalUser] = useState(null);
  const [buildingDraft, setBuildingDraft] = useState("");
  const [savingBuilding, setSavingBuilding] = useState(false);

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

    async function loadBuildings() {
      try {
        const res = await buildingApi.getAll();
        if (!cancelled) {
          setBuildings(unwrapApiData(res.data, []));
        }
      } catch (err) {
        console.error("Failed to load buildings", err);
        if (!cancelled) {
          setBuildings([]);
        }
      }
    }

    void loadRoles();
    void loadBuildings();

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
          setError("Không tải được danh sách người dùng từ hệ thống.");
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

    try {
      await userApi.changeRole(editingUser.userId, roleDraft);
      await loadUsers();
      toast.success(`Đã đổi vai trò của ${editingUser.username} thành ${roleDraft}.`);
      closeRoleEditor();
    } catch (err) {
      console.error("Failed to update user role", err);
      toast.error(err.response?.data?.message || "Không thể cập nhật vai trò người dùng.");
      setSavingRole(false);
    }
  };

  const openBuildingEditor = (user) => {
    setBuildingModalUser(user);
    setBuildingDraft(user.assignedBuildingId || "");
  };

  const closeBuildingEditor = () => {
    setBuildingModalUser(null);
    setBuildingDraft("");
    setSavingBuilding(false);
  };

  const handleSaveBuilding = async () => {
    if (!buildingModalUser) return;
    setSavingBuilding(true);
    try {
      await userApi.assignBuilding(buildingModalUser.userId, buildingDraft || null);
      await loadUsers();
      toast.success(
        buildingDraft
          ? `Đã gán ${buildingModalUser.username} vào toà nhà đã chọn.`
          : `Đã gỡ ${buildingModalUser.username} khỏi toà nhà.`
      );
      closeBuildingEditor();
    } catch (err) {
      console.error("Failed to assign building", err);
      toast.error(err.response?.data?.message || "Không thể gán toà nhà cho người dùng.");
      setSavingBuilding(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === "LOCKED" ? "ACTIVE" : "LOCKED";
    const ok = await confirm({
      title: nextStatus === "LOCKED" ? "Khóa tài khoản?" : "Mở khóa tài khoản?",
      message: nextStatus === "LOCKED"
        ? `Tài khoản ${user.username} sẽ không thể đăng nhập.`
        : `Xác nhận mở khóa tài khoản ${user.username}.`,
      confirmLabel: nextStatus === "LOCKED" ? "Khóa" : "Mở khóa",
      tone: nextStatus === "LOCKED" ? "danger" : "default",
    });
    if (!ok) return;

    setStatusChangingId(user.userId);
    try {
      await userApi.changeStatus(user.userId, nextStatus);
      await loadUsers();
      toast.success(
        nextStatus === "LOCKED" ? `Đã khóa tài khoản ${user.username}.` : `Đã mở khóa tài khoản ${user.username}.`
      );
    } catch (err) {
      console.error("Failed to update user status", err);
      toast.error(err.response?.data?.message || "Không thể cập nhật trạng thái người dùng.");
    } finally {
      setStatusChangingId(null);
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
              placeholder="Tìm người dùng..."
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
                {item === "ALL" ? "Tất cả" : item}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <ManagerEmptyState title="Không tải được người dùng" description={error} />
        ) : users.length === 0 ? (
          <ManagerEmptyState title="Không có người dùng nào" description="Không có người dùng nào khớp với bộ lọc vai trò hoặc từ khóa tìm kiếm hiện tại." />
        ) : (
          <ManagerDataTable columns={["Người dùng", "Vai trò", "Toà nhà", "Trạng thái", "Liên hệ", "Mã người dùng", "Thao tác"]} minRows={PAGE_SIZE}>
            {paged.map((item) => {
              const roleValue = roleLabel(item.role);
              // STAFF: Manager tự gán/gỡ cho nhân viên của mình ở trang "Ca làm việc"
              // (StaffShiftPage) — Admin chỉ xem, không sửa ở đây để tránh trùng chức năng.
              // MANAGER: chỉ Admin gán được (Manager không tự gán cho chính mình).
              const hasBuildingConcept = roleValue === "MANAGER" || roleValue === "STAFF";
              const canAssignBuildingHere = roleValue === "MANAGER";
              return (
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
                      <p className="truncate text-xs text-muted-foreground">{item.email || "Chưa có email"}</p>
                    </div>
                  </div>
                </ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={toneForRole(item.role)}>{roleValue}</ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>
                  {!hasBuildingConcept ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : item.assignedBuildingName ? (
                    <ManagerStatusBadge tone="emerald">{item.assignedBuildingName}</ManagerStatusBadge>
                  ) : (
                    <ManagerStatusBadge tone="amber">Chưa gán</ManagerStatusBadge>
                  )}
                </ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={toneForStatus(item.status)}>{USER_STATUS_LABELS[item.status] || item.status}</ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>
                  <div>{item.phone || "-"}</div>
                  <div className="text-xs text-muted-foreground">{item.username}</div>
                </ManagerCell>
                <ManagerCell className="font-mono text-xs">{item.userId}</ManagerCell>
                <ManagerCell>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openRoleEditor(item)}
                      className="whitespace-nowrap rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                    >
                      Đổi vai trò
                    </button>
                    {canAssignBuildingHere && (
                      <button
                        type="button"
                        onClick={() => openBuildingEditor(item)}
                        className="whitespace-nowrap rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                      >
                        Gán toà nhà
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      disabled={statusChangingId === item.userId}
                      className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        item.status === "LOCKED"
                          ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          : "border-rose-200 text-rose-600 hover:bg-rose-50"
                      }`}
                    >
                      {item.status === "LOCKED" ? "Mở khóa" : "Khóa"}
                    </button>
                  </div>
                </ManagerCell>
              </ManagerRow>
              );
            })}
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
              <h3 className="text-lg font-semibold text-foreground">Đổi vai trò</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Cập nhật vai trò cho <span className="font-medium text-foreground">{editingUser.fullName || editingUser.username}</span>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="font-medium text-foreground">{editingUser.username}</div>
                <div className="text-muted-foreground">{editingUser.email || "Chưa có email"}</div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-foreground">Vai trò mới</span>
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
                Hủy
              </ManagerSecondaryButton>
              <ManagerPrimaryButton
                type="button"
                className="flex-1"
                onClick={handleRoleChange}
                disabled={savingRole || !roleDraft || roleDraft === roleLabel(editingUser.role)}
              >
                {savingRole ? "Đang lưu..." : "Lưu vai trò"}
              </ManagerPrimaryButton>
            </div>
          </div>
        </div>
      ) : null}

      {buildingModalUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-5">
              <h3 className="text-lg font-semibold text-foreground">Gán toà nhà</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Chọn toà nhà cho <span className="font-medium text-foreground">{buildingModalUser.fullName || buildingModalUser.username}</span>
                {" "}({roleLabel(buildingModalUser.role)}).
              </p>
            </div>
            <ManagerForm onSubmit={(e) => { e.preventDefault(); handleSaveBuilding(); }}>
              <ManagerField label="Toà nhà">
                <ManagerSelect value={buildingDraft} onChange={(e) => setBuildingDraft(e.target.value)}>
                  <option value="">Không gán (bỏ trống)</option>
                  {buildings.map((b) => (
                    <option key={b.buildingId ?? b.id} value={b.buildingId ?? b.id}>{b.name}</option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <div className="flex gap-3">
                <ManagerSecondaryButton type="button" className="flex-1" onClick={closeBuildingEditor}>
                  Hủy
                </ManagerSecondaryButton>
                <ManagerPrimaryButton type="submit" className="flex-1" disabled={savingBuilding}>
                  {savingBuilding ? "Đang lưu..." : "Lưu"}
                </ManagerPrimaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

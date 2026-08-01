import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { staffShiftApi } from "../../api/manager/staffShiftApi";
import { buildingApi } from "../../api/manager/buildingApi";
import { getAssignedBuildingId, getRole } from "../../utils/auth";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerField,
  ManagerForm,
  ManagerInput,
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

const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

function toDateKey(date) {
  // Dung thanh phan ngay-thang-nam theo local time, KHONG dung toISOString()
  // — voi mui gio +7, toISOString() quy ve UTC se lui lai 1 ngay (nua dem
  // local = 17h hom truoc theo UTC), lam sai lech ngay lam viec.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function shiftTone(shiftName) {
  const n = (shiftName || "").toLowerCase();
  if (n.includes("sáng")) return "amber";
  if (n.includes("chiều")) return "blue";
  if (n.includes("đêm")) return "violet";
  return "slate";
}

// Cham mau tinh trang diem danh, hien canh ten nhan vien trong luoi ca lam.
const ATTENDANCE_DOT = {
  NOT_STARTED: { color: "bg-slate-300 dark:bg-slate-600", label: "Chưa check-in" },
  ON_TIME: { color: "bg-emerald-500", label: "Đúng giờ" },
  LATE: { color: "bg-amber-500", label: "Trễ giờ" },
  ABSENT: { color: "bg-rose-500", label: "Vắng ca" },
  COMPLETED: { color: "bg-emerald-500", label: "Đã hoàn thành ca" },
};

export default function StaffShiftPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const isManager = getRole() === "MANAGER";
  const assignedBuildingId = getAssignedBuildingId();
  const [staffUsers, setStaffUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [staffShifts, setStaffShifts] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ userId: "", buildingId: "" });
  const [showCreateStaffModal, setShowCreateStaffModal] = useState(false);
  const [createStaffForm, setCreateStaffForm] = useState({ username: "", fullName: "", email: "", phone: "", password: "" });
  const [loadError, setLoadError] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const [filterStaffSearch, setFilterStaffSearch] = useState("");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [formErrors, setFormErrors] = useState({});
  const [createStaffErrors, setCreateStaffErrors] = useState({});
  const [form, setForm] = useState({
    userId: "",
    shiftId: "",
    workingDate: "",
  });

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [usersRes, shiftsRes, staffShiftsRes, buildingsRes] = await Promise.all([
        axiosClient.get("/users?role=STAFF"),
        axiosClient.get("/shifts"),
        staffShiftApi.getAll(),
        buildingApi.getAll(),
      ]);
      setLoadError("");
      setStaffUsers(unwrapApiData(usersRes.data, []));
      setShifts(unwrapApiData(shiftsRes.data, []));
      setStaffShifts(unwrapApiData(staffShiftsRes.data, []));
      setBuildings(unwrapApiData(buildingsRes.data, []));
    } catch (error) {
      console.error("Failed to load staff shift data", error);
      setLoadError("Không tải được dữ liệu ca làm từ backend.");
      setStaffUsers([]);
      setShifts([]);
      setStaffShifts([]);
    }
  }

  // Chi nhan vien DA duoc gan toa nha moi xep ca duoc (backend yeu cau
  // assignedBuilding de xac dinh pham vi Manager).
  const assignableStaffUsers = useMemo(
    () => staffUsers.filter((item) => item.assignedBuildingId),
    [staffUsers]
  );
  const canAssign = assignableStaffUsers.length > 0 && shifts.length > 0;

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const filteredStaffForGrid = useMemo(() => {
    const q = filterStaffSearch.trim().toLowerCase();
    if (!q) return assignableStaffUsers;
    return assignableStaffUsers.filter((item) => (item.fullName || "").toLowerCase().includes(q));
  }, [assignableStaffUsers, filterStaffSearch]);

  // staffByShiftAndDate[shiftId][dateKey] = [staffShift, ...]
  const staffByShiftAndDate = useMemo(() => {
    const map = {};
    for (const item of staffShifts) {
      const key = item.workingDate;
      map[item.shiftId] ??= {};
      map[item.shiftId][key] ??= [];
      map[item.shiftId][key].push(item);
    }
    return map;
  }, [staffShifts]);

  const filteredStaffIds = useMemo(
    () => new Set(filteredStaffForGrid.map((item) => item.userId)),
    [filteredStaffForGrid]
  );

  const PAGE_SIZE = 10;
  const pagedStaffUsers = useMemo(() => staffUsers.slice((staffPage - 1) * PAGE_SIZE, staffPage * PAGE_SIZE), [staffUsers, staffPage]);
  const totalStaffPages = Math.max(1, Math.ceil(staffUsers.length / PAGE_SIZE));

  const resetForm = () => {
    setEditingId(null);
    setFormErrors({});
    setForm({ userId: "", shiftId: "", workingDate: "" });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openCreateModalFor = (shiftId, workingDate) => {
    setEditingId(null);
    setFormErrors({});
    setForm({ userId: "", shiftId: String(shiftId), workingDate });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setFormErrors((prev) => ({ ...prev, [event.target.name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!form.userId) errors.userId = "Nhân viên là bắt buộc";
    if (!form.shiftId) errors.shiftId = "Ca làm là bắt buộc";
    if (!form.workingDate) errors.workingDate = "Ngày làm việc là bắt buộc";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      userId: Number(form.userId),
      shiftId: Number(form.shiftId),
      workingDate: form.workingDate,
    };

    try {
      if (editingId) {
        await staffShiftApi.update(editingId, payload);
      } else {
        await staffShiftApi.create(payload);
      }
      await loadInitialData();
      toast.success(editingId ? "Đã cập nhật ca làm" : "Đã gán ca làm");
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save staff shift", error);
      toast.error("Lưu ca làm thất bại");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.staffShiftId);
    setFormErrors({});
    setForm({
      userId: String(item.userId),
      shiftId: String(item.shiftId),
      workingDate: item.workingDate,
    });
    setShowModal(true);
  };

  // Goi la handleDelete/Xoa nhung backend gio la vo hieu hoa mem (isActive=
  // false) — giu lai lich su check-in/check-out neu ca da dien ra, chi an
  // khoi danh sach dang hoat dong.
  const handleDelete = async (id) => {
    const ok = await confirm({
      title: "Bỏ phân ca này?",
      message: "Lịch sử chấm công (nếu có) vẫn được giữ lại.",
      confirmLabel: "Bỏ phân ca",
      tone: "warning",
    });
    if (!ok) return;
    try {
      await staffShiftApi.delete(id);
      toast.success("Đã bỏ phân ca");
      await loadInitialData();
    } catch (error) {
      console.error("Failed to deactivate staff shift", error);
      toast.error("Bỏ phân ca thất bại");
    } finally {
      handleCloseModal();
    }
  };

  const handleUnassignBuilding = async (userId) => {
    const ok = await confirm({
      title: "Gỡ nhân viên khỏi toà nhà?",
      message: "Nhân viên sẽ không thao tác được cho đến khi được gán lại.",
      confirmLabel: "Gỡ khỏi toà",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await axiosClient.put(`/users/${userId}/assign-building`);
      toast.success("Đã gỡ nhân viên khỏi toà nhà");
      await loadInitialData();
    } catch (error) {
      console.error("Failed to unassign building", error);
      toast.error(error.response?.data?.message || "Gỡ khỏi toà thất bại");
    }
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();
    const { username, fullName, email, password } = createStaffForm;
    const errors = {};
    if (!username.trim()) errors.username = "Username là bắt buộc";
    if (!fullName.trim()) errors.fullName = "Họ tên là bắt buộc";
    if (!email.trim()) errors.email = "Email là bắt buộc";
    if (!password.trim()) errors.password = "Mật khẩu là bắt buộc";
    if (Object.keys(errors).length > 0) {
      setCreateStaffErrors(errors);
      return;
    }
    try {
      await axiosClient.post("/users/staff", createStaffForm);
      setShowCreateStaffModal(false);
      setCreateStaffForm({ username: "", fullName: "", email: "", phone: "", password: "" });
      setCreateStaffErrors({});
      toast.success("Đã tạo nhân viên mới");
      await loadInitialData();
    } catch (error) {
      console.error("Failed to create staff", error);
      toast.error(error.response?.data?.message || "Tạo nhân viên thất bại");
    }
  };

  const weekRangeLabel = `${weekDays[0].toLocaleDateString("vi-VN")} - ${weekDays[6].toLocaleDateString("vi-VN")}`;
  const isCurrentWeek = toDateKey(weekStart) === toDateKey(getMonday(new Date()));

  return (
    <div className="space-y-5">
      {/* Voi Manager, nhan vien do chinh minh tao luon tu dong gan vao toa nha
          cua minh (backend forcedBuildingId) nen khong con truong hop "chua
          gan" can xu ly thu cong — bang phan cong toa chi con can thiet cho
          Admin (tao staff khong qua Manager, chua co toa mac dinh). */}
      {!isManager && (
        <ManagerPanel>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-foreground">Phân công tòa nhà cho nhân viên</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Gán nhân viên vào tòa nhà — nhân viên chỉ thao tác trong tòa nhà được gán</p>
          </div>
          {staffUsers.length === 0 ? (
            <ManagerEmptyState title="Chưa có nhân viên" description="Tạo tài khoản nhân viên trước." />
          ) : (
            <ManagerDataTable columns={["Nhân viên", "Email", "Tòa nhà", "Thao tác"]}>
              {pagedStaffUsers.map((staff) => (
                <ManagerRow key={staff.userId}>
                  <ManagerCell className="font-medium">{staff.fullName}</ManagerCell>
                  <ManagerCell>{staff.email}</ManagerCell>
                  <ManagerCell>
                    {staff.assignedBuildingName ? (
                      <ManagerStatusBadge tone="emerald">{staff.assignedBuildingName}</ManagerStatusBadge>
                    ) : (
                      <ManagerStatusBadge tone="amber">Chưa gán</ManagerStatusBadge>
                    )}
                  </ManagerCell>
                  <ManagerCell>
                    <div className="flex gap-2">
                      <ManagerSecondaryButton type="button" onClick={() => {
                        setBuildingForm({ userId: staff.userId, buildingId: staff.assignedBuildingId || "" });
                        setShowBuildingModal(true);
                      }}>
                        {staff.assignedBuildingName ? "Đổi tòa nhà" : "Gán tòa nhà"}
                      </ManagerSecondaryButton>
                      {staff.assignedBuildingName && (
                        <ManagerSecondaryButton
                          type="button"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => handleUnassignBuilding(staff.userId)}
                        >
                          Gỡ khỏi toà
                        </ManagerSecondaryButton>
                      )}
                    </div>
                  </ManagerCell>
                </ManagerRow>
              ))}
            </ManagerDataTable>
          )}
          {totalStaffPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setStaffPage(p => Math.max(1, p - 1))} disabled={staffPage === 1}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
                ← Trước
              </button>
              {Array.from({ length: totalStaffPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setStaffPage(p)}
                  className={`size-8 rounded-lg text-xs font-bold transition ${p === staffPage ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setStaffPage(p => Math.min(totalStaffPages, p + 1))} disabled={staffPage === totalStaffPages}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
                Sau →
              </button>
            </div>
          )}
        </ManagerPanel>
      )}

      <ManagerPanel
        title="Thời khóa biểu tuần"
        subtitle={`${staffShifts.length} ca làm đã xếp · ${weekRangeLabel}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filterStaffSearch}
                onChange={(e) => setFilterStaffSearch(e.target.value)}
                placeholder="Tìm tên nhân viên..."
                className="w-44 rounded-xl border border-border bg-muted py-2 pl-8 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
              <button type="button" onClick={() => setWeekStart((d) => addDays(d, -7))} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-card hover:text-foreground">
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(getMonday(new Date()))}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${isCurrentWeek ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Tuần này
              </button>
              <button type="button" onClick={() => setWeekStart((d) => addDays(d, 7))} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-card hover:text-foreground">
                <ChevronRight size={14} />
              </button>
            </div>
            <ManagerSecondaryButton type="button" onClick={() => { setCreateStaffErrors({}); setShowCreateStaffModal(true); }} className="flex items-center gap-2">
              <Plus size={14} /> Tạo nhân viên mới
            </ManagerSecondaryButton>
            <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
              <Plus size={14} /> Gán ca làm
            </ManagerPrimaryButton>
          </div>
        }
      >
        {filteredStaffForGrid.length === 0 ? (
          <ManagerEmptyState
            title="Chưa có nhân viên để xếp ca"
            description="Tạo tài khoản nhân viên trước — nhân viên sẽ tự động thuộc toà nhà bạn quản lý."
          />
        ) : shifts.length === 0 ? (
          <ManagerEmptyState
            title="Chưa có mẫu ca làm"
            description="Hệ thống chưa có ca sáng/chiều/đêm để xếp lịch."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-border bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ca làm
                  </th>
                  {weekDays.map((day, i) => {
                    const isToday = toDateKey(day) === toDateKey(new Date());
                    return (
                      <th key={toDateKey(day)} className={`border-b border-border px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {DAY_LABELS[i]}
                        <div className="mt-0.5 text-[11px] font-normal normal-case">{day.toLocaleDateString("vi-VN")}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.shiftId} className="transition-colors hover:bg-muted/20">
                    <td className="sticky left-0 z-10 border-b border-border bg-card px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{shift.shiftName}</p>
                      <p className="text-xs text-muted-foreground">{shift.startTime} - {shift.endTime}</p>
                    </td>
                    {weekDays.map((day) => {
                      const dateKey = toDateKey(day);
                      const entries = (staffByShiftAndDate[shift.shiftId]?.[dateKey] || [])
                        .filter((item) => filteredStaffIds.has(item.userId));
                      return (
                        <td key={dateKey} className="border-b border-border px-2 py-2 align-top">
                          <button
                            type="button"
                            onClick={() => entries.length === 0 && openCreateModalFor(shift.shiftId, dateKey)}
                            className={`group flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl p-1.5 transition-colors ${entries.length === 0 ? "hover:bg-muted/50" : ""}`}
                          >
                            {entries.length === 0 ? (
                              <Plus size={13} className="text-transparent transition-colors group-hover:text-muted-foreground" />
                            ) : (
                              entries.map((item) => {
                                const attendance = ATTENDANCE_DOT[item.attendanceStatus] || ATTENDANCE_DOT.NOT_STARTED;
                                return (
                                  <span
                                    key={item.staffShiftId}
                                    role="button"
                                    tabIndex={0}
                                    title={attendance.label}
                                    onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleEdit(item); } }}
                                  >
                                    <ManagerStatusBadge tone={shiftTone(shift.shiftName)}>
                                      <span className={`mr-1.5 inline-block size-1.5 rounded-full ${attendance.color}`} />
                                      {item.userName}
                                    </ManagerStatusBadge>
                                  </span>
                                );
                              })
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ManagerPanel>

      {showBuildingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Gán tòa nhà cho nhân viên</h3>
                <p className="mt-1 text-sm text-muted-foreground">Nhân viên sẽ chỉ thao tác trong tòa nhà được gán.</p>
              </div>
              <button type="button" onClick={() => setShowBuildingModal(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={async (e) => {
              e.preventDefault();
              if (!buildingForm.userId || !buildingForm.buildingId) return;
              try {
                await axiosClient.put(`/users/${buildingForm.userId}/assign-building?buildingId=${buildingForm.buildingId}`);
                setShowBuildingModal(false);
                await loadInitialData();
                toast.success("Đã gán tòa nhà cho nhân viên");
              } catch (err) {
                toast.error(err.response?.data?.message || "Gán tòa nhà thất bại");
              }
            }}>
              <ManagerField label="Tòa nhà">
                <ManagerSelect value={buildingForm.buildingId} onChange={(e) => setBuildingForm((p) => ({ ...p, buildingId: e.target.value }))}>
                  <option value="">Chọn tòa nhà</option>
                  {buildings
                    .filter((b) => !isManager || String(b.buildingId || b.id) === String(assignedBuildingId))
                    .map((b) => (
                      <option key={b.buildingId || b.id} value={b.buildingId || b.id}>{b.name}</option>
                    ))}
                </ManagerSelect>
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1" disabled={!buildingForm.buildingId}>Gán tòa nhà</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={() => setShowBuildingModal(false)}>Hủy</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}

      {showCreateStaffModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Tạo nhân viên mới</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isManager
                    ? "Tài khoản sẽ được kích hoạt ngay và tự động gán vào toà nhà bạn quản lý."
                    : "Tài khoản sẽ được kích hoạt ngay, chưa gán toà nhà (gán sau ở bảng bên trên)."}
                </p>
              </div>
              <button type="button" onClick={() => setShowCreateStaffModal(false)} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={handleCreateStaff}>
              <ManagerField label="Username" error={createStaffErrors.username}>
                <ManagerInput value={createStaffForm.username}
                  onChange={(e) => { setCreateStaffForm((p) => ({ ...p, username: e.target.value })); setCreateStaffErrors((p) => ({ ...p, username: undefined })); }} placeholder="staff_nguyenvana" />
              </ManagerField>
              <ManagerField label="Họ tên" error={createStaffErrors.fullName}>
                <ManagerInput value={createStaffForm.fullName}
                  onChange={(e) => { setCreateStaffForm((p) => ({ ...p, fullName: e.target.value })); setCreateStaffErrors((p) => ({ ...p, fullName: undefined })); }} placeholder="Nguyễn Văn A" />
              </ManagerField>
              <ManagerField label="Email" error={createStaffErrors.email}>
                <ManagerInput type="email" value={createStaffForm.email}
                  onChange={(e) => { setCreateStaffForm((p) => ({ ...p, email: e.target.value })); setCreateStaffErrors((p) => ({ ...p, email: undefined })); }} placeholder="staff@parksmart.local" />
              </ManagerField>
              <ManagerField label="Số điện thoại (tuỳ chọn)">
                <ManagerInput value={createStaffForm.phone}
                  onChange={(e) => setCreateStaffForm((p) => ({ ...p, phone: e.target.value }))} placeholder="09xxxxxxxx" />
              </ManagerField>
              <ManagerField label="Mật khẩu" error={createStaffErrors.password}>
                <ManagerInput type="password" value={createStaffForm.password}
                  onChange={(e) => { setCreateStaffForm((p) => ({ ...p, password: e.target.value })); setCreateStaffErrors((p) => ({ ...p, password: undefined })); }} placeholder="Tối thiểu 6 ký tự" />
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">Tạo nhân viên</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={() => setShowCreateStaffModal(false)}>Hủy</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Cập nhật ca làm" : "Gán ca làm"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Ghép nhân viên với mẫu ca làm và ngày làm việc.</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            {loadError ? (
              <ManagerEmptyState title="Không tải được dữ liệu từ backend" description={loadError} />
            ) : (
              <ManagerForm onSubmit={handleSubmit}>
                <ManagerField label="Nhân viên" error={formErrors.userId}>
                  <ManagerSelect name="userId" value={form.userId} onChange={handleChange} disabled={assignableStaffUsers.length === 0}>
                    <option value="">Chọn nhân viên</option>
                    {assignableStaffUsers.map((item) => (
                      <option key={item.userId} value={item.userId}>{item.fullName}</option>
                    ))}
                  </ManagerSelect>
                </ManagerField>
                <ManagerField label="Ca làm" error={formErrors.shiftId}>
                  <ManagerSelect name="shiftId" value={form.shiftId} onChange={handleChange} disabled={shifts.length === 0}>
                    <option value="">Chọn ca làm</option>
                    {shifts.map((item) => (
                      <option key={item.shiftId} value={item.shiftId}>{item.shiftName} ({item.startTime} - {item.endTime})</option>
                    ))}
                  </ManagerSelect>
                </ManagerField>
                <ManagerField label="Ngày làm việc" error={formErrors.workingDate}>
                  <ManagerInput type="date" name="workingDate" value={form.workingDate} onChange={handleChange} />
                </ManagerField>
                <div className="flex gap-3">
                  <ManagerPrimaryButton type="submit" className="flex-1" disabled={!canAssign}>{editingId ? "Lưu thay đổi" : "Gán ca làm"}</ManagerPrimaryButton>
                  {editingId ? (
                    <ManagerSecondaryButton type="button" className="border-amber-200 text-amber-600 hover:bg-amber-50" onClick={() => handleDelete(editingId)}>Bỏ phân ca</ManagerSecondaryButton>
                  ) : null}
                  <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Hủy</ManagerSecondaryButton>
                </div>
              </ManagerForm>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { staffShiftApi } from "../../api/manager/staffShiftApi";
import { buildingApi } from "../../api/manager/buildingApi";
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

export default function StaffShiftPage() {
  const [staffUsers, setStaffUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [staffShifts, setStaffShifts] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [buildingForm, setBuildingForm] = useState({ userId: "", buildingId: "" });
  const [loadError, setLoadError] = useState("");
  const [shiftPage, setShiftPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [filterStaffSearch, setFilterStaffSearch] = useState("");
  const [filterShiftDate, setFilterShiftDate] = useState("");
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

  const shiftMap = useMemo(() => Object.fromEntries(shifts.map((item) => [item.shiftId, item])), [shifts]);
  const canAssign = staffUsers.length > 0 && shifts.length > 0;

  const filteredStaffShifts = useMemo(() => {
    const q = filterStaffSearch.toLowerCase();
    return staffShifts.filter((s) => {
      if (q && !(s.userName || "").toLowerCase().includes(q)) return false;
      if (filterShiftDate && s.workingDate !== filterShiftDate) return false;
      return true;
    });
  }, [staffShifts, filterStaffSearch, filterShiftDate]);

  const PAGE_SIZE = 10;
  const pagedStaffShifts = useMemo(() => filteredStaffShifts.slice((shiftPage - 1) * PAGE_SIZE, shiftPage * PAGE_SIZE), [filteredStaffShifts, shiftPage]);
  const totalShiftPages = Math.max(1, Math.ceil(filteredStaffShifts.length / PAGE_SIZE));
  const pagedStaffUsers = useMemo(() => staffUsers.slice((staffPage - 1) * PAGE_SIZE, staffPage * PAGE_SIZE), [staffUsers, staffPage]);
  const totalStaffPages = Math.max(1, Math.ceil(staffUsers.length / PAGE_SIZE));

  const resetForm = () => {
    setEditingId(null);
    setForm({ userId: "", shiftId: "", workingDate: "" });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.userId || !form.shiftId || !form.workingDate) {
      alert("Nhân viên, ca làm và ngày làm việc là bắt buộc");
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
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save staff shift", error);
      alert("Lưu ca làm thất bại");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.staffShiftId);
    setForm({
      userId: item.userId,
      shiftId: item.shiftId,
      workingDate: item.workingDate,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa ca làm này?")) return;
    try {
      await staffShiftApi.delete(id);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to delete staff shift", error);
      alert("Xóa ca làm thất bại");
    }
  };

  return (
    <div className="space-y-5">
      {/* Staff - Building Assignment */}
      <ManagerPanel>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Phân công tòa nhà cho nhân viên</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Gán nhân viên vào tòa nhà — nhân viên chỉ thao tác trong tòa nhà được gán</p>
        </div>
        {staffUsers.length === 0 ? (
          <ManagerEmptyState title="Chưa có nhân viên" description="Tạo tài khoản nhân viên trước." />
        ) : (
          <ManagerDataTable columns={["Nhân viên", "Email", "Tòa nhà", "Thao tác"]} minRows={PAGE_SIZE}>
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
                  <ManagerSecondaryButton type="button" onClick={() => {
                    setBuildingForm({ userId: staff.userId, buildingId: staff.assignedBuildingId || "" });
                    setShowBuildingModal(true);
                  }}>
                    {staff.assignedBuildingName ? "Đổi tòa nhà" : "Gán tòa nhà"}
                  </ManagerSecondaryButton>
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

      <ManagerPanel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Danh sách ca làm</h2>
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={14} /> Gán ca làm
          </ManagerPrimaryButton>
        </div>

        {/* Shift filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={filterStaffSearch}
              onChange={(e) => { setFilterStaffSearch(e.target.value); setShiftPage(1); }}
              placeholder="Tìm tên nhân viên..."
              className="w-full rounded-xl border border-border bg-muted py-2 pl-8 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>
          <input
            type="date"
            value={filterShiftDate}
            onChange={(e) => { setFilterShiftDate(e.target.value); setShiftPage(1); }}
            className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
          />
          {(filterStaffSearch || filterShiftDate) && (
            <button
              onClick={() => { setFilterStaffSearch(""); setFilterShiftDate(""); setShiftPage(1); }}
              className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={12} /> Xóa lọc
            </button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filteredStaffShifts.length} / {staffShifts.length} ca làm</span>
        </div>

        {filteredStaffShifts.length === 0 ? (
          <ManagerEmptyState title="Chưa có ca làm nào" description="Tạo phân công sau khi đã có tài khoản nhân viên và mẫu ca làm." />
        ) : (
          <ManagerDataTable columns={["Nhân viên", "Ca làm", "Ngày làm việc", "Thời gian", "Trạng thái", "Thao tác"]} minRows={PAGE_SIZE}>
            {pagedStaffShifts.map((item) => {
              const shift = shiftMap[item.shiftId];
              return (
                <ManagerRow key={item.staffShiftId}>
                  <ManagerCell className="font-medium">{item.userName}</ManagerCell>
                  <ManagerCell>{item.shiftName}</ManagerCell>
                  <ManagerCell>{item.workingDate}</ManagerCell>
                  <ManagerCell>{shift ? `${shift.startTime} - ${shift.endTime}` : "-"}</ManagerCell>
                  <ManagerCell><ManagerStatusBadge tone="blue">Đã gán</ManagerStatusBadge></ManagerCell>
                  <ManagerCell>
                    <div className="flex gap-2">
                      <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Sửa</ManagerSecondaryButton>
                      <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.staffShiftId)}>Xóa</ManagerSecondaryButton>
                    </div>
                  </ManagerCell>
                </ManagerRow>
              );
            })}
          </ManagerDataTable>
        )}
        {totalShiftPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button onClick={() => setShiftPage(p => Math.max(1, p - 1))} disabled={shiftPage === 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              ← Trước
            </button>
            {Array.from({ length: totalShiftPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setShiftPage(p)}
                className={`size-8 rounded-lg text-xs font-bold transition ${p === shiftPage ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setShiftPage(p => Math.min(totalShiftPages, p + 1))} disabled={shiftPage === totalShiftPages}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              Sau →
            </button>
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
              } catch (err) {
                alert(err.response?.data?.message || "Gán tòa nhà thất bại");
              }
            }}>
              <ManagerField label="Tòa nhà">
                <ManagerSelect value={buildingForm.buildingId} onChange={(e) => setBuildingForm((p) => ({ ...p, buildingId: e.target.value }))}>
                  <option value="">Chọn tòa nhà</option>
                  {buildings.map((b) => (
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
                <ManagerField label="Nhân viên">
                  <ManagerSelect name="userId" value={form.userId} onChange={handleChange} disabled={staffUsers.length === 0}>
                    <option value="">Chọn nhân viên</option>
                    {staffUsers.map((item) => (
                      <option key={item.userId} value={item.userId}>{item.fullName}</option>
                    ))}
                  </ManagerSelect>
                </ManagerField>
                <ManagerField label="Ca làm">
                  <ManagerSelect name="shiftId" value={form.shiftId} onChange={handleChange} disabled={shifts.length === 0}>
                    <option value="">Chọn ca làm</option>
                    {shifts.map((item) => (
                      <option key={item.shiftId} value={item.shiftId}>{item.shiftName} ({item.startTime} - {item.endTime})</option>
                    ))}
                  </ManagerSelect>
                </ManagerField>
                <ManagerField label="Ngày làm việc">
                  <ManagerInput type="date" name="workingDate" value={form.workingDate} onChange={handleChange} />
                </ManagerField>
                <div className="flex gap-3">
                  <ManagerPrimaryButton type="submit" className="flex-1" disabled={!canAssign}>{editingId ? "Lưu thay đổi" : "Gán ca làm"}</ManagerPrimaryButton>
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

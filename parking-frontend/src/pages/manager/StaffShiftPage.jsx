import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarRange, Clock3, ShieldCheck, Users, Plus, X } from "lucide-react";
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
  ManagerPageHeader,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerRow,
  ManagerSecondaryButton,
  ManagerSelect,
  ManagerStatCard,
  ManagerStatsRow,
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
      setLoadError("Cannot load staff shift data from backend.");
      setStaffUsers([]);
      setShifts([]);
      setStaffShifts([]);
    }
  }

  const shiftMap = useMemo(() => Object.fromEntries(shifts.map((item) => [item.shiftId, item])), [shifts]);
  const canAssign = staffUsers.length > 0 && shifts.length > 0;

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
      alert("Staff, shift and working date are required");
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
      alert("Save staff shift failed");
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
    if (!window.confirm("Are you sure you want to remove this staff shift?")) return;
    try {
      await staffShiftApi.delete(id);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to delete staff shift", error);
      alert("Delete staff shift failed");
    }
  };

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Staff Shift Management"
        description="Assign shifts to staff members and keep schedule coverage visible by date."
        action={
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={14} /> Assign Shift
          </ManagerPrimaryButton>
        }
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={Users} label="Staff Users" value={staffUsers.length} hint="Staff accounts available for assignment" tone="violet" />
        <ManagerStatCard icon={Clock3} label="Shift Templates" value={shifts.length} hint="Shift definitions from backend" tone="blue" />
        <ManagerStatCard icon={CalendarRange} label="Assignments" value={staffShifts.length} hint="Saved staff shift records" tone="emerald" />
        <ManagerStatCard icon={Building2} label="Buildings" value={buildings.length} hint="Available buildings for staff assignment" tone="amber" />
      </ManagerStatsRow>

      {/* Staff - Building Assignment */}
      <ManagerPanel title="Staff Building Assignment" subtitle="Gan staff vao building — staff chi thao tac trong building duoc gan">
        {staffUsers.length === 0 ? (
          <ManagerEmptyState title="Chua co staff" description="Tao tai khoan staff truoc." />
        ) : (
          <ManagerDataTable columns={["Staff", "Email", "Building", "Actions"]}>
            {staffUsers.map((staff) => (
              <ManagerRow key={staff.userId}>
                <ManagerCell className="font-medium">{staff.fullName}</ManagerCell>
                <ManagerCell>{staff.email}</ManagerCell>
                <ManagerCell>
                  {staff.assignedBuildingName ? (
                    <ManagerStatusBadge tone="emerald">{staff.assignedBuildingName}</ManagerStatusBadge>
                  ) : (
                    <ManagerStatusBadge tone="amber">Chua gan</ManagerStatusBadge>
                  )}
                </ManagerCell>
                <ManagerCell>
                  <ManagerSecondaryButton type="button" onClick={() => {
                    setBuildingForm({ userId: staff.userId, buildingId: staff.assignedBuildingId || "" });
                    setShowBuildingModal(true);
                  }}>
                    {staff.assignedBuildingName ? "Doi building" : "Gan building"}
                  </ManagerSecondaryButton>
                </ManagerCell>
              </ManagerRow>
            ))}
          </ManagerDataTable>
        )}
      </ManagerPanel>

      <ManagerPanel title="Staff Shift Directory" subtitle={`${staffShifts.length} assignment records available`}>
        {staffShifts.length === 0 ? (
          <ManagerEmptyState title="No staff shifts yet" description="Create assignments after staff accounts and shift templates are available." />
        ) : (
          <ManagerDataTable columns={["Staff", "Shift", "Working Date", "Time", "Status", "Actions"]}>
            {staffShifts.map((item) => {
              const shift = shiftMap[item.shiftId];
              return (
                <ManagerRow key={item.staffShiftId}>
                  <ManagerCell className="font-medium">{item.userName}</ManagerCell>
                  <ManagerCell>{item.shiftName}</ManagerCell>
                  <ManagerCell>{item.workingDate}</ManagerCell>
                  <ManagerCell>{shift ? `${shift.startTime} - ${shift.endTime}` : "-"}</ManagerCell>
                  <ManagerCell><ManagerStatusBadge tone="blue">Assigned</ManagerStatusBadge></ManagerCell>
                  <ManagerCell>
                    <div className="flex gap-2">
                      <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Edit</ManagerSecondaryButton>
                      <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.staffShiftId)}>Remove</ManagerSecondaryButton>
                    </div>
                  </ManagerCell>
                </ManagerRow>
              );
            })}
          </ManagerDataTable>
        )}
      </ManagerPanel>

      {showBuildingModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Gan Building cho Staff</h3>
                <p className="mt-1 text-sm text-muted-foreground">Staff se chi thao tac trong building duoc gan.</p>
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
                alert(err.response?.data?.message || "Gan building that bai");
              }
            }}>
              <ManagerField label="Building">
                <ManagerSelect value={buildingForm.buildingId} onChange={(e) => setBuildingForm((p) => ({ ...p, buildingId: e.target.value }))}>
                  <option value="">Chon building</option>
                  {buildings.map((b) => (
                    <option key={b.buildingId || b.id} value={b.buildingId || b.id}>{b.name}</option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1" disabled={!buildingForm.buildingId}>Gan Building</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={() => setShowBuildingModal(false)}>Huy</ManagerSecondaryButton>
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
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Update Staff Shift" : "Assign Staff Shift"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Pair staff members with shift templates and working dates.</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            {loadError ? (
              <ManagerEmptyState title="Backend data unavailable" description={loadError} />
            ) : (
              <ManagerForm onSubmit={handleSubmit}>
                <ManagerField label="Staff">
                  <ManagerSelect name="userId" value={form.userId} onChange={handleChange} disabled={staffUsers.length === 0}>
                    <option value="">Select staff</option>
                    {staffUsers.map((item) => (
                      <option key={item.userId} value={item.userId}>{item.fullName}</option>
                    ))}
                  </ManagerSelect>
                </ManagerField>
                <ManagerField label="Shift">
                  <ManagerSelect name="shiftId" value={form.shiftId} onChange={handleChange} disabled={shifts.length === 0}>
                    <option value="">Select shift</option>
                    {shifts.map((item) => (
                      <option key={item.shiftId} value={item.shiftId}>{item.shiftName} ({item.startTime} - {item.endTime})</option>
                    ))}
                  </ManagerSelect>
                </ManagerField>
                <ManagerField label="Working Date">
                  <ManagerInput type="date" name="workingDate" value={form.workingDate} onChange={handleChange} />
                </ManagerField>
                <div className="flex gap-3">
                  <ManagerPrimaryButton type="submit" className="flex-1" disabled={!canAssign}>{editingId ? "Save Changes" : "Assign Shift"}</ManagerPrimaryButton>
                  <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Cancel</ManagerSecondaryButton>
                </div>
              </ManagerForm>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Clock3, ShieldCheck, Users, Plus, X } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { staffShiftApi } from "../../api/manager/staffShiftApi";
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
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
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
      const [usersRes, shiftsRes, staffShiftsRes] = await Promise.all([
        axiosClient.get("/users?role=STAFF"),
        axiosClient.get("/shifts"),
        staffShiftApi.getAll(),
      ]);
      setLoadError("");
      setStaffUsers(unwrapApiData(usersRes.data, []));
      setShifts(unwrapApiData(shiftsRes.data, []));
      setStaffShifts(unwrapApiData(staffShiftsRes.data, []));
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
        <ManagerStatCard icon={ShieldCheck} label="Ready to Assign" value={canAssign ? "Yes" : "No"} hint="Depends on staff users and shift templates" tone="amber" />
      </ManagerStatsRow>

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

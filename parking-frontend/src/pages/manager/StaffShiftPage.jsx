import { useState } from "react";

export default function StaffShiftPage() {
  const staffUsers = [
    { userId: 1, fullName: "Parking Staff 01" },
    { userId: 2, fullName: "Parking Staff 02" },
  ];

  const shifts = [
    {
      shiftId: 1,
      shiftName: "Morning Shift",
      startTime: "07:00",
      endTime: "15:00",
    },
    {
      shiftId: 2,
      shiftName: "Evening Shift",
      startTime: "15:00",
      endTime: "23:00",
    },
    {
      shiftId: 3,
      shiftName: "Night Shift",
      startTime: "23:00",
      endTime: "07:00",
    },
  ];

  const mockData = [
    {
      staffShiftId: 1,
      staffUserId: 1,
      staffName: "Parking Staff 01",
      shiftId: 1,
      shiftName: "Morning Shift",
      workingDate: "2026-06-06",
      time: "07:00 - 15:00",
      status: "Assigned",
    },
    {
      staffShiftId: 2,
      staffUserId: 2,
      staffName: "Parking Staff 02",
      shiftId: 2,
      shiftName: "Evening Shift",
      workingDate: "2026-06-06",
      time: "15:00 - 23:00",
      status: "Assigned",
    },
  ];

  const [staffShifts, setStaffShifts] = useState(mockData);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    staffUserId: "",
    shiftId: "",
    workingDate: "",
    status: "Assigned",
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      staffUserId: "",
      shiftId: "",
      workingDate: "",
      status: "Assigned",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const getStaffName = (staffUserId) => {
    const staff = staffUsers.find(
      (item) => item.userId === Number(staffUserId)
    );

    return staff ? staff.fullName : "";
  };

  const getShift = (shiftId) => {
    return shifts.find((item) => item.shiftId === Number(shiftId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.staffUserId || !form.shiftId || !form.workingDate) {
      alert("Staff, shift and working date are required");
      return;
    }

    const selectedShift = getShift(form.shiftId);

    const payload = {
      staffUserId: Number(form.staffUserId),
      shiftId: Number(form.shiftId),
      workingDate: form.workingDate,
      status: form.status,
    };

    const displayData = {
      staffName: getStaffName(payload.staffUserId),
      shiftName: selectedShift.shiftName,
      time: `${selectedShift.startTime} - ${selectedShift.endTime}`,
    };

    try {
      if (editingId) {
        setStaffShifts(
          staffShifts.map((item) =>
            item.staffShiftId === editingId
              ? {
                  ...item,
                  ...payload,
                  ...displayData,
                }
              : item
          )
        );
      } else {
        setStaffShifts([
          ...staffShifts,
          {
            staffShiftId: Date.now(),
            ...payload,
            ...displayData,
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save staff shift", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.staffShiftId);

    setForm({
      staffUserId: item.staffUserId,
      shiftId: item.shiftId,
      workingDate: item.workingDate,
      status: item.status,
    });
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to remove this staff shift?"
    );

    if (!confirmDelete) return;

    try {
      setStaffShifts(staffShifts.filter((item) => item.staffShiftId !== id));
    } catch (error) {
      console.error("Failed to delete staff shift", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Staff Shift Management</h1>
          <p>Manage staff working schedules and shifts</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update Staff Shift" : "Assign Staff Shift"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Staff</label>
              <select
                name="staffUserId"
                value={form.staffUserId}
                onChange={handleChange}
              >
                <option value="">Select staff</option>
                {staffUsers.map((item) => (
                  <option key={item.userId} value={item.userId}>
                    {item.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Shift</label>
              <select
                name="shiftId"
                value={form.shiftId}
                onChange={handleChange}
              >
                <option value="">Select shift</option>
                {shifts.map((item) => (
                  <option key={item.shiftId} value={item.shiftId}>
                    {item.shiftName} ({item.startTime} - {item.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Working Date</label>
              <input
                type="date"
                name="workingDate"
                value={form.workingDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="Assigned">Assigned</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn">
                {editingId ? "Update" : "Assign"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Staff</th>
                <th>Shift</th>
                <th>Working Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {staffShifts.map((item) => (
                <tr key={item.staffShiftId}>
                  <td>{item.staffShiftId}</td>
                  <td>{item.staffName}</td>
                  <td>{item.shiftName}</td>
                  <td>{item.workingDate}</td>
                  <td>{item.time}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === "Assigned"
                          ? "info"
                          : item.status === "Completed"
                          ? "success"
                          : "warning"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-btn"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>

                    <button
                      className="text-btn danger"
                      onClick={() => handleDelete(item.staffShiftId)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { userApi } from "../../api/admin/userApi";

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    role: "DRIVER",
    status: "Active",
  });

  const mockData = [
    {
      userId: 1,
      username: "admin01",
      fullName: "System Administrator",
      email: "admin@gmail.com",
      phone: "0900000001",
      role: "ADMIN",
      status: "Active",
    },
    {
      userId: 2,
      username: "manager01",
      fullName: "Parking Manager",
      email: "manager@gmail.com",
      phone: "0900000002",
      role: "MANAGER",
      status: "Active",
    },
    {
      userId: 3,
      username: "staff01",
      fullName: "Parking Staff",
      email: "staff@gmail.com",
      phone: "0900000003",
      role: "STAFF",
      status: "Active",
    },
    {
      userId: 4,
      username: "driver01",
      fullName: "Parking User",
      email: "driver@gmail.com",
      phone: "0900000004",
      role: "DRIVER",
      status: "Locked",
    },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Sau này mở khi Backend có API:
      // const res = await userApi.getAll();
      // setUsers(res.data.data);

      setUsers(mockData);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      username: "",
      fullName: "",
      email: "",
      phone: "",
      role: "DRIVER",
      status: "Active",
    });
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username.trim() || !form.fullName.trim() || !form.email.trim()) {
      alert("Username, full name and email are required");
      return;
    }

    const payload = {
      username: form.username,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      role: form.role,
      status: form.status,
    };

    try {
      if (editingId) {
        // await userApi.update(editingId, payload);

        setUsers(
          users.map((item) =>
            item.userId === editingId ? { ...item, ...payload } : item
          )
        );
      } else {
        // await userApi.create(payload);

        setUsers([
          ...users,
          {
            userId: Date.now(),
            ...payload,
          },
        ]);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save user", error);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.userId);

    setForm({
      username: item.username,
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      role: item.role,
      status: item.status,
    });
  };

  const handleToggleLock = async (item) => {
    try {
      if (item.status === "Locked") {
        // await userApi.unlock(item.userId);

        setUsers(
          users.map((user) =>
            user.userId === item.userId ? { ...user, status: "Active" } : user
          )
        );
      } else {
        // await userApi.lock(item.userId);

        setUsers(
          users.map((user) =>
            user.userId === item.userId ? { ...user, status: "Locked" } : user
          )
        );
      }
    } catch (error) {
      console.error("Failed to update user status", error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage users, roles and account status</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>{editingId ? "Update User" : "Add User"}</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter username"
              />
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter full name"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email"
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone"
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange}>
                <option value="DRIVER">DRIVER</option>
                <option value="STAFF">STAFF</option>
                <option value="MANAGER">MANAGER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Active">Active</option>
                <option value="Locked">Locked</option>
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn">
                {editingId ? "Update" : "Create"}
              </button>

              {editingId && (
                <button type="button" className="secondary-btn" onClick={resetForm}>
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
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.map((item) => (
                <tr key={item.userId}>
                  <td>{item.userId}</td>
                  <td>{item.username}</td>
                  <td>{item.fullName}</td>
                  <td>{item.email}</td>
                  <td>{item.phone}</td>
                  <td>
                    <span className="badge info">{item.role}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === "Active" ? "success" : "warning"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button className="text-btn" onClick={() => handleEdit(item)}>
                      Edit
                    </button>

                    <button
                      className="text-btn danger"
                      onClick={() => handleToggleLock(item)}
                    >
                      {item.status === "Locked" ? "Unlock" : "Lock"}
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
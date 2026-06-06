import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveAuth } from "../../utils/auth";
import { authApi } from "../../api/authApi";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectByRole = (role) => {
    if (role === "DRIVER") navigate("/driver");
    else if (role === "STAFF") navigate("/staff");
    else if (role === "MANAGER") navigate("/manager");
    else if (role === "ADMIN") navigate("/admin");
    else navigate("/login");
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authApi.login(form);

      const data = res.data.data;

      saveAuth({
        token: data.token,
        role: data.role,
        username: data.username,
      });

      redirectByRole(data.role);
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Login</h1>
        <p>Parking Building Management System</p>

        {error && <div className="error-message">{error}</div>}

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
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
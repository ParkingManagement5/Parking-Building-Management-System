import { useState } from "react";
import { saveToken, saveRole } from "../../utils/auth";

export default function LoginPage() {
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // TEST ROLE

    if (form.username === "admin") {
      saveToken("demo-token");
      saveRole("ADMIN");
      window.location.href = "/admin";
      return;
    }

    if (form.username === "manager") {
      saveToken("demo-token");
      saveRole("MANAGER");
      window.location.href = "/manager";
      return;
    }

    if (form.username === "staff") {
      saveToken("demo-token");
      saveRole("STAFF");
      window.location.href = "/staff";
      return;
    }

    saveToken("demo-token");
    saveRole("DRIVER");
    window.location.href = "/driver";
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Login</h1>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="primary-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
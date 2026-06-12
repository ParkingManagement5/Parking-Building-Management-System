import { useState } from "react";
import { authApi } from "../../api/auth/authApi";
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

    try {
      const res = await authApi.login(form);

      const userData = res.data.data;
      const token = userData.token;
      const role = userData.roles?.[0]?.replace("ROLE_", "");

      saveToken(token);
      saveRole(role);

      if (role === "ADMIN") {
        window.location.href = "/admin";
      } else if (role === "MANAGER") {
        window.location.href = "/manager";
      } else if (role === "STAFF") {
        window.location.href = "/staff";
      } else {
        window.location.href = "/driver";
      }
    } catch (error) {
      console.error(error);
      alert("Sai username hoặc password");
    }
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
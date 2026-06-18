import { useState } from "react";
import { authApi } from "../../api/auth/authApi";
import { saveRole, saveToken, saveUserId, saveUsername } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";

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

      const userData = unwrapApiData(res.data, null);
      if (!userData) {
        throw new Error("Login response is missing user data");
      }

      const token = userData.token;
      const role = userData.roles?.[0]?.replace("ROLE_", "");

      saveToken(token);
      saveRole(role);
      saveUserId(userData.userId);
      saveUsername(userData.username);

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
        <h1>Sign in</h1>

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
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

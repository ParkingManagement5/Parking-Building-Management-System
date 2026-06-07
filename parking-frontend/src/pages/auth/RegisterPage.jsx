import { useState } from "react";
import { authApi } from "../../api/auth/authApi";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    phone: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!form.username || !form.password || !form.fullName || !form.email) {
      alert("Please fill all required fields");
      return;
    }

    try {
      // await authApi.register(form);

      alert("Register successfully");
      window.location.href = "/login";
    } catch (error) {
      console.error("Register failed", error);
      alert("Register failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p>Register as parking user</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input name="email" value={form.email} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>

          <button className="primary-btn" type="submit">
            Register
          </button>
        </form>

        <p className="auth-link">
          Already have account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  );
}
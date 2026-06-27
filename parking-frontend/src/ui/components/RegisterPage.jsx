import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth/authApi";
import { usePublicTheme } from "../../utils/publicTheme";
import "../../assets/css/landing.css";
import "../../assets/css/auth.css";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { dark, toggle, className: themeClass } = usePublicTheme();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", fullName: "", email: "", phone: "", password: "", confirm: "" });

  const update = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const passwordStrength = useMemo(() => {
    if (!form.password) return 0;
    if (form.password.length >= 12) return 4;
    if (form.password.length >= 10) return 3;
    if (form.password.length >= 8) return 2;
    return 1;
  }, [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return;
    setLoading(true);
    setError("");
    try {
      await authApi.register({ username: form.username, fullName: form.fullName, email: form.email, phone: form.phone, password: form.password });
      navigate("/verify-email", { state: { username: form.username, email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || "Dang ky that bai. Vui long thu lai.");
    } finally { setLoading(false); }
  };

  return (
    <div className={`auth-layout ${themeClass}`}>
      {/* LEFT: form */}
      <div className="auth-left">
        <div className="auth-brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" className="nav-logo" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            <span className="nav-logo-mark">P</span>
            <span className="nav-logo-text">ParkSmart</span>
          </a>
          <button className="theme-toggle-btn" onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
        </div>

        <div className="auth-form-wrapper">
          <h1>Tao tai khoan</h1>
          <p className="auth-subtitle">Dang ky de bat dau su dung ParkSmart</p>

          {error && (
            <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.25)", color: "var(--danger)", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input id="username" required value={form.username} onChange={update("username")} placeholder="username" />
              </div>
              <div className="form-group">
                <label htmlFor="fullName">Ho ten *</label>
                <input id="fullName" required value={form.fullName} onChange={update("fullName")} placeholder="Nguyen Van A" />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input id="email" type="email" required value={form.email} onChange={update("email")} placeholder="email@example.com" />
            </div>

            <div className="form-group">
              <label htmlFor="phone">So dien thoai</label>
              <input id="phone" value={form.phone} onChange={update("phone")} placeholder="0909 123 456" />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mat khau *</label>
              <div className="input-password">
                <input id="password" type={showPw ? "text" : "password"} required value={form.password} onChange={update("password")} placeholder="Toi thieu 8 ky tu" />
                <button type="button" className="toggle-pw" onClick={() => setShowPw((v) => !v)}>
                  {showPw ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {form.password && (
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} style={{
                      flex: 1, height: 5, borderRadius: 3,
                      background: passwordStrength >= level
                        ? passwordStrength >= 4 ? "var(--accent)" : "var(--warning)"
                        : "var(--border)",
                      transition: "background 0.3s",
                    }} />
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirm">Xac nhan mat khau *</label>
              <div className="input-password">
                <input id="confirm" type={showConfirm ? "text" : "password"} required value={form.confirm} onChange={update("confirm")} placeholder="Nhap lai mat khau"
                  style={form.confirm && form.confirm !== form.password ? { borderColor: "var(--danger)" } : {}} />
                <button type="button" className="toggle-pw" onClick={() => setShowConfirm((v) => !v)}>
                  {showConfirm ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {form.confirm && form.confirm !== form.password && (
                <p style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: 4 }}>Mat khau khong khop.</p>
              )}
            </div>

            <button type="submit" className="btn btn-accent btn-full btn-lg" disabled={loading || (!!form.confirm && form.confirm !== form.password)}>
              {loading ? "Dang tao tai khoan..." : "Dang ky"}
            </button>
          </form>

          <p className="auth-footer-text">
            Da co tai khoan?{" "}
            <button type="button" className="text-link" onClick={() => navigate("/login")}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}>
              Dang nhap
            </button>
          </p>
        </div>
      </div>

      {/* RIGHT: stats */}
      <div className="auth-right">
        <div className="auth-illustration">
          <div className="auth-stat-block">
            <div className="auth-stat-header">
              <h3>Quyen loi thanh vien</h3>
            </div>
            <div className="auth-activity-list">
              {[
                { icon: "✓", color: "var(--accent)", text: "Dat cho truoc, giu slot", time: "Booking" },
                { icon: "⚡", color: "#60a5fa", text: "Scan QR vao/ra nhanh", time: "QR Code" },
                { icon: "📱", color: "#a78bfa", text: "Theo doi xe realtime", time: "Tracking" },
                { icon: "$", color: "#f59e0b", text: "Thanh toan online tien loi", time: "Payment" },
              ].map((item, i) => (
                <div key={i} className="auth-activity-item">
                  <span className="auth-activity-icon" style={{ background: `${item.color}22`, color: item.color }}>{item.icon}</span>
                  <div>
                    <strong>{item.text}</strong>
                    <small>{item.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-stat-block" style={{ marginTop: 16 }}>
            <div className="auth-stat-header">
              <h3>Thong ke</h3>
              <span className="auth-live-badge"><span className="auth-live-dot" /> Live</span>
            </div>
            <div className="auth-stat-grid">
              <div className="auth-stat-item">
                <span className="auth-stat-value" style={{ color: "var(--accent)" }}>72</span>
                <span className="auth-stat-label">Slot</span>
              </div>
              <div className="auth-stat-item">
                <span className="auth-stat-value" style={{ color: "#60a5fa" }}>5</span>
                <span className="auth-stat-label">Tai khoan</span>
              </div>
              <div className="auth-stat-item">
                <span className="auth-stat-value" style={{ color: "#f97316" }}>99%</span>
                <span className="auth-stat-label">Uptime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

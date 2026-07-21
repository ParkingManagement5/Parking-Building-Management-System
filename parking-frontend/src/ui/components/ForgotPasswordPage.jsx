import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth/authApi";
import { usePublicTheme } from "../../utils/publicTheme";
import "../../assets/css/landing.css";
import "../../assets/css/auth.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { dark, toggle, className: themeClass } = usePublicTheme();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      await authApi.forgotPassword({ email });
      setMessage("Mã OTP đã được gửi qua email của bạn.");
      setStep("reset");
    } catch (err) { setError(err.response?.data?.message || "Không gửi được OTP."); }
    finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    setResending(true); setError("");
    try {
      await authApi.forgotPassword({ email });
      setMessage("Đã gửi lại mã OTP mới.");
    } catch (err) { setError(err.response?.data?.message || "Không gửi lại được OTP."); }
    finally { setResending(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    if (newPassword !== confirmPassword) { setError("Mật khẩu xác nhận không khớp."); setLoading(false); return; }
    try {
      await authApi.resetPassword({ email, otp, newPassword, confirmPassword });
      setStep("success");
    } catch (err) { setError(err.response?.data?.message || "Đặt lại mật khẩu thất bại."); }
    finally { setLoading(false); }
  };

  return (
    <div className={`auth-layout ${themeClass}`}>
      {/* LEFT */}
      <div className="auth-left">
        <div className="auth-brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" className="nav-logo" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            <span className="nav-logo-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></span>
            <span className="nav-logo-text">ParkSmart</span>
          </a>
          <button className="theme-toggle-btn" onClick={toggle} title={dark ? "Chế độ sáng" : "Chế độ tối"}>
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
        </div>

        <div className="auth-form-wrapper">
          {/* STEP: EMAIL */}
          {step === "email" && (
            <>
              <h1>Quên mật khẩu?</h1>
              <p className="auth-subtitle">Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.</p>

              {error && <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.25)", color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div>}

              <form className="auth-form" onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <button type="submit" className="btn btn-accent btn-full btn-lg" disabled={loading || !email}>
                  {loading ? "Đang gửi..." : "Gửi mã OTP"}
                </button>
              </form>

              <p className="auth-footer-text" style={{ marginTop: 20 }}>
                <button type="button" className="text-link" onClick={() => navigate("/login")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}>
                  ← Quay lại đăng nhập
                </button>
              </p>
            </>
          )}

          {/* STEP: RESET */}
          {step === "reset" && (
            <>
              <h1>Đặt lại mật khẩu</h1>
              <p className="auth-subtitle">{message || "Nhập mã OTP từ email và mật khẩu mới."}</p>

              {error && <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.25)", color: "var(--danger)", fontSize: "0.85rem" }}>{error}</div>}

              <form className="auth-form" onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label htmlFor="otp">Mã OTP</label>
                  <input id="otp" required inputMode="numeric" maxLength={6} value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456" style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.3em", fontFamily: "'JetBrains Mono', monospace" }} />
                </div>
                <div className="form-group">
                  <label htmlFor="newPw">Mật khẩu mới</label>
                  <div className="input-password">
                    <input id="newPw" type={showPw ? "text" : "password"} required minLength={6} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" />
                    <button type="button" className="toggle-pw" onClick={() => setShowPw((v) => !v)}>
                      {showPw ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPw">Xác nhận mật khẩu</label>
                  <input id="confirmPw" type={showPw ? "text" : "password"} required minLength={6} value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới"
                    style={confirmPassword && confirmPassword !== newPassword ? { borderColor: "var(--danger)" } : {}} />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: 4 }}>Mật khẩu không khớp.</p>
                  )}
                </div>
                <button type="submit" className="btn btn-accent btn-full btn-lg" disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}>
                  {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                </button>
              </form>

              <p className="auth-footer-text" style={{ marginTop: 16 }}>
                <button type="button" className="text-link" onClick={handleResendOtp} disabled={resending}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}>
                  {resending ? "Đang gửi..." : "Gửi lại mã OTP"}
                </button>
              </p>
            </>
          )}

          {/* STEP: SUCCESS */}
          {step === "success" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "1.5rem" }}>✓</div>
              <h1>Đặt lại thành công!</h1>
              <p className="auth-subtitle">Mật khẩu đã được đổi. Bạn có thể đăng nhập ngay.</p>
              <button className="btn btn-accent btn-full btn-lg" onClick={() => navigate("/login")} style={{ marginTop: 20 }}>
                Đăng nhập ngay
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="auth-right">
        <div className="auth-illustration">
          <div className="auth-stat-block">
            <div className="auth-stat-header"><h3>Hướng dẫn</h3></div>
            <div className="auth-activity-list">
              {[
                { icon: "1", color: step === "email" ? "var(--accent)" : "#60a5fa", text: "Nhập email đã đăng ký", time: "Bước 1" },
                { icon: "2", color: step === "reset" ? "var(--accent)" : "#60a5fa", text: "Nhận mã OTP qua email", time: "Bước 2" },
                { icon: "3", color: step === "success" ? "var(--accent)" : "#60a5fa", text: "Nhập OTP và mật khẩu mới", time: "Bước 3" },
              ].map((item, i) => (
                <div key={i} className="auth-activity-item" style={
                  (step === "email" && i === 0) || (step === "reset" && i === 1) || (step === "success" && i === 2)
                    ? { borderColor: "var(--accent)", borderWidth: 1, borderStyle: "solid" } : {}
                }>
                  <span className="auth-activity-icon" style={{ background: `${item.color}22`, color: item.color }}>{item.icon}</span>
                  <div><strong>{item.text}</strong><small>{item.time}</small></div>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-stat-block" style={{ marginTop: 16 }}>
            <div className="auth-stat-header"><h3>Bảo mật</h3></div>
            <div className="auth-activity-list">
              <div className="auth-activity-item">
                <span className="auth-activity-icon" style={{ background: "rgba(0,230,118,0.12)", color: "var(--accent)" }}>🔒</span>
                <div><strong>Mã OTP hết hạn sau 10 phút</strong><small>An toàn</small></div>
              </div>
              <div className="auth-activity-item">
                <span className="auth-activity-icon" style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>🛡</span>
                <div><strong>Mật khẩu mã hóa BCrypt</strong><small>Bảo mật</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

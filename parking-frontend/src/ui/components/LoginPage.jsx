import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth/authApi";
import { usePublicTheme } from "../../utils/publicTheme";
import "../../assets/css/landing.css";
import "../../assets/css/auth.css";

function routeForRole(rawRole) {
  const role = rawRole.toString().replace("ROLE_", "").toUpperCase();

  return role.includes("ADMIN")
    ? "/admin"
    : role.includes("MANAGER")
      ? "/manager"
      : role.includes("STAFF")
        ? "/staff"
        : "/driver";
}

function saveAuthData(data) {
  const token = data.token || data.accessToken || data.jwt;
  const rawRole =
    data.role || data.roleName || data.roles?.[0] || data.user?.role || data.user?.roles?.[0] || "DRIVER";
  const role = rawRole.toString().replace("ROLE_", "").toUpperCase();

  if (token) localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  if (data.userId || data.user?.userId || data.user?.id) {
    localStorage.setItem("userId", data.userId || data.user?.userId || data.user?.id);
  }
  if (data.username || data.user?.username) {
    localStorage.setItem("username", data.username || data.user?.username);
  }
  if (data.assignedBuildingId) {
    localStorage.setItem("assignedBuildingId", data.assignedBuildingId);
    localStorage.setItem("assignedBuildingName", data.assignedBuildingName || "");
  } else {
    localStorage.removeItem("assignedBuildingId");
    localStorage.removeItem("assignedBuildingName");
  }

  return routeForRole(role);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { dark, toggle, className: themeClass } = usePublicTheme();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const isLocalhost = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !isLocalhost) return;

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response?.credential) {
            setError("Google login did not return a credential.");
            return;
          }

          setGoogleLoading(true);
          setError("");
          try {
            const res = await authApi.googleLogin({ credential: response.credential });
            const data = res.data?.data || res.data || {};
            navigate(saveAuthData(data));
          } catch (err) {
            setError(err.response?.data?.message || "Google login failed.");
          } finally {
            setGoogleLoading(false);
          }
        },
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const existingScript = document.querySelector("script[src='https://accounts.google.com/gsi/client']");
    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle, { once: true });
      return () => existingScript.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => {
      console.warn("Google login script failed to load");
    };
    document.head.appendChild(script);
  }, [navigate, isLocalhost]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authApi.login({
        username: form.username,
        password: form.password,
      });

      const data = res.data?.data || res.data || {};
      navigate(saveAuthData(data));
    } catch (err) {
      setError(err.response?.data?.message || "Dang nhap that bai. Vui long kiem tra tai khoan hoac mat khau.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!isLocalhost) {
      setError("Google login chi ho tro tren localhost. Hay dang nhap bang username/password.");
      return;
    }
    if (window.google?.accounts?.id) {
      setError("");
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          if (reason === "opt_out_or_no_session") {
            setError("Chua dang nhap Google tren trinh duyet. Hay dang nhap Google truoc hoac dung username/password.");
          } else {
            setError("Google login khong kha dung. Hay dang nhap bang username/password.");
          }
        } else if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
          setError("Google login bi huy. Vui long thu lai.");
        }
      });
    }
  };

  return (
    <div className={`auth-layout ${themeClass}`}>
      {/* ---- LEFT: brand + form ---- */}
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
          <h1>Chao mung tro lai</h1>
          <p className="auth-subtitle">Dang nhap de quan ly bai do xe cua ban</p>

          {error && (
            <div style={{
              marginBottom: 16,
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(255,77,77,0.1)",
              border: "1px solid rgba(255,77,77,0.25)",
              color: "var(--danger)",
              fontSize: "0.85rem",
            }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="operator@pbms.local"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Mat khau
                <button
                  type="button"
                  className="form-link"
                  onClick={() => navigate("/forgot-password")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                >
                  Quen mat khau?
                </button>
              </label>
              <div className="input-password">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Nhap mat khau"
                />
                <button
                  type="button"
                  className="toggle-pw"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-check">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">Ghi nho dang nhap</label>
            </div>

            <button type="submit" className="btn btn-accent btn-full btn-lg" disabled={loading}>
              {loading ? "Dang dang nhap..." : "Dang nhap"}
            </button>
          </form>

          <div className="auth-divider"><span>hoac</span></div>

          <button
            type="button"
            className="social-btn"
            disabled={(!googleReady && isLocalhost) || googleLoading}
            onClick={handleGoogleLogin}
          >
            {googleLoading ? (
              "Dang dang nhap..."
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Dang nhap voi Google
              </>
            )}
          </button>

          <p className="auth-footer-text">
            Chua co tai khoan?{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => navigate("/register")}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}
            >
              Dang ky ngay
            </button>
          </p>
        </div>
      </div>

      {/* ---- RIGHT: illustration cards ---- */}
      <div className="auth-right">
        <div className="auth-illustration">
          <div className="float-card card-1">
            <span className="fc-icon green">&#10003;</span>
            <div>
              <strong>Xe 29A-123.45</strong>
              <small>Da vao bai - Tang 2</small>
            </div>
          </div>
          <div className="float-card card-2">
            <span className="fc-icon blue">P</span>
            <div>
              <strong>128 cho trong</strong>
              <small>Cap nhat 2 phut truoc</small>
            </div>
          </div>
          <div className="float-card card-3">
            <span className="fc-icon purple">$</span>
            <div>
              <strong>12.5M VND</strong>
              <small>Doanh thu hom nay</small>
            </div>
          </div>
          <div className="auth-quote">
            <p>"ParkSmart giup chung toi tang 40% hieu suat van hanh bai do xe."</p>
            <span>- Nguyen Van A, Quan ly bai xe Times City</span>
          </div>
        </div>
      </div>
    </div>
  );
}

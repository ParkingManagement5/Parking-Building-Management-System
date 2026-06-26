import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CarFront,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { authApi } from "../../api/auth/authApi";
import BrandLogo from "./BrandLogo";
import PublicBackLink from "./PublicBackLink";

const INITIAL_ACTIVITIES = [
  { icon: ShieldCheck, text: "Access granted", time: "Now" },
  { icon: CarFront, text: "Bay 12 ready", time: "2 min" },
  { icon: Activity, text: "Payment cleared", time: "5 min" },
];

const LIVE_ACTIVITIES = [
  { icon: Activity, text: "Sensors synced", time: "Now" },
  { icon: CarFront, text: "Zone 3 peak", time: "Now" },
  { icon: ShieldCheck, text: "Security pass", time: "Now" },
];

const FLOW_BARS = [20, 40, 85, 60, 30, 50, 90, 25];

function BrandMark() {
  return <BrandLogo size="hero" />;
}

function OccupancyMap() {
  return (
    <div className="group relative h-52 overflow-hidden rounded-2xl border border-white/10 bg-[#111827]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-5 rounded-2xl border border-white/10 bg-white/5" />
      <div className="absolute left-[18%] top-[18%] h-14 w-16 rounded-md border border-white/10 bg-white/8" />
      <div className="absolute left-[38%] top-[22%] h-12 w-20 rounded-md border border-white/10 bg-white/7" />
      <div className="absolute right-[18%] top-[18%] h-16 w-14 rounded-md border border-white/10 bg-white/7" />
      <div className="absolute bottom-[20%] left-[22%] h-14 w-20 rounded-md border border-white/10 bg-white/7" />
      <div className="absolute bottom-[18%] right-[22%] h-12 w-16 rounded-md border border-white/10 bg-white/7" />
      <div className="absolute left-[8%] top-[48%] h-px w-24 rotate-[22deg] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {[
        { left: "16%", top: "20%", tone: "bg-red-500" },
        { left: "32%", top: "50%", tone: "bg-red-500" },
        { left: "74%", top: "68%", tone: "bg-emerald-500" },
        { left: "66%", top: "28%", tone: "bg-blue-500" },
      ].map((marker, index) => (
        <div key={index} className="absolute flex items-center justify-center" style={{ left: marker.left, top: marker.top }}>
          <span className={`absolute size-4 rounded-full ${marker.tone} opacity-20 animate-ping`} />
          <span className={`relative size-2 rounded-full ${marker.tone} ring-2 ring-white`} />
        </div>
      ))}
    </div>
  );
}

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

  return routeForRole(role);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [occupancy, setOccupancy] = useState(0);
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    let frameId;
    let current = 0;
    const target = 84;

    const tick = () => {
      const increment = Math.ceil((target - current) / 10);
      if (current < target) {
        current += increment;
        if (current > target) current = target;
        setOccupancy(current);
        frameId = window.requestAnimationFrame(tick);
      }
    };

    const timer = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(tick);
    }, 400);

    return () => {
      window.clearTimeout(timer);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      const next = LIVE_ACTIVITIES[Math.floor(Math.random() * LIVE_ACTIVITIES.length)];
      setActivities((previous) => [next, ...previous].slice(0, 5));
    }, 8000);

    return () => window.clearInterval(interval);
  }, []);

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

  const averageSectors = useMemo(() => 12, []);

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8fafc] font-sans text-[#1b1b1d] transition-colors selection:bg-slate-200 selection:text-slate-950 dark:bg-[#0b1120] dark:text-[#e5eef9]">
      <div className="fixed inset-0 pointer-events-none opacity-70 dark:opacity-90">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(192,198,219,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(214,224,244,0.28),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.12),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(transparent_23px,rgba(229,226,227,0.24)_24px),linear-gradient(90deg,transparent_23px,rgba(229,226,227,0.24)_24px)] bg-[size:24px_24px] dark:bg-[linear-gradient(transparent_23px,rgba(255,255,255,0.04)_24px),linear-gradient(90deg,transparent_23px,rgba(255,255,255,0.04)_24px)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <section className="hidden w-[52%] flex-col overflow-hidden border-r border-slate-200 px-10 py-10 dark:border-white/10 lg:flex xl:px-14">
          <div className="flex items-center justify-between gap-4 animate-[fadeIn_.6s_ease-out]">
            <BrandMark />
            <PublicBackLink />
          </div>

          <div className="mt-12 grid grid-cols-2 gap-5">
            <div className="col-span-2 rounded-2xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-semibold tracking-[-0.01em] text-slate-950 dark:text-white">Live Occupancy</h3>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-70 animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-100">Live</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="mb-1 text-[56px] font-extrabold leading-none tabular-nums text-slate-950 dark:text-white">{occupancy}%</div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-200">{averageSectors} active sectors</p>
                </div>
                <div className="col-span-2">
                  <OccupancyMap />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-200">Vehicle Flow</h4>
              <div className="flex h-32 items-end justify-between gap-1">
                {FLOW_BARS.map((height, index) => (
                  <div
                    key={index}
                    className="w-full origin-bottom rounded-t-sm bg-gradient-to-t from-[#1d4ed8] to-[#60a5fa] transition-transform duration-1000 dark:bg-slate-200"
                    style={{
                      height: `${height}%`,
                      opacity: Math.max(0.18, height / 100),
                      transform: `scaleY(${occupancy > 0 ? 1 : 0})`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-between text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-300">
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-200">Activity</h4>
              <div className="space-y-4 overflow-y-auto">
                {activities.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={`${activity.text}-${index}`} className="flex items-start gap-4 border-b border-slate-200/80 pb-3 dark:border-white/10">
                      <Icon size={18} className="mt-0.5 text-blue-600 dark:text-slate-100" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.text}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-300">{activity.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="flex w-full items-center justify-center bg-white/60 p-6 backdrop-blur-md dark:bg-slate-950/20 lg:w-[48%] lg:bg-transparent lg:p-10 lg:backdrop-blur-none xl:p-14">
          <div className="w-full max-w-[560px]">
            <div className="mb-12 lg:hidden">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <BrandMark />
                <PublicBackLink />
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-200">Sign in</p>
              <h1 className="text-5xl font-bold leading-[1.02] tracking-[-0.035em] text-slate-950 dark:text-white xl:text-6xl">Welcome Back</h1>
            </div>

            {error ? (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6 rounded-[28px] border border-slate-200 bg-white/96 p-8 shadow-[0_26px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-10">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Username or Email
                </label>
                <div className="relative">
                  <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="username"
                    type="text"
                    required
                    value={form.username}
                    onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))}
                    placeholder="operator@pbms.local"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                    Password
                  </label>
                  <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm font-medium text-[#2563eb] transition-colors hover:text-blue-700 dark:text-blue-200 dark:hover:text-blue-100">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPw ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                    placeholder="********"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 pr-12 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    onClick={() => setShowPw((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-2xl border border-transparent bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-base font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition-all duration-200 hover:from-[#1d4ed8] hover:to-[#4338ca] hover:shadow-[0_16px_36px_rgba(37,99,235,0.32)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300/70" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#f8fafc] px-4 text-sm uppercase tracking-[0.16em] text-slate-400 dark:bg-[#0b1120] dark:text-slate-300">Or</span>
              </div>
            </div>

            <button
              type="button"
              disabled={(!googleReady && isLocalhost) || googleLoading}
              onClick={() => {
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
              }}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white text-base font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {googleLoading ? (
                "Dang dang nhap..."
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                No account?{" "}
                <button onClick={() => navigate("/register")} className="font-medium text-primary hover:underline">
                  Create one
                </button>
              </p>
            </div>

            <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 opacity-70">
              <span className="text-sm text-slate-500 dark:text-slate-400">© 2026 ParkSmart</span>
              <div className="flex gap-4">
                <button type="button" className="text-sm text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">
                  Privacy
                </button>
                <button type="button" className="text-sm text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100">
                  Terms
                </button>
              </div>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

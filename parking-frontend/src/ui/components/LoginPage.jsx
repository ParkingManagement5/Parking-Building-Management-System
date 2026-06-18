import { useEffect, useMemo, useState } from "react";
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

function SocialButton({ children, icon }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/92 px-4 py-3 text-sm font-medium text-slate-700 transition duration-200 hover:border-slate-400 hover:bg-white hover:shadow-sm active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
    >
      {icon}
      {children}
    </button>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

      const nextRoute = role.includes("ADMIN")
        ? "/admin"
        : role.includes("MANAGER")
          ? "/manager"
          : role.includes("STAFF")
            ? "/staff"
            : "/driver";

      navigate(nextRoute);
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
                  <button type="button" className="text-sm font-medium text-[#2563eb] transition-colors hover:text-blue-700 dark:text-blue-200 dark:hover:text-blue-100">
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

            <div className="grid grid-cols-1 gap-4">
              <SocialButton
                icon={
                  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5Z" />
                    <path fill="#FF3D00" d="M6.3 14.7 12.9 19.5C14.7 15 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.4 4 24 4c-7.7 0-14.3 4.3-17.7 10.7Z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44Z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.2-5.9 6.6l.1-.1 6.2 5.2C35.3 40 44 34 44 24c0-1.3-.1-2.3-.4-3.5Z" />
                  </svg>
                }
              >
                Google
              </SocialButton>
            </div>

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

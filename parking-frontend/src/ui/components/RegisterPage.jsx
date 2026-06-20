import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CarFront,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { authApi } from "../../api/auth/authApi";
import BrandLogo from "./BrandLogo";
import PublicBackLink from "./PublicBackLink";

const INITIAL_ACTIVITIES = [
  { icon: ShieldCheck, text: "Driver access ready", time: "Now" },
  { icon: CarFront, text: "Driver linked", time: "4 min" },
  { icon: Activity, text: "Profile queued", time: "8 min" },
];
const LIVE_ACTIVITIES = [
  { icon: Activity, text: "Identity checked", time: "Now" },
  { icon: CarFront, text: "Vehicle linked", time: "Now" },
  { icon: ShieldCheck, text: "Driver role active", time: "Now" },
];
const FLOW_BARS = [26, 42, 78, 58, 34, 48, 86, 38];

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
        { left: "32%", top: "50%", tone: "bg-blue-500" },
        { left: "74%", top: "68%", tone: "bg-emerald-500" },
        { left: "66%", top: "28%", tone: "bg-amber-500" },
      ].map((marker, index) => (
        <div key={index} className="absolute flex items-center justify-center" style={{ left: marker.left, top: marker.top }}>
          <span className={`absolute size-4 rounded-full ${marker.tone} opacity-20 animate-ping`} />
          <span className={`relative size-2 rounded-full ${marker.tone} ring-2 ring-white`} />
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES);
  const [provisioning, setProvisioning] = useState(0);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });

  const update = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  useEffect(() => {
    let frameId;
    let current = 0;
    const target = 96;

    const tick = () => {
      const increment = Math.ceil((target - current) / 10);
      if (current < target) {
        current += increment;
        if (current > target) current = target;
        setProvisioning(current);
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
    if (form.password !== form.confirm) return;

    setLoading(true);
    setError("");

    try {
      await authApi.register({
        username: form.username,
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      navigate("/verify-email", {
        state: {
          username: form.username,
          email: form.email,
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Dang ky that bai. Vui long thu lai.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = useMemo(() => {
    if (!form.password) return 0;
    if (form.password.length >= 12) return 4;
    if (form.password.length >= 10) return 3;
    if (form.password.length >= 8) return 2;
    return 1;
  }, [form.password]);

  if (done) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[560px] items-center justify-center">
          <div className="w-full rounded-[28px] border border-slate-200 bg-white/96 p-10 text-center shadow-[0_26px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
              <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-300" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Account created</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Your account is created. Please verify your email before signing in.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => navigate("/")}
                className="flex-1 rounded-2xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                Back to public
              </button>
              <button
                onClick={() => navigate("/login")}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Sign in now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <h3 className="text-2xl font-semibold tracking-[-0.01em] text-slate-950 dark:text-white">Provisioning</h3>
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
                  <div className="mb-1 text-[56px] font-extrabold leading-none tabular-nums text-slate-950 dark:text-white">{provisioning}%</div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-200">Driver account ready</p>
                </div>
                <div className="col-span-2">
                  <OccupancyMap />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-200">Driver Access</h4>
              <div className="flex h-32 items-end justify-between gap-1">
                {FLOW_BARS.map((height, index) => (
                  <div
                    key={index}
                    className="w-full origin-bottom rounded-t-sm bg-gradient-to-t from-[#4338ca] to-[#818cf8] transition-transform duration-1000 dark:bg-slate-200"
                    style={{
                      height: `${height}%`,
                      opacity: Math.max(0.18, height / 100),
                      transform: `scaleY(${provisioning > 0 ? 1 : 0})`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-between text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-300">
                <span>Register</span>
                <span>Verify</span>
                <span>Access</span>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-200">Activity</h4>
              <div className="space-y-4 overflow-y-auto">
                {activities.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={`${activity.text}-${index}`} className="flex items-start gap-4 border-b border-slate-200/80 pb-3 dark:border-white/10">
                      <Icon size={18} className="mt-0.5 text-indigo-600 dark:text-slate-100" />
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
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-200">Register</p>
            </div>

            {error ? (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit}
              className="space-y-6 rounded-[28px] border border-slate-200 bg-white/96 p-8 shadow-[0_26px_60px_rgba(15,23,42,0.10)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-10"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                    Username
                  </label>
                  <div className="relative">
                    <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="username"
                      required
                      value={form.username}
                      onChange={update("username")}
                      placeholder="jdoe123"
                      className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="fullName"
                      required
                      value={form.fullName}
                      onChange={update("fullName")}
                      placeholder="John Doe"
                      className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Email
                </label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={update("email")}
                    placeholder="john@example.com"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Phone
                </label>
                <div className="relative">
                  <Phone size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={update("phone")}
                    placeholder="+1 555 0100"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    required
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={update("password")}
                    placeholder="Minimum 8 characters"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 pr-12 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {form.password ? (
                  <div className="mt-2 flex gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level
                            ? passwordStrength >= 4
                              ? "bg-emerald-500"
                              : "bg-amber-400"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Confirm Password
                </label>
                <div className="relative">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm"
                    required
                    type={showConfirm ? "text" : "password"}
                    value={form.confirm}
                    onChange={update("confirm")}
                    placeholder="Re-enter your password"
                    className={`h-14 w-full rounded-2xl border bg-white px-4 pl-11 pr-12 text-base text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:bg-white focus:ring-4 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400 dark:focus:bg-slate-900 ${
                      form.confirm && form.confirm !== form.password
                        ? "border-destructive focus:border-destructive focus:ring-destructive/10 dark:border-destructive"
                        : "border-slate-300 focus:border-[#2563eb] focus:ring-[#2563eb]/10 dark:border-white/10"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {form.confirm && form.confirm !== form.password ? (
                  <p className="text-xs text-destructive">Passwords do not match.</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={loading || (!!form.confirm && form.confirm !== form.password)}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-base font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition-all duration-200 hover:from-[#1d4ed8] hover:to-[#4338ca] hover:shadow-[0_16px_36px_rgba(37,99,235,0.32)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {loading ? (
                  <span className="size-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                ) : (
                  <>
                    Register
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Have an account?{" "}
                <button onClick={() => navigate("/login")} className="font-medium text-primary hover:underline">
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

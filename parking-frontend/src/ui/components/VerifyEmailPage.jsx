import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, MailCheck, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { authApi } from "../../api/auth/authApi";
import { unwrapApiData } from "../../utils/api";
import BrandLogo from "./BrandLogo";
import PublicBackLink from "./PublicBackLink";

function saveAuth(data) {
  const token = data.token || data.accessToken || data.jwt;
  const roleList = Array.isArray(data.roles)
    ? data.roles
    : Array.isArray(data.user?.roles)
      ? data.user.roles
      : [];
  const rawRole = data.role || data.roleName || roleList[0] || data.user?.roles?.[0] || "DRIVER";
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

  return role.includes("ADMIN")
    ? "/admin"
    : role.includes("MANAGER")
      ? "/manager"
      : role.includes("STAFF")
        ? "/staff"
        : "/driver";
}

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialUsername = location.state?.username || "";
  const initialEmail = location.state?.email || "";
  const [username, setUsername] = useState(initialUsername);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState(
    initialEmail
      ? `Chúng tôi đã gửi mã xác minh đến ${initialEmail}.`
      : "Nhập mã xác minh từ email của bạn."
  );
  const [error, setError] = useState("");

  const maskedEmail = useMemo(() => {
    if (!initialEmail || !initialEmail.includes("@")) return "";
    const [name, domain] = initialEmail.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }, [initialEmail]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authApi.verifyEmail({ username, otp });
      const data = unwrapApiData(res.data, {});
      const nextRoute = saveAuth(data);
      navigate(nextRoute);
    } catch (err) {
      setError(err.response?.data?.message || "Xác minh thất bại. Vui lòng kiểm tra lại mã OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");

    try {
      await authApi.resendVerification({ username });
      setMessage("Mã OTP mới đã được gửi. Vui lòng kiểm tra email.");
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi lại được mã OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8fafc] px-6 py-10 text-[#1b1b1d] dark:bg-[#0b1120] dark:text-[#e5eef9]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[1120px] flex-col">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo size="hero" />
          <PublicBackLink />
        </div>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden lg:block">
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-[0_26px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
                <ShieldCheck size={34} />
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white">
                Xác minh email của bạn
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-200">
                Tên đăng nhập dùng để đăng nhập. Xác minh email sẽ kích hoạt tài khoản và bảo vệ quy trình đặt chỗ.
              </p>
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                  Đăng nhập sau khi xác minh
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                  {username || "tên đăng nhập của bạn"} + mật khẩu
                </p>
                {maskedEmail ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{maskedEmail}</p> : null}
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-[560px]">
            <form
              onSubmit={handleVerify}
              className="space-y-6 rounded-[28px] border border-slate-200 bg-white/96 p-8 shadow-[0_26px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-10"
            >
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-200">
                  Mã OTP qua Email
                </p>
                <h2 className="text-3xl font-bold text-slate-950 dark:text-white">Nhập mã xác minh</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-200">{message}</p>
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="verify-username" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Tên đăng nhập hoặc Email
                </label>
                <div className="relative">
                  <UserRound size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="verify-username"
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-base text-slate-900 outline-none transition-all focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="verify-otp" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                  Mã OTP
                </label>
                <div className="relative">
                  <MailCheck size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="verify-otp"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-center text-2xl font-bold tracking-[0.35em] text-slate-900 outline-none transition-all focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-base font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang xác minh..." : "Xác minh tài khoản"}
                {!loading ? <ArrowRight size={16} /> : null}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || !username}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                <RefreshCw size={16} className={resending ? "animate-spin" : ""} />
                {resending ? "Đang gửi..." : "Gửi lại mã OTP"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

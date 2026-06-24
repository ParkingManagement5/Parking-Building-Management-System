import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, MailCheck, RefreshCw } from "lucide-react";
import { authApi } from "../../api/auth/authApi";
import BrandLogo from "./BrandLogo";
import PublicBackLink from "./PublicBackLink";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
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

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await authApi.forgotPassword({ email });
      setMessage("Ma OTP da duoc gui qua email cua ban.");
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Khong gui duoc OTP. Vui long kiem tra email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError("");

    try {
      await authApi.forgotPassword({ email });
      setMessage("Da gui lai ma OTP moi. Vui long kiem tra email.");
    } catch (err) {
      setError(err.response?.data?.message || "Khong gui lai duoc OTP.");
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Mat khau xac nhan khong khop.");
      setLoading(false);
      return;
    }

    try {
      await authApi.resetPassword({
        email,
        otp,
        newPassword,
        confirmPassword,
      });
      setStep("success");
    } catch (err) {
      setError(err.response?.data?.message || "Dat lai mat khau that bai.");
    } finally {
      setLoading(false);
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
          {/* Left panel */}
          <section className="hidden lg:block">
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-[0_26px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                <KeyRound size={34} />
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white">
                {step === "success" ? "Hoan tat!" : "Quen mat khau?"}
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-200">
                {step === "email"
                  ? "Nhap email da dang ky. Chung toi se gui ma OTP 6 so de dat lai mat khau."
                  : step === "reset"
                    ? "Nhap ma OTP tu email va mat khau moi cua ban."
                    : "Mat khau da duoc dat lai. Ban co the dang nhap ngay."}
              </p>
              <div className="mt-8 space-y-3">
                {["1. Nhap email da dang ky", "2. Nhan ma OTP qua email", "3. Nhap OTP va mat khau moi"].map(
                  (text, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-colors ${
                        (step === "email" && i === 0) ||
                        (step === "reset" && i === 1) ||
                        (step === "success" && i === 2)
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {text}
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Right panel */}
          <section className="mx-auto w-full max-w-[560px]">
            {/* Step 1: Enter email */}
            {step === "email" && (
              <form
                onSubmit={handleSendOtp}
                className="space-y-6 rounded-[28px] border border-slate-200 bg-white/96 p-8 shadow-[0_26px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-10"
              >
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-200">
                    Buoc 1/2
                  </p>
                  <h2 className="text-3xl font-bold text-slate-950 dark:text-white">Nhap email cua ban</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-200">
                    Chung toi se gui ma OTP 6 so qua email da dang ky.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="forgot-email" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-base text-slate-900 outline-none transition-all focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-base font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Dang gui..." : "Gui ma OTP"}
                  {!loading && <ArrowRight size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <ArrowLeft size={16} />
                  Quay lai dang nhap
                </button>
              </form>
            )}

            {/* Step 2: Enter OTP + new password */}
            {step === "reset" && (
              <form
                onSubmit={handleResetPassword}
                className="space-y-6 rounded-[28px] border border-slate-200 bg-white/96 p-8 shadow-[0_26px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-10"
              >
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-200">
                    Buoc 2/2
                  </p>
                  <h2 className="text-3xl font-bold text-slate-950 dark:text-white">Dat lai mat khau</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-200">
                    {message || "Nhap ma OTP da gui qua email va mat khau moi."}
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="reset-otp" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                    Ma OTP
                  </label>
                  <div className="relative">
                    <MailCheck size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reset-otp"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-center text-2xl font-bold tracking-[0.35em] text-slate-900 outline-none transition-all focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="reset-new-pw" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                    Mat khau moi
                  </label>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reset-new-pw"
                      type={showPw ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mat khau moi (it nhat 6 ky tu)"
                      className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 pr-12 text-base text-slate-900 outline-none transition-all focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    >
                      {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="reset-confirm-pw" className="text-sm font-medium text-slate-600 dark:text-slate-200">
                    Xac nhan mat khau
                  </label>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reset-confirm-pw"
                      type={showPw ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhap lai mat khau moi"
                      className="h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 pl-11 text-base text-slate-900 outline-none transition-all focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-base font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Dang xu ly..." : "Dat lai mat khau"}
                  {!loading && <ArrowRight size={16} />}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <RefreshCw size={16} className={resending ? "animate-spin" : ""} />
                  {resending ? "Dang gui..." : "Gui lai ma OTP"}
                </button>
              </form>
            )}

            {/* Step 3: Success */}
            {step === "success" && (
              <div className="space-y-6 rounded-[28px] border border-slate-200 bg-white/96 p-8 shadow-[0_26px_60px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-10 text-center">
                <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <LockKeyhole size={36} />
                </div>
                <h2 className="text-3xl font-bold text-slate-950 dark:text-white">Dat lai mat khau thanh cong!</h2>
                <p className="text-sm text-slate-600 dark:text-slate-200">
                  Ban co the dang nhap bang mat khau moi.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f46e5] text-base font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:opacity-95"
                >
                  Dang nhap ngay
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

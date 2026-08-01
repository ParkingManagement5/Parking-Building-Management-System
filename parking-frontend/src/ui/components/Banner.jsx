import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

// Banner dung chung cho cac canh bao/thong tin dat ngay trong noi dung trang
// (khac Toast — Banner khong tu bien mat, dung khi thong tin can hien thuong
// truc, vi du luu y nghiep vu ngay tren form).

const TONE = {
  warning: { Icon: AlertTriangle, wrap: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200", icon: "text-amber-600 dark:text-amber-300" },
  error: { Icon: XCircle, wrap: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200", icon: "text-rose-600 dark:text-rose-300" },
  info: { Icon: Info, wrap: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200", icon: "text-blue-600 dark:text-blue-300" },
  success: { Icon: CheckCircle2, wrap: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200", icon: "text-emerald-600 dark:text-emerald-300" },
};

export function Banner({ tone = "info", title, children, className = "" }) {
  const cfg = TONE[tone] || TONE.info;
  const { Icon } = cfg;
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${cfg.wrap} ${className}`}>
      <Icon size={16} className={`mt-0.5 shrink-0 ${cfg.icon}`} />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}

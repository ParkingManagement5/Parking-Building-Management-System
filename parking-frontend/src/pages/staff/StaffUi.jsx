import { AlertCircle, CheckCircle2 } from "lucide-react";

export function StaffPageSection({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-border bg-card ${className}`}>
      {title || subtitle || action ? (
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {title ? <h3 className="text-base font-semibold text-foreground">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StaffStatCard({ icon: Icon, label, value, hint, tone = "violet" }) {
  const tones = {
    violet: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className={`mb-4 flex size-11 items-center justify-center rounded-2xl ${tones[tone] || tones.violet}`}>
        {Icon ? <Icon size={18} /> : null}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

export function StaffStatusBadge({ children, tone = "slate" }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export function StaffInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 ${props.className || ""}`}
    />
  );
}

export function StaffSelect(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 ${props.className || ""}`}
    />
  );
}

export function StaffTextarea(props) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 ${props.className || ""}`}
    />
  );
}

export function StaffField({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function StaffPrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function StaffSecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted ${className}`}
    >
      {children}
    </button>
  );
}

export function StaffEmptyState({ title, description, tone = "neutral" }) {
  const icon =
    tone === "success" ? (
      <CheckCircle2 size={18} className="text-emerald-500" />
    ) : (
      <AlertCircle size={18} className="text-slate-400" />
    );

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
      <div className="mb-3 inline-flex size-10 items-center justify-center rounded-2xl bg-background shadow-sm">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

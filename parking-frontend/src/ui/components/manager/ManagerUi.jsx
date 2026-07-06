export function ManagerPageHeader({ title, description, action }) {
  if (!title && !description && !action) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {title ? <h2 className="text-xl font-semibold text-foreground">{title}</h2> : null}
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function ManagerStatsRow({ children }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function ManagerStatCard({ icon: Icon, label, value, hint, tone = "violet" }) {
  const tones = {
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
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

export function ManagerSplitLayout({ form, content }) {
  return <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">{form}{content}</div>;
}

export function ManagerPanel({ title, subtitle, children, actions }) {
  return (
    <section className="rounded-3xl border border-border bg-card">
      {title || subtitle || actions ? (
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ManagerForm({ children, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {children}
    </form>
  );
}

export function ManagerField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ManagerInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 ${props.className || ""}`}
    />
  );
}

export function ManagerSelect(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 ${props.className || ""}`}
    />
  );
}

export function ManagerTextarea(props) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 ${props.className || ""}`}
    />
  );
}

export function ManagerPrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function ManagerSecondaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted ${className}`}
    >
      {children}
    </button>
  );
}

export function ManagerStatusBadge({ children, tone = "slate" }) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
}

export function ManagerDataTable({ columns, children, minRows = 0 }) {
  const rowCount = Array.isArray(children) ? children.filter(Boolean).length : (children ? 1 : 0);
  const fillerCount = Math.max(0, minRows - rowCount);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-border px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
          {Array.from({ length: fillerCount }, (_, index) => (
            <tr key={`filler-${index}`} aria-hidden="true">
              <td colSpan={columns.length} className="border-b border-border px-4 py-3 text-sm">
                &nbsp;
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ManagerRow({ children }) {
  return <tr className="transition-colors hover:bg-muted/30">{children}</tr>;
}

export function ManagerCell({ children, className = "" }) {
  return <td className={`border-b border-border px-4 py-3 text-sm text-foreground ${className}`}>{children}</td>;
}

export function ManagerEmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

import { useMemo } from "react";

export default function Pagination({ items, pageSize = 10, page, setPage }) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paged = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);

  const controls = totalPages > 1 ? (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
        ← Trước
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => setPage(p)}
          className={`size-8 rounded-lg text-xs font-bold transition ${p === page ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
          {p}
        </button>
      ))}
      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
        Sau →
      </button>
    </div>
  ) : null;

  return { paged, controls, totalPages };
}

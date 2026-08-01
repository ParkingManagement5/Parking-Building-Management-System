import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, X, XCircle, AlertTriangle } from "lucide-react";

// Toast/Snackbar dung chung toan app — thay the alert() cho thong bao ket
// qua thao tac (thanh cong/that bai), tu bien mat sau vai giay, khong chan
// trang, theo dung theme sang/toi cua app (khac han popup OS cua alert()).

const ToastContext = createContext(null);

const TONE = {
  success: { Icon: CheckCircle2, wrap: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200", icon: "text-emerald-600 dark:text-emerald-300" },
  error: { Icon: XCircle, wrap: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200", icon: "text-rose-600 dark:text-rose-300" },
  warning: { Icon: AlertTriangle, wrap: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200", icon: "text-amber-600 dark:text-amber-300" },
  info: { Icon: Info, wrap: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200", icon: "text-blue-600 dark:text-blue-300" },
};

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone, message, duration = DEFAULT_DURATION) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, tone, message }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (message, duration) => push("success", message, duration),
    error: (message, duration) => push("error", message, duration),
    warning: (message, duration) => push("warning", message, duration),
    info: (message, duration) => push("info", message, duration),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-stretch gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => {
          const cfg = TONE[t.tone] || TONE.info;
          const { Icon } = cfg;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm shadow-lg ${cfg.wrap}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${cfg.icon}`} />
              <p className="min-w-0 flex-1">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 transition hover:opacity-100">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider by design
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải được gọi bên trong <ToastProvider>");
  return ctx;
}

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

// ConfirmDialog dung chung toan app — thay the window.confirm() bang modal
// theo dung theme cua app, tra ve Promise<boolean> nen giu nguyen duoc cach
// dung "await confirm(...)" tai noi goi, khong can doi logic xu ly.

const ConfirmContext = createContext(null);

const TONE_ICON_WRAP = {
  danger: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  default: "bg-primary/10 text-primary",
};

const TONE_BUTTON = {
  danger: "bg-rose-600 text-white hover:bg-rose-500",
  warning: "bg-amber-600 text-white hover:bg-amber-500",
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { message: options } : options || {};
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: opts.title || "Xác nhận",
        message: opts.message || "",
        confirmLabel: opts.confirmLabel || "Xác nhận",
        cancelLabel: opts.cancelLabel || "Huỷ",
        tone: opts.tone || "default",
      });
    });
  }, []);

  function close(result) {
    setState(null);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start gap-3">
              <div className={`grid size-9 shrink-0 place-items-center rounded-full ${TONE_ICON_WRAP[state.tone] || TONE_ICON_WRAP.default}`}>
                {state.tone === "default" ? <HelpCircle size={18} /> : <AlertTriangle size={18} />}
              </div>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-foreground">{state.title}</h3>
                {state.message ? <p className="mt-1 text-sm text-muted-foreground">{state.message}</p> : null}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
              >
                {state.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition ${TONE_BUTTON[state.tone] || TONE_BUTTON.default}`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider by design
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm phải được gọi bên trong <ConfirmProvider>");
  return ctx;
}

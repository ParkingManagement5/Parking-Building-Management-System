const STORAGE_KEY = "parking.payment.sync";
const DEFAULT_TTL_MS = 30_000;

function readState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.type || !parsed?.expiresAt) return null;
    if (Date.now() > Number(parsed.expiresAt)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function markPaymentSync(type, targetId, ttlMs = DEFAULT_TTL_MS) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        type,
        targetId: targetId ?? null,
        expiresAt: Date.now() + ttlMs,
      })
    );
  } catch {
    // Ignore storage errors in private mode or locked environments.
  }
}

export function getPaymentSync(type) {
  const state = readState();
  if (!state) return null;
  if (type && state.type !== type) return null;
  return state;
}

export function clearPaymentSync(type) {
  if (typeof window === "undefined") return;
  const state = readState();
  if (!state) return;
  if (type && state.type !== type) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

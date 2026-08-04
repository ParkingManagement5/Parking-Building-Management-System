const STORAGE_KEY = "parksmart.staff.portal.state";

const seedState = {
  schemaVersion: 2,
  sessions: [],
  payments: [],
  requests: [],
  exceptions: [],
  ocrRecords: [],
  qrLogs: [],
  activity: [],
  latestOcrPlate: "",
  latestOcrRecord: null,
};

const legacyMockIds = {
  sessions: new Set(["SES-2401", "SES-2402", "SES-237410"]),
  payments: new Set(["PAY-1201"]),
  requests: new Set(["REQ-011", "REQ-012"]),
  exceptions: new Set(["EX-021"]),
  ocrRecords: new Set(["OCR-001", "OCR-002"]),
  qrLogs: new Set(["QR-001"]),
  activity: new Set(["ACT-001", "ACT-002"]),
};

function parseState(raw) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function getStaffPortalState() {
  const stored = parseState(window.localStorage.getItem(STORAGE_KEY));
  if (!stored) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return structuredClone(seedState);
  }

  const nextState = {
    ...seedState,
    ...stored,
    schemaVersion: seedState.schemaVersion,
    sessions: sanitizeStoredList(stored.sessions, "sessions", "sessionId"),
    payments: sanitizeStoredList(stored.payments, "payments", "paymentId"),
    requests: sanitizeStoredList(stored.requests, "requests", "requestId"),
    exceptions: sanitizeStoredList(stored.exceptions, "exceptions", "caseId"),
    ocrRecords: sanitizeStoredList(stored.ocrRecords, "ocrRecords", "id"),
    qrLogs: sanitizeStoredList(stored.qrLogs, "qrLogs", "id"),
    activity: sanitizeStoredList(stored.activity, "activity", "id"),
    latestOcrPlate: stored.latestOcrPlate || "",
    latestOcrRecord: stored.latestOcrRecord || null,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

function sanitizeStoredList(value, group, idKey) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item?.source !== "seed" && !legacyMockIds[group]?.has(String(item?.[idKey] || "")));
}

export function saveStaffPortalState(nextState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function updateStaffPortalState(updater) {
  const current = getStaffPortalState();
  const next = updater(current);
  return saveStaffPortalState(next);
}

export function formatStaffDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatStaffCurrency(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " VND";
}

export function computeSessionFee(entryTime, endTimeOrHourlyRate = new Date(), hourlyRate = 20000) {
  const start = new Date(entryTime);
  if (Number.isNaN(start.getTime())) return 0;

  const resolvedHourlyRate =
    typeof endTimeOrHourlyRate === "number" ? endTimeOrHourlyRate : hourlyRate;
  const rawEndTime =
    typeof endTimeOrHourlyRate === "number" ? new Date() : endTimeOrHourlyRate;
  const end = rawEndTime ? new Date(rawEndTime) : new Date();
  const effectiveEnd = Number.isNaN(end.getTime()) ? new Date() : end;
  const elapsedMs = Math.max(0, effectiveEnd.getTime() - start.getTime());
  const graceMs = 10 * 60 * 1000;
  if (elapsedMs <= graceMs) return 0;

  const billableMs = elapsedMs - graceMs;
  const blockMs = 30 * 60 * 1000;
  const blocks = Math.max(1, Math.ceil(billableMs / blockMs));
  // Moi block la 30 phut = nua gio, phai tinh nua gia/gio moi block — khop
  // voi FeeCalculatorUtil.calculateWindowFee ben backend.
  return blocks * resolvedHourlyRate * 0.5;
}

export function createPortalId(prefix) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

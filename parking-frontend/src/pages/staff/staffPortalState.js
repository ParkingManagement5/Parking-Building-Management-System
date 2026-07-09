const STORAGE_KEY = "parksmart.staff.portal.state";

const seedState = {
  sessions: [
    {
      sessionId: "SES-2401",
      licensePlate: "30A-12345",
      driverName: "driver1",
      slotCode: "A1-C08",
      gateName: "Gate A",
      entryTime: "2026-06-14T08:10:00",
      status: "ACTIVE",
      feeAmount: 40000,
      paymentStatus: "UNPAID",
      source: "seed",
    },
    {
      sessionId: "SES-2402",
      licensePlate: "59B1-88888",
      driverName: "Tran Minh",
      slotCode: "B2-A04",
      gateName: "Gate B",
      entryTime: "2026-06-14T09:05:00",
      status: "ACTIVE",
      feeAmount: 25000,
      paymentStatus: "UNPAID",
      source: "seed",
    },
  ],
  payments: [
    {
      paymentId: "PAY-1201",
      sessionId: "SES-2398",
      licensePlate: "51A-67890",
      amount: 60000,
      method: "Cash",
      status: "PAID",
      paidAt: "2026-06-14T07:45:00",
    },
  ],
  requests: [
    {
      requestId: "REQ-011",
      driverName: "Alex Johnson",
      licensePlate: "30A-12345",
      type: "QR Issue",
      content: "QR code was not accepted at Gate A.",
      priority: "HIGH",
      status: "PENDING",
      createdAt: "2026-06-14T09:15:00",
    },
    {
      requestId: "REQ-012",
      driverName: "Sara Kim",
      licensePlate: "51A-67890",
      type: "Payment Issue",
      content: "Driver reported duplicate payment confirmation.",
      priority: "MEDIUM",
      status: "PENDING",
      createdAt: "2026-06-14T10:20:00",
    },
  ],
  exceptions: [
    {
      caseId: "EX-021",
      title: "License plate mismatch",
      licensePlate: "30A-1234S",
      description: "OCR result differs from registered vehicle record.",
      severity: "HIGH",
      status: "OPEN",
      createdAt: "2026-06-14T10:05:00",
    },
  ],
  ocrRecords: [
    {
      id: "OCR-001",
      detectedPlate: "30A-1234S",
      correctedPlate: "",
      confidence: 82,
      status: "PENDING",
      scanTime: "2026-06-14T09:58:00",
    },
    {
      id: "OCR-002",
      detectedPlate: "59B1-88888",
      correctedPlate: "59B1-88888",
      confidence: 97,
      status: "CONFIRMED",
      scanTime: "2026-06-14T08:36:00",
    },
  ],
  qrLogs: [
    {
      id: "QR-001",
      bookingCode: "BK-852977",
      licensePlate: "30A-12345",
      driverName: "driver1",
      slotCode: "A1-C08",
      status: "VALID",
      verifiedAt: "2026-06-14T08:00:00",
    },
  ],
  activity: [
    {
      id: "ACT-001",
      plate: "30A-12345",
      action: "Entered via Gate A",
      type: "entry",
      time: "2026-06-14T08:10:00",
    },
    {
      id: "ACT-002",
      plate: "51A-67890",
      action: "Payment processed 60,000 VND",
      type: "payment",
      time: "2026-06-14T07:45:00",
    },
  ],
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

  return {
    ...seedState,
    ...stored,
    sessions: Array.isArray(stored.sessions) ? stored.sessions : seedState.sessions,
    payments: Array.isArray(stored.payments) ? stored.payments : seedState.payments,
    requests: Array.isArray(stored.requests) ? stored.requests : seedState.requests,
    exceptions: Array.isArray(stored.exceptions) ? stored.exceptions : seedState.exceptions,
    ocrRecords: Array.isArray(stored.ocrRecords) ? stored.ocrRecords : seedState.ocrRecords,
    qrLogs: Array.isArray(stored.qrLogs) ? stored.qrLogs : seedState.qrLogs,
    activity: Array.isArray(stored.activity) ? stored.activity : seedState.activity,
  };
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

export function computeSessionFee(entryTime, hourlyRate = 20000) {
  const start = new Date(entryTime);
  const now = new Date();
  const elapsedMs = Math.max(0, now.getTime() - start.getTime());
  const hours = Math.max(1, Math.ceil(elapsedMs / (1000 * 60 * 60)));
  return hours * hourlyRate;
}

export function createPortalId(prefix) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

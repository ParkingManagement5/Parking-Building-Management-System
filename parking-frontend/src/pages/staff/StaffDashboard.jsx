import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Building2, Clock3, CreditCard, LogIn, MessageSquare, ScanLine, ShieldAlert, Users } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { buildingApi } from "../../api/manager/buildingApi";
import { staffShiftApi } from "../../api/manager/staffShiftApi";
import { requestApi } from "../../api/driver/requestApi";
import { ocrApi } from "../../api/staff/ocrApi";
import { exceptionApi } from "../../api/staff/exceptionApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { getUserId } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
import { computeSessionFee, formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import { StaffEmptyState, StaffPageSection, StaffStatCard, StaffStatusBadge } from "./StaffUi";

function activityTone(type) {
  if (type === "entry") return "emerald";
  if (type === "payment") return "violet";
  if (type === "exception") return "rose";
  return "blue";
}

function settledData(result, fallback = []) {
  if (result.status !== "fulfilled") {
    console.warn("Dashboard widget failed:", result.reason);
    return fallback;
  }
  return unwrapApiData(result.value.data, fallback);
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const userId = getUserId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [staffShifts, setStaffShifts] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [waitingPayments, setWaitingPayments] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [ocrReviews, setOcrReviews] = useState([]);
  const [openExceptions, setOpenExceptions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [
          buildingRes,
          shiftRes,
          notificationRes,
          activeSessionRes,
          waitingPaymentRes,
          requestRes,
          ocrRes,
          exceptionRes,
        ] = await Promise.allSettled([
          buildingApi.getAll(),
          userId ? staffShiftApi.getByUser(userId) : Promise.resolve({ data: [] }),
          userId ? notificationApi.getByUser(userId) : Promise.resolve({ data: [] }),
          sessionApi.getSessions({ status: "ACTIVE" }),
          sessionApi.getSessions({ status: "WAITING_PAYMENT" }),
          requestApi.getByStatus("OPEN"),
          ocrApi.getPendingReviews(),
          exceptionApi.getByStatus("OPEN"),
        ]);

        if (cancelled) return;

        setBuildings(settledData(buildingRes));
        setStaffShifts(settledData(shiftRes));
        setNotifications(settledData(notificationRes));
        setActiveSessions(settledData(activeSessionRes));
        setWaitingPayments(settledData(waitingPaymentRes));
        setOpenRequests(settledData(requestRes));
        setOcrReviews(settledData(ocrRes));
        setOpenExceptions(settledData(exceptionRes));
      } catch (err) {
        console.error("Load staff dashboard failed:", err);
        if (!cancelled) {
          setError(err.response?.data?.message || "Khong tai duoc staff dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const pendingAmount = useMemo(
    () => waitingPayments.reduce((sum, item) => sum + computeSessionFee(item.entryTime), 0),
    [waitingPayments]
  );

  const upcomingShifts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return staffShifts
      .filter((item) => String(item.workingDate || "") >= today)
      .sort((a, b) => String(a.workingDate).localeCompare(String(b.workingDate)))
      .slice(0, 4);
  }, [staffShifts]);

  const recentActivity = useMemo(() => {
    const sessionActivities = activeSessions.slice(0, 4).map((item) => ({
      id: `session-${item.sessionId}`,
      plate: item.licensePlate,
      action: `Entered slot ${item.slotCode}`,
      type: "entry",
      time: item.entryTime,
    }));
    const paymentActivities = waitingPayments.slice(0, 3).map((item) => ({
      id: `payment-${item.sessionId}`,
      plate: item.licensePlate,
      action: `Waiting payment ${formatStaffCurrency(computeSessionFee(item.entryTime))}`,
      type: "payment",
      time: item.exitTime || item.entryTime,
    }));
    const ocrActivities = ocrReviews.slice(0, 3).map((item) => ({
      id: `ocr-${item.scanId}`,
      plate: item.detectedPlate || "UNKNOWN",
      action: "OCR scan needs staff review",
      type: "exception",
      time: item.scannedAt,
    }));

    return [...sessionActivities, ...paymentActivities, ...ocrActivities]
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .slice(0, 6);
  }, [activeSessions, waitingPayments, ocrReviews]);

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaffStatCard icon={LogIn} label="Active Entries" value={activeSessions.length} hint="Vehicles currently in the building" tone="emerald" />
        <StaffStatCard icon={CreditCard} label="Waiting Payment" value={waitingPayments.length} hint="Exited sessions pending collection" tone="violet" />
        <StaffStatCard icon={ShieldAlert} label="Open Exceptions" value={openExceptions.length + ocrReviews.length} hint="Operational and OCR review items" tone="rose" />
        <StaffStatCard icon={CreditCard} label="Pending Payments" value={formatStaffCurrency(pendingAmount)} hint={`${waitingPayments.length} session(s) waiting`} tone="violet" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <StaffPageSection title="Today's Activity Feed" subtitle="Live entries, waiting payments, and OCR review items from backend">
          {recentActivity.length === 0 ? (
            <StaffEmptyState title="No backend activity yet" description="Process entry, exit, or OCR scans to populate this feed." />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-background shadow-sm">
                    {item.type === "entry" ? (
                      <LogIn size={16} className="text-emerald-600" />
                    ) : item.type === "payment" ? (
                      <CreditCard size={16} className="text-violet-600" />
                    ) : item.type === "exception" ? (
                      <ShieldAlert size={16} className="text-rose-600" />
                    ) : (
                      <Bell size={16} className="text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.plate}</p>
                    <p className="truncate text-sm text-muted-foreground">{item.action}</p>
                  </div>
                  <div className="text-right">
                    <StaffStatusBadge tone={activityTone(item.type)}>{item.type}</StaffStatusBadge>
                    <p className="mt-1 text-xs text-muted-foreground">{formatStaffDateTime(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Operations Snapshot" subtitle="Backend-backed counters in one view">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Unread Notifications</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{notifications.filter((item) => !item.isRead).length}</p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">OCR Reviews</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{ocrReviews.length}</p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Buildings</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{buildings.length}</p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Open Exceptions</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{openExceptions.length}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                <p className="text-sm font-semibold text-foreground">Upcoming Shift Coverage</p>
              </div>
              {upcomingShifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shift assignment found for this account.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingShifts.map((item) => (
                    <div key={item.staffShiftId} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.shiftName}</p>
                        <p className="text-xs text-muted-foreground">{formatStaffDateTime(`${item.workingDate}T00:00:00`)}</p>
                      </div>
                      <StaffStatusBadge tone="blue">{item.startTime} - {item.endTime}</StaffStatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </StaffPageSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <StaffPageSection title="Active Sessions" subtitle="Current on-site vehicle sessions from backend">
          {activeSessions.length === 0 ? (
            <StaffEmptyState title="No active sessions" description="Processed entries will appear here automatically." />
          ) : (
            <div className="space-y-3">
              {activeSessions.slice(0, 5).map((item) => (
                <div key={item.sessionId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Session #{item.sessionId}</p>
                      <p className="text-base font-semibold text-foreground">{item.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">Slot {item.slotCode}</p>
                    </div>
                    <StaffStatusBadge tone="emerald">{String(item.status).toLowerCase()}</StaffStatusBadge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatStaffDateTime(item.entryTime)}</span>
                    <span className="font-semibold text-foreground">{formatStaffCurrency(computeSessionFee(item.entryTime))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Open Requests" subtitle="Driver support requests that need staff handling">
          {openRequests.length === 0 ? (
            <StaffEmptyState title="No open requests" description="Driver support requests will show here when they arrive." tone="success" />
          ) : (
            <div className="space-y-3">
              {openRequests.slice(0, 5).map((item) => (
                <div key={item.requestId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.subject || item.requestType}</p>
                      <p className="text-xs text-muted-foreground">Request #{item.requestId} - User #{item.userId}</p>
                    </div>
                    <StaffStatusBadge tone="amber">{String(item.status || "open").toLowerCase()}</StaffStatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <StaffPageSection title="Payment Queue" subtitle="Exited sessions waiting for collection">
          {waitingPayments.length === 0 ? (
            <StaffEmptyState title="No waiting payments" description="Vehicles appear here after Gate Exit." tone="success" />
          ) : (
            <div className="space-y-3">
              {waitingPayments.slice(0, 4).map((item) => (
                <button
                  key={item.sessionId}
                  type="button"
                  onClick={() => navigate("/staff/payments")}
                  className="w-full rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                      <p className="text-xs text-muted-foreground">Session #{item.sessionId} - Slot {item.slotCode}</p>
                    </div>
                    <StaffStatusBadge tone="amber">payment</StaffStatusBadge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{formatStaffCurrency(computeSessionFee(item.entryTime))}</p>
                </button>
              ))}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Exception Queue" subtitle="Open exception cases and OCR corrections">
          {openExceptions.length + ocrReviews.length === 0 ? (
            <StaffEmptyState title="No exceptions" description="Abnormal gate and OCR cases will show here." tone="success" />
          ) : (
            <div className="space-y-3">
              {ocrReviews.slice(0, 2).map((item) => (
                <button
                  key={`ocr-${item.scanId}`}
                  type="button"
                  onClick={() => navigate("/staff/exceptions")}
                  className="w-full rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.detectedPlate || "UNKNOWN"}</p>
                      <p className="text-xs text-muted-foreground">OCR review #{item.scanId}</p>
                    </div>
                    <ScanLine size={16} className="text-rose-500" />
                  </div>
                </button>
              ))}
              {openExceptions.slice(0, 3).map((item) => (
                <button
                  key={`exception-${item.exceptionId}`}
                  type="button"
                  onClick={() => navigate("/staff/exceptions")}
                  className="w-full rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.exceptionType}</p>
                      <p className="text-xs text-muted-foreground">Exception #{item.exceptionId}</p>
                    </div>
                    <StaffStatusBadge tone="rose">{String(item.status || "open").toLowerCase()}</StaffStatusBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="My Shift" subtitle="Your upcoming staff coverage">
          {upcomingShifts.length === 0 ? (
            <StaffEmptyState title="No shift assignment" description="Manager shift assignments will appear here." />
          ) : (
            <div className="space-y-3">
              {upcomingShifts.slice(0, 3).map((item) => (
                <div key={item.staffShiftId} className="rounded-2xl border border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{item.shiftName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatStaffDateTime(`${item.workingDate}T00:00:00`)}</p>
                  <div className="mt-3">
                    <StaffStatusBadge tone="blue">{item.startTime} - {item.endTime}</StaffStatusBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading staff dashboard...</p> : null}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  Clock3,
  CreditCard,
  LogIn,
  MessageSquare,
  ShieldAlert,
  Users,
} from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { buildingApi } from "../../api/manager/buildingApi";
import { staffShiftApi } from "../../api/manager/staffShiftApi";
import { getUserId } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
import {
  formatStaffCurrency,
  formatStaffDateTime,
  getStaffPortalState,
} from "./staffPortalState";
import {
  StaffEmptyState,
  StaffPageSection,
  StaffStatCard,
  StaffStatusBadge,
} from "./StaffUi";

function activityTone(type) {
  if (type === "entry") return "emerald";
  if (type === "payment") return "violet";
  if (type === "exception") return "rose";
  return "blue";
}

export default function StaffDashboard() {
  const userId = getUserId();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [staffShifts, setStaffShifts] = useState([]);
  const [portalState, setPortalState] = useState(() => getStaffPortalState());

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      try {
        const [buildingRes, shiftRes, notificationRes] = await Promise.all([
          buildingApi.getAll(),
          userId ? staffShiftApi.getByUser(userId) : Promise.resolve({ data: [] }),
          userId ? notificationApi.getByUser(userId) : Promise.resolve({ data: [] }),
        ]);

        if (cancelled) return;

        setBuildings(unwrapApiData(buildingRes.data, []));
        setStaffShifts(Array.isArray(shiftRes.data) ? shiftRes.data : []);
        setNotifications(unwrapApiData(notificationRes.data, []));
        setPortalState(getStaffPortalState());
      } catch (error) {
        console.error("Load staff dashboard failed:", error);
        if (!cancelled) {
          setBuildings([]);
          setStaffShifts([]);
          setNotifications([]);
          setPortalState(getStaffPortalState());
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

  const activeSessions = useMemo(
    () => portalState.sessions.filter((item) => item.status === "ACTIVE"),
    [portalState.sessions]
  );
  const pendingRequests = useMemo(
    () => portalState.requests.filter((item) => item.status === "PENDING"),
    [portalState.requests]
  );
  const openExceptions = useMemo(
    () => portalState.exceptions.filter((item) => item.status === "OPEN"),
    [portalState.exceptions]
  );
  const todayRevenue = useMemo(
    () =>
      portalState.payments
        .filter((item) => item.status === "PAID")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [portalState.payments]
  );
  const upcomingShifts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return staffShifts
      .filter((item) => String(item.workingDate || "") >= today)
      .sort((a, b) => String(a.workingDate).localeCompare(String(b.workingDate)))
      .slice(0, 4);
  }, [staffShifts]);
  const recentActivity = useMemo(
    () =>
      [...portalState.activity]
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
        .slice(0, 6),
    [portalState.activity]
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaffStatCard
          icon={Users}
          label="My Shifts"
          value={staffShifts.length}
          hint="Assignments from staff shift API"
          tone="blue"
        />
        <StaffStatCard
          icon={Clock3}
          label="Current Sessions"
          value={activeSessions.length}
          hint="Live sessions being monitored"
          tone="emerald"
        />
        <StaffStatCard
          icon={MessageSquare}
          label="Pending Requests"
          value={pendingRequests.length}
          hint="Requests waiting for staff handling"
          tone="amber"
        />
        <StaffStatCard
          icon={CreditCard}
          label="Revenue Today"
          value={formatStaffCurrency(todayRevenue)}
          hint="Completed local payment records"
          tone="violet"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <StaffPageSection
          title="Today's Activity Feed"
          subtitle="Entry, payment, and exception actions are summarized here"
        >
          {recentActivity.length === 0 ? (
            <StaffEmptyState
              title="No activity recorded"
              description="Process entry, exit, or OCR actions to populate the live feed."
            />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3"
                >
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

        <StaffPageSection
          title="Operations Snapshot"
          subtitle="Real notifications and locally tracked issues in one view"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Unread Notifications</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {notifications.filter((item) => !item.isRead).length}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Open Exceptions</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{openExceptions.length}</p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Buildings</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{buildings.length}</p>
              </div>
              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">QR Logs</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{portalState.qrLogs.length}</p>
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
                        <p className="text-xs text-muted-foreground">
                          {formatStaffDateTime(`${item.workingDate}T00:00:00`)}
                        </p>
                      </div>
                      <StaffStatusBadge tone="blue">
                        {item.startTime} - {item.endTime}
                      </StaffStatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </StaffPageSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <StaffPageSection title="Active Sessions" subtitle="Current on-site vehicle sessions">
          {activeSessions.length === 0 ? (
            <StaffEmptyState
              title="No active sessions"
              description="Processed entries will appear here automatically."
            />
          ) : (
            <div className="space-y-3">
              {activeSessions.slice(0, 5).map((item) => (
                <div key={item.sessionId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.sessionId}</p>
                      <p className="text-base font-semibold text-foreground">{item.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.gateName} • {item.slotCode}
                      </p>
                    </div>
                    <StaffStatusBadge tone="emerald">{item.paymentStatus}</StaffStatusBadge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatStaffDateTime(item.entryTime)}</span>
                    <span className="font-semibold text-foreground">
                      {formatStaffCurrency(item.feeAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Pending Requests" subtitle="Requests that still need staff resolution">
          {pendingRequests.length === 0 ? (
            <StaffEmptyState
              title="No pending requests"
              description="Driver support requests will show here when they arrive."
              tone="success"
            />
          ) : (
            <div className="space-y-3">
              {pendingRequests.slice(0, 5).map((item) => (
                <div key={item.requestId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.requestId} • {item.driverName} • {item.licensePlate}
                      </p>
                    </div>
                    <StaffStatusBadge tone={item.priority === "HIGH" ? "rose" : "amber"}>
                      {item.priority.toLowerCase()}
                    </StaffStatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.content}</p>
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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CreditCard, LogIn, ShieldAlert } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { staffShiftApi } from "../../api/manager/staffShiftApi";
import { requestApi } from "../../api/driver/requestApi";
import { ocrApi } from "../../api/staff/ocrApi";
import { exceptionApi } from "../../api/staff/exceptionApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { getUserId } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
import { pricingPolicyApi } from "../../api/manager/pricingPolicyApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { computeSessionFee, formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import { StaffEmptyState, StaffPageSection, StaffStatCard, StaffStatusBadge } from "./StaffUi";

function formatElapsed(entryTime) {
  if (!entryTime) return "--";
  const ms = Date.now() - new Date(entryTime).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "--";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}p` : `${minutes}p`;
}

function settledData(result, failures, fallback = [], widgetName = "widget") {
  if (result.status !== "fulfilled") {
    console.warn(`Dashboard ${widgetName} failed:`, result.reason);
    failures.push(widgetName);
    return fallback;
  }
  return unwrapApiData(result.value.data, fallback);
}

function buildDashboardError(failures) {
  if (failures.length === 0) {
    return "";
  }

  const failedNames = failures.join(", ");
  if (!failures.some((failure) => failure.status === 403)) {
    return `Some widgets failed to load: ${failedNames}. Data shown may be incomplete.`;
  }
  const hasForbidden = failures.some((failure) => failure.status === 403);
  const mentionsBuilding = failures.some((failure) =>
    String(failure.message).toLowerCase().includes("toa nha")
    || String(failure.message).toLowerCase().includes("building")
  );

  if (hasForbidden && mentionsBuilding) {
    return "Tài khoản staff chưa được gán tòa nhà nên một số dữ liệu vận hành chưa tải được. Admin/Manager cần gán building cho staff này.";
  }

  if (hasForbidden) {
    return `Một số dữ liệu không tải được do tài khoản staff chưa có đủ quyền: ${failedNames}.`;
  }

  return `Một số dữ liệu chưa tải được: ${failedNames}. Dữ liệu hiển thị có thể chưa đầy đủ.`;
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const userId = getUserId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [staffShifts, setStaffShifts] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [waitingPayments, setWaitingPayments] = useState([]);
  const [openRequests, setOpenRequests] = useState([]);
  const [ocrReviews, setOcrReviews] = useState([]);
  const [openExceptions, setOpenExceptions] = useState([]);
  const [pricingPolicies, setPricingPolicies] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [
          shiftRes,
          notificationRes,
          activeSessionRes,
          waitingPaymentRes,
          requestRes,
          ocrRes,
          exceptionRes,
          pricingRes,
          vehicleTypeRes,
        ] = await Promise.allSettled([
          userId ? staffShiftApi.getByUser(userId) : Promise.resolve({ data: [] }),
          userId ? notificationApi.getByUser(userId) : Promise.resolve({ data: [] }),
          sessionApi.getSessions({ status: "ACTIVE" }),
          sessionApi.getSessions({ status: "WAITING_PAYMENT" }),
          requestApi.getByStatus("OPEN"),
          ocrApi.getPendingReviews(),
          exceptionApi.getByStatus("OPEN"),
          pricingPolicyApi.getAll(),
          vehicleTypeApi.getAll(),
        ]);

        if (cancelled) return;

        const failures = [];
        setStaffShifts(settledData(shiftRes, failures, [], "shifts"));
        setNotifications(settledData(notificationRes, failures, [], "notifications"));
        setActiveSessions(settledData(activeSessionRes, failures, [], "active sessions"));
        setWaitingPayments(settledData(waitingPaymentRes, failures, [], "payments"));
        setOpenRequests(settledData(requestRes, failures, [], "requests"));
        setOcrReviews(settledData(ocrRes, failures, [], "OCR reviews"));
        setOpenExceptions(settledData(exceptionRes, failures, [], "exceptions"));
        setPricingPolicies(settledData(pricingRes, failures, [], "pricing"));
        setVehicleTypes(settledData(vehicleTypeRes, failures, [], "vehicle types"));
        setError(buildDashboardError(failures));
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

  function resolveHourlyRate(session) {
    const policy = pricingPolicies.find(
      (p) => p.isActive && p.vehicleTypeId === session?.vehicleTypeId
    );
    return Number(policy?.pricePerHour ?? 20000);
  }

  const pendingAmount = useMemo(
    () => waitingPayments.reduce((sum, item) => sum + computeSessionFee(item.entryTime, new Date(), resolveHourlyRate(item)), 0),
    [waitingPayments, pricingPolicies]
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
      action: `Waiting payment ${formatStaffCurrency(computeSessionFee(item.entryTime, new Date(), resolveHourlyRate(item)))}`,
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
  }, [activeSessions, waitingPayments, ocrReviews, pricingPolicies]);

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {/* KPI nhanh */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StaffStatCard icon={LogIn} label="Xe dang trong bai" value={activeSessions.length} hint="Phien dang ACTIVE" tone="emerald" />
        <StaffStatCard icon={CreditCard} label="Cho thanh toan" value={waitingPayments.length} hint="Xe da ra, chua thu tien" tone="amber" />
        <StaffStatCard icon={CreditCard} label="Tong tien cho thu" value={formatStaffCurrency(pendingAmount)} hint={`${waitingPayments.length} phien dang cho`} tone="violet" />
        <StaffStatCard
          icon={ShieldAlert}
          label="Su co can xu ly"
          value={openExceptions.length + ocrReviews.length}
          hint="Exception + OCR review — bam de xu ly"
          tone="rose"
          onClick={() => navigate("/staff/exceptions")}
        />
      </div>

      {/* Trong tam 1: xe dang trong bai (chi tiet) + bang gia xe (tra cuu nhanh) */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <StaffPageSection
          title="Xe dang trong bai"
          subtitle="Phien dang hoat dong — bien so, slot, gio vao va phi tam tinh"
          action={
            <button type="button" onClick={() => navigate("/staff/sessions")} className="text-xs font-medium text-primary hover:underline">
              Xem tat ca &rarr;
            </button>
          }
        >
          {activeSessions.length === 0 ? (
            <StaffEmptyState title="Chua co xe nao" description="Xe vao bai qua Scan se hien o day." />
          ) : (
            <div className="space-y-3">
              {activeSessions.slice(0, 6).map((item) => (
                <div key={item.sessionId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{item.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">
                        Slot {item.slotCode} • {item.vehicleTypeName || "—"}
                      </p>
                    </div>
                    <StaffStatusBadge tone="emerald">{formatElapsed(item.entryTime)}</StaffStatusBadge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vao luc {formatStaffDateTime(item.entryTime)}</span>
                    <span className="font-semibold text-foreground">{formatStaffCurrency(computeSessionFee(item.entryTime, new Date(), resolveHourlyRate(item)))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Bang gia xe" subtitle="Gia theo gio / loai xe">
          {vehicleTypes.length === 0 ? (
            <StaffEmptyState title="Chua co loai xe" description="Manager chua cau hinh loai xe active." />
          ) : (
            <div className="space-y-2">
              {vehicleTypes.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/30 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">Slot {t.slotSize}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-foreground">{formatStaffCurrency(t.hourlyRate)}/h</p>
                    {t.dailyRate ? <p className="text-xs text-muted-foreground">{formatStaffCurrency(t.dailyRate)}/ngay</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>
      </div>

      {/* Trong tam 2: hang cho thanh toan (chi tiet) + hoat dong gan day (rut gon) */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <StaffPageSection
          title="Hang cho thanh toan"
          subtitle="Xe da ra cong, can thu tien"
          action={
            <button type="button" onClick={() => navigate("/staff/payments")} className="text-xs font-medium text-primary hover:underline">
              Xem tat ca &rarr;
            </button>
          }
        >
          {waitingPayments.length === 0 ? (
            <StaffEmptyState title="Khong co khoan cho thu" description="Xe se xuat hien o day sau khi qua cong ra." tone="success" />
          ) : (
            <div className="space-y-3">
              {waitingPayments.slice(0, 5).map((item) => {
                const rate = resolveHourlyRate(item);
                const fee = computeSessionFee(item.entryTime, new Date(), rate);
                return (
                  <button
                    key={item.sessionId}
                    type="button"
                    onClick={() => navigate("/staff/payments")}
                    className="w-full rounded-2xl border border-border px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.licensePlate}</p>
                        <p className="text-xs text-muted-foreground">
                          Slot {item.slotCode} • {formatStaffCurrency(rate)}/h • {item.vehicleTypeName || "—"}
                        </p>
                      </div>
                      <StaffStatusBadge tone="amber">cho thu</StaffStatusBadge>
                    </div>
                    <p className="mt-2 text-sm font-bold text-foreground">{formatStaffCurrency(fee)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Hoat dong gan day" subtitle="Vao/ra/thanh toan/OCR moi nhat">
          {recentActivity.length === 0 ? (
            <StaffEmptyState title="Chua co hoat dong" description="Xu ly entry/exit/OCR se hien o day." />
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-muted/20 px-3 py-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                    {item.type === "entry" ? (
                      <LogIn size={14} className="text-emerald-600" />
                    ) : item.type === "payment" ? (
                      <CreditCard size={14} className="text-violet-600" />
                    ) : item.type === "exception" ? (
                      <ShieldAlert size={14} className="text-rose-600" />
                    ) : (
                      <Bell size={14} className="text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{item.plate}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.action}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatStaffDateTime(item.time)}</span>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>
      </div>

      {/* Thong tin phu — gom lai thanh 1 dai gon, khong chiem rieng section lon */}
      <StaffPageSection title="Khac" subtitle="Ca lam, yeu cau ho tro, thong bao">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Ca lam sap toi</p>
            {upcomingShifts[0] ? (
              <>
                <p className="mt-1 text-sm font-semibold text-foreground">{upcomingShifts[0].shiftName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatStaffDateTime(`${upcomingShifts[0].workingDate}T00:00:00`)} • {upcomingShifts[0].startTime}-{upcomingShifts[0].endTime}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Chua co ca duoc gan.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/staff/requests")}
            className="rounded-2xl bg-muted/30 p-4 text-left transition-colors hover:bg-muted"
          >
            <p className="text-xs text-muted-foreground">Yeu cau ho tro mo</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{openRequests.length}</p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/staff/notifications")}
            className="rounded-2xl bg-muted/30 p-4 text-left transition-colors hover:bg-muted"
          >
            <p className="text-xs text-muted-foreground">Thong bao chua doc</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{notifications.filter((item) => !item.isRead).length}</p>
          </button>
        </div>
      </StaffPageSection>

      {loading ? <p className="text-sm text-muted-foreground">Dang tai staff dashboard...</p> : null}
    </div>
  );
}

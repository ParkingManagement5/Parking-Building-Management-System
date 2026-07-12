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
import { StaffEmptyState, StaffPageSection, StaffStatBar, StaffStatusBadge } from "./StaffUi";

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
        if (failures.length > 0) {
          setError(`Some widgets failed to load: ${failures.join(", ")}. Data shown may be incomplete.`);
        }
      } catch (err) {
        console.error("Load staff dashboard failed:", err);
        if (!cancelled) {
          setError(err.response?.data?.message || "Không tải được staff dashboard.");
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
      <StaffStatBar
        items={[
          { icon: LogIn, label: "Xe đang trong bãi", value: activeSessions.length, hint: "Phiên đang ACTIVE", tone: "emerald" },
          { icon: CreditCard, label: "Chờ thanh toán", value: waitingPayments.length, hint: "Xe đã ra, chưa thu tiền", tone: "amber" },
          { icon: CreditCard, label: "Tổng tiền chờ thu", value: formatStaffCurrency(pendingAmount), hint: `${waitingPayments.length} phiên đang chờ`, tone: "violet" },
          {
            icon: ShieldAlert,
            label: "Sự cố cần xử lý",
            value: openExceptions.length + ocrReviews.length,
            hint: "Exception + OCR review — bấm để xử lý",
            tone: "rose",
            onClick: () => navigate("/staff/exceptions"),
          },
        ]}
      />

      {/* Trong tam 1: xe dang trong bai (chi tiet) + bang gia xe (tra cuu nhanh) */}
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <StaffPageSection
          title="Xe đang trong bãi"
          subtitle="Phiên đang hoạt động — biển số, slot, giờ vào và phí tạm tính"
          action={
            <button type="button" onClick={() => navigate("/staff/sessions")} className="text-xs font-medium text-primary hover:underline">
              Xem tất cả &rarr;
            </button>
          }
        >
          {activeSessions.length === 0 ? (
            <StaffEmptyState title="Chưa có xe nào" description="Xe vào bãi qua Scan sẽ hiện ở đây." />
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
                    <span className="text-muted-foreground">Vào lúc {formatStaffDateTime(item.entryTime)}</span>
                    <span className="font-semibold text-foreground">{formatStaffCurrency(computeSessionFee(item.entryTime, new Date(), resolveHourlyRate(item)))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Bảng giá xe" subtitle="Giá theo giờ / loại xe">
          {vehicleTypes.length === 0 ? (
            <StaffEmptyState title="Chưa có loại xe" description="Manager chưa cấu hình loại xe active." />
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
                    {t.dailyRate ? <p className="text-xs text-muted-foreground">{formatStaffCurrency(t.dailyRate)}/ngày</p> : null}
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
          title="Hàng chờ thanh toán"
          subtitle="Xe đã ra cổng, cần thu tiền"
          action={
            <button type="button" onClick={() => navigate("/staff/payments")} className="text-xs font-medium text-primary hover:underline">
              Xem tất cả &rarr;
            </button>
          }
        >
          {waitingPayments.length === 0 ? (
            <StaffEmptyState title="Không có khoản chờ thu" description="Xe sẽ xuất hiện ở đây sau khi qua cổng ra." tone="success" />
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
                      <StaffStatusBadge tone="amber">chờ thu</StaffStatusBadge>
                    </div>
                    <p className="mt-2 text-sm font-bold text-foreground">{formatStaffCurrency(fee)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Hoạt động gần đây" subtitle="Vào/ra/thanh toán/OCR mới nhất">
          {recentActivity.length === 0 ? (
            <StaffEmptyState title="Chưa có hoạt động" description="Xử lý entry/exit/OCR sẽ hiện ở đây." />
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
      <StaffPageSection title="Khác" subtitle="Ca làm, yêu cầu hỗ trợ, thông báo">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Ca làm sắp tới</p>
            {upcomingShifts[0] ? (
              <>
                <p className="mt-1 text-sm font-semibold text-foreground">{upcomingShifts[0].shiftName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatStaffDateTime(`${upcomingShifts[0].workingDate}T00:00:00`)} • {upcomingShifts[0].startTime}-{upcomingShifts[0].endTime}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Chưa có ca được gán.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/staff/notifications?tab=requests")}
            className="rounded-2xl bg-muted/30 p-4 text-left transition-colors hover:bg-muted"
          >
            <p className="text-xs text-muted-foreground">Yêu cầu hỗ trợ mở</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{openRequests.length}</p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/staff/notifications")}
            className="rounded-2xl bg-muted/30 p-4 text-left transition-colors hover:bg-muted"
          >
            <p className="text-xs text-muted-foreground">Thông báo chưa đọc</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{notifications.filter((item) => !item.isRead).length}</p>
          </button>
        </div>
      </StaffPageSection>

      {loading ? <p className="text-sm text-muted-foreground">Đang tải staff dashboard...</p> : null}
    </div>
  );
}

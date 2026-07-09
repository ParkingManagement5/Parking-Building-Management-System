import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Car,
  LoaderCircle,
  MapPin,
  Package,
  SquareParking,
  History,
} from "lucide-react";
import { bookingApi } from "../../api/driver/bookingApi";
import { paymentApi } from "../../api/driver/paymentApi";
import { driverVehicleApi } from "../../api/driver/driverVehicleApi";
import { pricingPolicyApi } from "../../api/driver/pricingPolicyApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/components/ui/select";
import { unwrapApiData } from "../../utils/api";

function slotClasses(status, active) {
  if (active) return "bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-2 ring-primary/40";
  if (status === "occupied") return "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400";
  if (status === "reserved") return "bg-amber-400 text-white cursor-not-allowed dark:bg-amber-500/80";
  return "bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500/80 dark:hover:bg-emerald-400/90";
}

function formatDateTime(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("vi-VN");
}

function formatLocalDateTime(value) {
  const p = (n) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
}

const DURATION_UNIT_LABELS = { HOURLY: "giờ", DAILY: "ngày", WEEKLY: "tuần", MONTHLY: "tháng" };
const DAY_TYPE_LABELS = { WEEKDAY: "Ngày thường", WEEKEND: "Cuối tuần", HOLIDAY: "Ngày lễ" };
const BOOKING_TYPE_DAYS = { HOURLY: null, DAILY: 1, WEEKLY: 7, MONTHLY: 30 };

function computeBookingEnd(start, type, units) {
  const d = new Date(start);
  const n = Math.max(1, Number(units) || 1);
  if (type === "DAILY") d.setDate(d.getDate() + n);
  else if (type === "WEEKLY") d.setDate(d.getDate() + n * 7);
  else if (type === "MONTHLY") d.setMonth(d.getMonth() + n);
  else d.setHours(d.getHours() + n); // HOURLY
  return d;
}

function isOpenBooking(b) {
  const s = String(b?.status || b?.bookingStatus || "").toUpperCase();
  const qrUsed = b?.qrUsed === true || Boolean(b?.qrUsedAt);
  const exp = b?.expiredAt || b?.bookingEndTime;
  const expiresAt = exp ? new Date(exp).getTime() : null;
  return s === "PENDING_PAYMENT" || (s === "CONFIRMED" && !qrUsed && !(Number.isFinite(expiresAt) && expiresAt < Date.now()));
}

function isVehicleBlockingBooking(b) {
  const s = String(b?.status || b?.bookingStatus || "").toUpperCase();
  return isOpenBooking(b) || s === "CHECKED_IN" || s === "WAITING_PAYMENT";
}

const vnd = (v) => new Intl.NumberFormat("vi-VN").format(v ?? 0);

const alertStyles = {
  error: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200",
  warn: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
};
function AlertBox({ variant = "error", children }) {
  if (!children) return null;
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${alertStyles[variant]}`}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{children}</span>
    </div>
  );
}

const STEP_LABELS = ["Chọn vị trí", "Thời gian", "Xác nhận"];

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectBuildingName = location.state?.buildingName || "";

  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [backendSlots, setBackendSlots] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [conflictLock, setConflictLock] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [bookingStart, setBookingStart] = useState(() => { const d = new Date(Date.now() + 15 * 60000); d.setSeconds(0, 0); return d; });
  const [bookingType] = useState("HOURLY");
  const [durationUnits, setDurationUnits] = useState(1);
  const [selection, setSelection] = useState({ building: "", floor: "", zone: "", slotCode: "", slotId: "", vehicleId: "" });
  const [pricingPolicies, setPricingPolicies] = useState([]);
  const [payingDeposit, setPayingDeposit] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [payError, setPayError] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingVehicles(true);
      setLoadError("");
      try {
        const [vehiclesRes, bookingsRes] = await Promise.all([
          driverVehicleApi.getMyVehicles(),
          bookingApi.getMyBookings(),
        ]);
        setVehicles(unwrapApiData(vehiclesRes.data, []));
        setMyBookings(unwrapApiData(bookingsRes.data, []));
      } catch {
        setVehicles([]);
        setMyBookings([]);
        setLoadError("Không tải được danh sách xe của bạn.");
      } finally {
        setLoadingVehicles(false);
      }
    })();
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.vehicleId || v.id) === String(selection.vehicleId)),
    [vehicles, selection.vehicleId],
  );

  const vehiclesWithStatus = useMemo(() => {
    return vehicles.map((v) => {
      const vid = v.vehicleId || v.id;
      const active = myBookings.find((b) => String(b.vehicleId || b.vehicle?.id) === String(vid) && isVehicleBlockingBooking(b));
      const conflict = String(conflictLock?.vehicleId || "") === String(vid) ? conflictLock : null;
      return { ...v, vehicleId: vid, activeBooking: active || conflict, isLocked: Boolean(active || conflict) };
    });
  }, [conflictLock, vehicles, myBookings]);

  useEffect(() => {
    if (!selectedVehicle) { setBackendSlots([]); return; }
    const vtId = selectedVehicle.vehicleType?.vehicleTypeId ?? selectedVehicle.vehicleType?.id ?? selectedVehicle.vehicleTypeId;
    if (!vtId) { setBackendSlots([]); setLoadError("Không xác định được loại xe để tìm slot phù hợp."); return; }
    setLoadingSlots(true);
    setLoadError("");
    bookingApi.getAvailableSlots(vtId)
      .then((r) => setBackendSlots(unwrapApiData(r.data, [])))
      .catch(() => { setBackendSlots([]); setLoadError("Không tải được danh sách slot trống."); })
      .finally(() => setLoadingSlots(false));
  }, [selectedVehicle]);

  useEffect(() => {
    if (!selectedVehicle) { setPricingPolicies([]); return; }
    const vtId = selectedVehicle.vehicleType?.vehicleTypeId ?? selectedVehicle.vehicleType?.id ?? selectedVehicle.vehicleTypeId;
    if (!vtId) { setPricingPolicies([]); return; }
    pricingPolicyApi.getAll()
      .then((r) => {
        const all = unwrapApiData(r.data, []);
        setPricingPolicies(all.filter((p) => p.isActive && String(p.vehicleTypeId) === String(vtId)));
      })
      .catch(() => setPricingPolicies([]));
  }, [selectedVehicle]);

  const hourlyPolicies = useMemo(
    () => pricingPolicies.filter((p) => !["DAILY","WEEKLY","MONTHLY"].includes(p.timeType)),
    [pricingPolicies],
  );

  const estimatedCost = useMemo(() => {
    if (!hourlyPolicies.length) return null;
    const dow = bookingStart.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const policy = hourlyPolicies.find((p) => p.dayType === (isWeekend ? "WEEKEND" : "WEEKDAY")) || hourlyPolicies[0];
    return Number(policy.pricePerHour) * Number(durationUnits);
  }, [hourlyPolicies, durationUnits, bookingStart]);

  const effectiveDayType = useMemo(() => {
    const dow = bookingStart.getDay();
    return dow === 0 || dow === 6 ? "WEEKEND" : "WEEKDAY";
  }, [bookingStart]);

  const slotGrid = useMemo(
    () => backendSlots.map((s, i) => ({
      uiId: s.id || s.slotId || `${i}`,
      slotId: s.id || s.slotId || "",
      slotCode: s.slotCode || `S${i + 1}`,
      status: String(s.status || "available").toLowerCase(),
      floor: s.zone?.floor?.floorName || s.zone?.floor?.name || "Tầng chưa rõ",
      zone: s.zone?.zoneName || s.zone?.name || "Khu chưa rõ",
      building: s.zone?.floor?.building?.name || "Toà chưa rõ",
    })),
    [backendSlots],
  );

  const buildingOptions = useMemo(() => Array.from(new Map(slotGrid.map((s) => [s.building, s.building])).values()), [slotGrid]);

  // Tu chon toa nha khi vao tu nut "Dat cho" o trang Tim bai do xe (truyen
  // buildingName qua router state) — chi ap dung sau khi da chon xe (buildingOptions
  // chi co du lieu luc do) va nguoi dung chua tu chon toa nha khac.
  useEffect(() => {
    if (!preselectBuildingName || selection.building || !selection.vehicleId) return;
    if (buildingOptions.includes(preselectBuildingName)) {
      setSelection((p) => ({ ...p, building: preselectBuildingName }));
    }
  }, [preselectBuildingName, buildingOptions, selection.vehicleId, selection.building]);
  const floorOptions = useMemo(() => [...new Set(slotGrid.filter((s) => !selection.building || s.building === selection.building).map((s) => s.floor))], [slotGrid, selection.building]);
  const zoneOptions = useMemo(() => [...new Set(slotGrid.filter((s) => (!selection.building || s.building === selection.building) && (!selection.floor || s.floor === selection.floor)).map((s) => s.zone))], [slotGrid, selection.building, selection.floor]);
  const filteredSlotGrid = useMemo(() => slotGrid.filter((s) => (!selection.building || s.building === selection.building) && (!selection.floor || s.floor === selection.floor) && (!selection.zone || s.zone === selection.zone)), [slotGrid, selection.building, selection.floor, selection.zone]);
  const selectedSlot = useMemo(() => filteredSlotGrid.find((s) => String(s.slotId || s.uiId) === String(selection.slotId || selection.slotCode) || s.slotCode === selection.slotCode), [filteredSlotGrid, selection.slotCode, selection.slotId]);

  const selectedVehicleBooking = vehiclesWithStatus.find((v) => String(v.vehicleId) === String(selection.vehicleId));
  const lockedBooking = selectedVehicleBooking?.activeBooking || null;
  const isSelectedVehicleLocked = Boolean(selectedVehicleBooking?.isLocked);
  const effectiveStep = isSelectedVehicleLocked ? 0 : step;

  useEffect(() => {
    if (!isSelectedVehicleLocked) return;
    setSelection((p) => ({ ...p, building: "", floor: "", zone: "", slotCode: "", slotId: "" }));
    setBackendSlots([]);
    setSubmitError("");
    setConfirmation(null);
    setStep(0);
  }, [isSelectedVehicleLocked]);

  async function handleConfirm() {
    if (!selection.vehicleId || !selectedSlot || isSelectedVehicleLocked) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const start = bookingStart;
      const end = computeBookingEnd(start, bookingType, durationUnits);
      if ((start.getTime() - Date.now()) / 60000 < 10) {
        setSubmitError("Thời gian bắt đầu phải cách hiện tại ít nhất 10 phút.");
        setSubmitting(false);
        return;
      }
      const res = await bookingApi.create({
        vehicleId: Number(selection.vehicleId),
        slotId: Number(selectedSlot.slotId),
        bookingStartTime: formatLocalDateTime(start),
        bookingType,
      });
      const p = unwrapApiData(res.data, {});
      setConfirmation({
        bookingId: p.bookingId, status: p.status, depositAmount: p.depositAmount,
        expiredAt: p.expiredAt,
        bookingStartTime: p.bookingStartTime || formatLocalDateTime(start),
        bookingEndTime: p.bookingEndTime || formatLocalDateTime(end),
        building: selectedSlot.building, floor: selectedSlot.floor, zone: selectedSlot.zone,
        slotCode: p.slotCode || selectedSlot.slotCode,
        vehiclePlate: p.licensePlate || selectedVehicle?.licensePlate || "Xe",
        bookingType,
        durationUnits: Number(durationUnits),
        estimatedCost,
      });
      setStep(3);
    } catch (error) {
      const message = getErrorMessage(error, "Tạo booking thất bại. Vui lòng thử lại.");
      setSubmitError(message);
      if (error?.response?.status === 409 && /booking active/i.test(message)) {
        setConflictLock({ bookingId: message.match(/#(\d+)/)?.[1], vehicleId: selection.vehicleId, status: "CONFLICT" });
        setSelection((p) => ({ ...p, building: "", floor: "", zone: "", slotCode: "", slotId: "" }));
        setBackendSlots([]);
        setStep(0);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayDeposit() {
    if (!confirmation?.bookingId) return;
    setPayingDeposit(true);
    setPayError("");
    try {
      const depositAmount = Number(confirmation.depositAmount || 0);
      if (depositAmount > 0) {
        // VNPay redirect
        const res = await paymentApi.createVnpayDepositUrl(confirmation.bookingId);
        const data = unwrapApiData(res.data, null);
        if (data?.paymentUrl) {
          window.location.href = data.paymentUrl;
          return;
        }
        throw new Error("Không lấy được URL thanh toán VNPay");
      } else {
        // deposit = 0 → auto confirm CASH
        const depositRes = await paymentApi.createDeposit({
          bookingId: Number(confirmation.bookingId),
          depositAmount: 0,
          paymentMethod: "CASH",
        });
        const deposit = unwrapApiData(depositRes.data, null);
        if (deposit?.paymentId) await paymentApi.confirmDeposit(deposit.paymentId);
        setDepositPaid(true);
        setConfirmation((p) => ({ ...p, status: "CONFIRMED" }));
      }
    } catch (err) {
      setPayError(getErrorMessage(err, "Thanh toán cọc thất bại."));
    } finally {
      setPayingDeposit(false);
    }
  }

  function resetAll() {
    setSelection({ building: "", floor: "", zone: "", slotCode: "", slotId: "", vehicleId: "" });
    setBackendSlots([]);
    setConfirmation(null);
    setSubmitError("");
    setPayError("");
    setDepositPaid(false);
    setStep(0);
  }

  if (effectiveStep === 3 && confirmation) {
    const rows = [
      ["Mã đặt chỗ", `#${confirmation.bookingId}`],
      ["Trạng thái", confirmation.status, depositPaid ? "text-emerald-600" : "text-amber-600"],
      ["Toà nhà", confirmation.building],
      ["Tầng", confirmation.floor],
      ["Vị trí", `${confirmation.zone} — ${confirmation.slotCode}`],
      ["Hình thức", "Theo giờ (tính khi ra)"],
      ["Hẹn đến bãi", formatDateTime(confirmation.bookingStartTime)],
      ["Tiền cọc (giữ chỗ)", `${vnd(confirmation.depositAmount)} VND`, "font-semibold text-primary"],
      ["Hạn TT cọc", formatDateTime(confirmation.expiredAt)],
      ["Xe", confirmation.vehiclePlate],
    ];
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${depositPaid ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-amber-100 dark:bg-amber-500/15"}`}>
            <CheckCircle2 size={30} className={depositPaid ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"} />
          </div>
          <h3 className="font-bold text-foreground mb-1 text-xl">
            {depositPaid
              ? "Đặt chỗ thành công — QR sẵn sàng"
              : "Đặt chỗ thành công — Cần thanh toán cọc"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {depositPaid
              ? "Đã thanh toán cọc. Vào Lịch sử đặt chỗ để xem mã QR check-in."
              : "Thanh toán cọc qua VNPay để xác nhận giữ chỗ. Phần còn lại trả khi ra."}
          </p>
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
            {rows.map(([label, value, cls]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-medium ${cls || "text-foreground"}`}>{value}</span>
              </div>
            ))}
          </div>
          <AlertBox>{payError}</AlertBox>
          <div className="space-y-3 mt-4">
            {!depositPaid ? (
              <button onClick={handlePayDeposit} disabled={payingDeposit} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60">
                {payingDeposit
                  ? "Đang xử lý..."
                  : `Thanh toán cọc ${vnd(confirmation.depositAmount)} VND qua VNPay`}
              </button>
            ) : (
              <button onClick={() => navigate("/driver/bookings")} className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors">
                Xem QR Check-in
              </button>
            )}
            <button onClick={resetAll} className="w-full border border-border text-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-muted transition-colors">
              Tạo booking mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { to: "/driver/parking-slots", icon: SquareParking, title: "Xem slot trống", desc: "Tra cứu slot theo loại xe" },
          { to: "/driver/package-booking", icon: Package, title: "Đăng ký gói", desc: "Gói ngày / tuần / tháng" },
          { to: "/driver/bookings", icon: History, title: "Lịch sử đặt chỗ", desc: "Xem cọc, QR, trạng thái booking" },
        ].map(({ to, icon: Icon, title, desc }) => (
          <button key={to} type="button" onClick={() => navigate(to)} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={18} /></span>
            <span>
              <span className="block text-sm font-semibold text-foreground">{title}</span>
              <span className="block text-xs text-muted-foreground">{desc}</span>
            </span>
          </button>
        ))}
      </div>

      <AlertBox variant="warn">{loadError}</AlertBox>
      <AlertBox>{submitError}</AlertBox>
      {isSelectedVehicleLocked && lockedBooking && (
        <AlertBox>
          Xe này đang có booking/phiên chưa hoàn tất (#{lockedBooking.bookingId || lockedBooking.id}).
          Vui lòng hoàn tất vào/ra cổng, thanh toán, hoặc huỷ booking cũ trước khi tạo booking mới.
        </AlertBox>
      )}

      <div className="flex items-center gap-0">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= effectiveStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < effectiveStep ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i === effectiveStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < effectiveStep ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Chọn vị trí ─────────────────────────── */}
      {effectiveStep === 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <Car size={20} /> Chọn xe & vị trí đỗ
          </h3>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Xe của bạn</label>
            <Select
              value={selection.vehicleId}
              onValueChange={(v) => {
                setConflictLock(null);
                setSelection({ building: "", floor: "", zone: "", slotCode: "", slotId: "", vehicleId: v });
              }}
            >
              <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm" disabled={loadingVehicles}>
                <SelectValue placeholder={loadingVehicles ? "Đang tải xe..." : "Chọn xe"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-card shadow-xl">
                {vehiclesWithStatus.map((v) => {
                  const typeName = v.vehicleType?.name;
                  const typeLabel = typeName === "CAR" ? "Ô tô" : typeName === "MOTORBIKE" ? "Xe máy" : typeName || "";
                  return (
                    <SelectItem key={v.vehicleId} value={String(v.vehicleId)} disabled={v.isLocked} className="rounded-lg px-3 py-2 text-sm">
                      {v.licensePlate}
                      {typeLabel ? ` (${typeLabel})` : ""}
                      {v.isLocked ? ` — đang có booking #${v.activeBooking.bookingId || v.activeBooking.id}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {isSelectedVehicleLocked && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Xe này đang có booking chưa hoàn tất. Vui lòng chọn xe khác.</p>
            )}
          </div>

          {selection.vehicleId && loadingSlots && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle size={16} className="animate-spin" /> Đang tải slot phù hợp...
            </div>
          )}

          {selection.vehicleId && !isSelectedVehicleLocked && buildingOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Toà nhà</label>
              <div className="grid grid-cols-2 gap-3">
                {buildingOptions.map((b) => (
                  <button key={b} onClick={() => setSelection((p) => ({ ...p, building: b, floor: "", zone: "", slotCode: "", slotId: "" }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${selection.building === b ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}>
                    <div className={`mb-2 flex size-8 items-center justify-center rounded-lg ${selection.building === b ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <MapPin size={14} />
                    </div>
                    <p className="font-medium text-sm text-foreground">{b}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{slotGrid.filter((s) => s.building === b).length} slot</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loadingSlots && selection.vehicleId && !isSelectedVehicleLocked && buildingOptions.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Không có slot trống phù hợp với loại xe này.
            </div>
          )}

          {selection.building && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tầng</label>
                <div className="space-y-1.5">
                  {floorOptions.map((f) => (
                    <button key={f} onClick={() => setSelection((p) => ({ ...p, floor: f, zone: "", slotCode: "", slotId: "" }))}
                      className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${selection.floor === f ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/40 text-foreground"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Khu vực</label>
                <div className="space-y-1.5">
                  {zoneOptions.map((z) => (
                    <button key={z} onClick={() => setSelection((p) => ({ ...p, zone: z, slotCode: "", slotId: "" }))}
                      className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${selection.zone === z ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/40 text-foreground"}`}>
                      {z}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selection.zone && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Chọn slot</label>
                <div className="flex items-center gap-3 text-xs">
                  {[["bg-emerald-500", "Trống"], ["bg-gray-300 dark:bg-gray-600", "Đã đỗ"], ["bg-amber-400", "Đã giữ"]].map(([cls, label]) => (
                    <span key={label} className="flex items-center gap-1"><span className={`size-3 rounded-sm ${cls}`} /><span className="text-muted-foreground">{label}</span></span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-4 bg-muted/30 rounded-xl">
                {filteredSlotGrid.map((slot) => {
                  const blocked = slot.status !== "available";
                  const active = slot.slotCode === selection.slotCode || String(slot.slotId) === String(selection.slotId);
                  return (
                    <button key={slot.uiId} disabled={blocked}
                      onClick={() => setSelection((p) => ({ ...p, slotCode: slot.slotCode, slotId: slot.slotId || slot.uiId }))}
                      className={`rounded-lg aspect-square flex items-center justify-center text-[10px] font-mono font-bold transition-all ${slotClasses(slot.status, active)}`}>
                      {slot.slotCode}
                    </button>
                  );
                })}
              </div>
              {filteredSlotGrid.length === 0 && (
                <p className="mt-3 text-center text-sm text-muted-foreground">Không có slot nào ở khu vực này.</p>
              )}
            </div>
          )}

          <button onClick={() => setStep(1)}
            disabled={!selection.vehicleId || !selection.slotCode || isSelectedVehicleLocked}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors">
            Tiếp tục — Chọn thời gian
          </button>
        </div>
      )}

      {/* ─── STEP 2: Thời gian ───────────────────────────── */}
      {effectiveStep === 1 && !isSelectedVehicleLocked && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <Clock size={20} /> Chọn thời gian
          </h3>

          {selectedSlot && (
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <SquareParking size={16} className="text-primary" />
              <span className="text-foreground font-medium">{selectedSlot.building} — {selectedSlot.floor} — {selectedSlot.zone} — {selectedSlot.slotCode}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Thời gian đến bãi đỗ</label>
            <input type="datetime-local"
              value={formatLocalDateTime(bookingStart).slice(0, 16)}
              min={formatLocalDateTime(new Date(Date.now() + 10 * 60 * 1000)).slice(0, 16)}
              onChange={(e) => { if (e.target.value) setBookingStart(new Date(e.target.value)); }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">Phải cách hiện tại ít nhất 10 phút</p>
          </div>

          {/* Bảng giá tham khảo */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Bảng giá tham khảo</label>
            {hourlyPolicies.length > 0 ? (
              <div className="rounded-xl border border-primary/30 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-primary/10">
                      <th className="text-left px-3 py-2 font-semibold text-primary">Loại ngày</th>
                      <th className="text-right px-3 py-2 font-semibold text-primary">Đơn giá</th>
                      <th className="text-right px-3 py-2 font-semibold text-primary">Tính theo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hourlyPolicies.map((p) => {
                      const isActive = effectiveDayType === p.dayType || hourlyPolicies.length === 1;
                      return (
                        <tr key={p.policyId} className={`border-t border-primary/20 ${isActive ? "bg-primary/5" : ""}`}>
                          <td className="px-3 py-2 text-foreground">
                            {DAY_TYPE_LABELS[p.dayType] || p.dayType}
                            {isActive && <span className="ml-1.5 text-[10px] text-primary font-semibold">◀ hôm nay</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-foreground">
                            {Number(p.pricePerHour).toLocaleString("vi-VN")}đ/giờ
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">mỗi 30 phút</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Chưa có bảng giá. Vui lòng liên hệ quản lý bãi.</p>
            )}
          </div>

          {/* Tóm tắt */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 space-y-1.5">
            <div className="flex justify-between items-center">
              <span>Thời gian đến bãi</span>
              <span className="font-medium">{bookingStart.toLocaleString("vi-VN")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>{effectiveDayType === "WEEKEND" ? "Cuối tuần" : "Ngày thường"}</span>
              <span className="font-medium">{effectiveDayType === "WEEKEND" ? "Áp dụng giá cuối tuần" : "Áp dụng giá ngày thường"}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-emerald-200 dark:border-emerald-500/30 mt-1">
              <span className="font-semibold">Tiền cọc giữ chỗ</span>
              <span className="font-bold text-base">10.000 – 30.000đ</span>
            </div>
            <p className="text-xs opacity-75">Phí tính theo thời gian thực khi ra. Cọc được trừ vào tổng phí.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 rounded-xl border border-border py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
              Quay lại
            </button>
            <button onClick={() => setStep(2)} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Tiếp tục — Xác nhận
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Xác nhận & Đặt chỗ ─────────────────── */}
      {effectiveStep === 2 && !isSelectedVehicleLocked && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <CheckCircle2 size={20} /> Xác nhận đặt chỗ
          </h3>

          <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
            {[
              ["Xe", selectedVehicle?.licensePlate || "--"],
              ["Toà nhà", selectedSlot?.building || "--"],
              ["Tầng / Khu vực", `${selectedSlot?.floor || "--"} — ${selectedSlot?.zone || "--"}`],
              ["Slot", selectedSlot?.slotCode || "--"],
              ["Hình thức", "Theo giờ (tính khi ra)"],
              ["Hẹn đến bãi", formatDateTime(bookingStart)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Tiền cọc giữ chỗ</span>
              <span className="font-bold text-primary">10.000 – 30.000đ</span>
            </div>
          </div>

          <AlertBox>{submitError}</AlertBox>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 rounded-xl border border-border py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
              Quay lại
            </button>
            <button onClick={handleConfirm}
              disabled={!selection.vehicleId || !selection.slotCode || submitting || isSelectedVehicleLocked}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors">
              {submitting ? "Đang tạo..." : "Xác nhận đặt chỗ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

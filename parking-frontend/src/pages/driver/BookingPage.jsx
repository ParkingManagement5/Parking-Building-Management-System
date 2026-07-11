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
  Moon,
  Package,
  SquareParking,
  Sun,
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

const DAY_TYPE_LABELS = { WEEKDAY: "Ngày thường", WEEKEND: "Cuối tuần", HOLIDAY: "Ngày lễ" };

// Khung gio ap dung cua 1 policy — trung voi FeeCalculatorUtil.isInTimeRange ben
// backend (ho tro khung gio vong qua nua dem, vd 22h-6h).
function isInTimeRange(hour, startHour, endHour) {
  if (startHour == null || endHour == null) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

function formatHourRange(startHour, endHour) {
  if (startHour == null || endHour == null) return "Cả ngày";
  const p = (h) => `${String(h).padStart(2, "0")}:00`;
  return `${p(startHour)}–${p(endHour)}`;
}

// Khung gio vong qua nua dem (vd 22h-6h) = ban dem; con lai = ban ngay.
function isNightRange(startHour, endHour) {
  if (startHour == null || endHour == null) return false;
  return startHour > endHour;
}

// Trung voi BookingServiceImpl.calculateDeposit ben backend (BR-03d): chi
// CAR/ELECTRIC_CAR moi tinh coc, muc coc tang dan theo khoang cach tu luc dat
// den luc hen den bai — dat cang gan gio thi coc cang thap.
function calculateDeposit(vehicleTypeName, minutesUntilStart) {
  const name = String(vehicleTypeName || "").toUpperCase();
  if (name !== "CAR" && name !== "ELECTRIC_CAR") return 0;
  if (minutesUntilStart < 10) return 0;
  if (minutesUntilStart < 120) return 10000;
  if (minutesUntilStart < 240) return 15000;
  if (minutesUntilStart < 360) return 20000;
  return 30000;
}

// Trong so nhieu policy cung khop dieu kien: uu tien ban co effectiveFrom moi
// nhat (nhung <= thoi diem tham chieu) — dung y het FeeCalculatorUtil.latestEffectiveRate
// ben backend, de gia uoc tinh hien thi truoc khi dat luon khop voi so tien
// thuc te se tinh luc xe ra (kho co the lech khi manager sua gia giua chung).
function latestEffectivePolicy(policies, referenceTime, matcher) {
  const refMs = referenceTime instanceof Date ? referenceTime.getTime() : Date.now();
  let best = null;
  let bestFrom = -Infinity;
  for (const p of policies) {
    if (!matcher(p)) continue;
    const fromMs = p.effectiveFrom ? new Date(p.effectiveFrom).getTime() : -Infinity;
    if (fromMs > refMs) continue; // chua co hieu luc tai thoi diem tham chieu
    if (fromMs >= bestFrom) { best = p; bestFrom = fromMs; }
  }
  return best;
}

// Chon dung policy theo dayType + gio, uu tien 4 cap do y het
// FeeCalculatorUtil.resolveHourlyRate ben backend: (1) dayType+khung gio khop
// dung, (2) chi dayType, (3) chi khung gio, (4) bat ky — moi cap do lay ban
// effectiveFrom moi nhat.
function resolveHourlyPolicy(policies, dayType, hour, referenceTime) {
  if (!policies.length) return null;
  return (
    latestEffectivePolicy(policies, referenceTime, (p) => p.dayType === dayType && isInTimeRange(hour, p.startHour, p.endHour)) ||
    latestEffectivePolicy(policies, referenceTime, (p) => p.dayType === dayType) ||
    latestEffectivePolicy(policies, referenceTime, (p) => isInTimeRange(hour, p.startHour, p.endHour)) ||
    latestEffectivePolicy(policies, referenceTime, () => true) ||
    policies[0]
  );
}

const PACKAGE_OPTIONS = [
  { value: "DAILY", label: "Gói ngày", days: 1, unitLabel: "ngày", desc: "Trọn ngày · thanh toán khi ra cổng" },
  { value: "WEEKLY", label: "Gói tuần", days: 7, unitLabel: "tuần", desc: "7 ngày · vào/ra tự do · trả trọn gói" },
  { value: "MONTHLY", label: "Gói tháng", days: 30, unitLabel: "tháng", desc: "30 ngày · vào/ra tự do · giá ưu đãi" },
];

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

// Dong tom tat cho 1 muc da chon xong trong accordion "Chon vi tri" — thay vi
// hien het cac khoi luon mo cung luc (nhin roi/khong chuyen nghiep), muc da
// chon se gon lai thanh 1 dong, bam "Doi" moi mo lai de chon khac.
function SummaryRow({ icon: Icon, label, value, onEdit }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={14} /></span>
        <span className="min-w-0">
          <span className="block text-[11px] text-muted-foreground">{label}</span>
          <span className="block text-sm font-medium text-foreground truncate">{value}</span>
        </span>
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
        Đổi
      </button>
    </div>
  );
}

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
  const [bookingType, setBookingType] = useState("HOURLY"); // HOURLY | DAILY | WEEKLY | MONTHLY
  const [durationUnits, setDurationUnits] = useState(1);
  const [selection, setSelection] = useState({ building: "", floor: "", zone: "", slotCode: "", slotId: "", vehicleId: "" });
  const [openPanel, setOpenPanel] = useState("building"); // "building" | "floorZone" | "slot" | null (khong panel nao dang mo)
  const [pricingPolicies, setPricingPolicies] = useState([]);
  const [payingDeposit, setPayingDeposit] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const [payError, setPayError] = useState("");

  const isPackageMode = bookingType !== "HOURLY";
  const stepLabels = ["Chọn vị trí", isPackageMode ? "Chọn gói" : "Thời gian", "Xác nhận"];

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

  const priceByType = useMemo(() => {
    const map = {};
    for (const opt of PACKAGE_OPTIONS) {
      map[opt.value] = pricingPolicies.filter((p) => p.timeType === opt.value);
    }
    return map;
  }, [pricingPolicies]);

  const effectiveDayType = useMemo(() => {
    const dow = bookingStart.getDay();
    return dow === 0 || dow === 6 ? "WEEKEND" : "WEEKDAY";
  }, [bookingStart]);

  const estimatedCost = useMemo(() => {
    if (!isPackageMode) {
      if (!hourlyPolicies.length) return null;
      const policy = resolveHourlyPolicy(hourlyPolicies, effectiveDayType, bookingStart.getHours(), bookingStart);
      if (!policy) return null;
      return Number(policy.pricePerHour) * Number(durationUnits);
    }
    const policies = priceByType[bookingType];
    if (!policies?.length) return null;
    const policy =
      latestEffectivePolicy(policies, bookingStart, (p) => p.dayType === effectiveDayType) ||
      latestEffectivePolicy(policies, bookingStart, () => true) ||
      policies[0];
    return Number(policy.pricePerHour) * Number(durationUnits);
  }, [isPackageMode, bookingType, hourlyPolicies, priceByType, durationUnits, effectiveDayType, bookingStart]);

  // Coc uoc tinh hien thi truoc khi dat — tinh dung theo loai xe + con bao lau
  // nua den gio hen, khop voi calculateDeposit ben backend, thay vi hien tinh
  // "10.000 - 30.000d" chung chung khong phan anh dung so tien se ap dung.
  const estimatedDeposit = useMemo(() => {
    const vehicleTypeName = selectedVehicle?.vehicleType?.name;
    const minutesUntilStart = (bookingStart.getTime() - Date.now()) / 60000;
    return calculateDeposit(vehicleTypeName, minutesUntilStart);
  }, [selectedVehicle, bookingStart]);

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
    setOpenPanel("building");
    setStep(0);
  }, [isSelectedVehicleLocked]);

  function handleModeChange(newType) {
    setBookingType(newType);
    setDurationUnits(1);
  }

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
        durationUnits: Number(durationUnits),
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
      setPayError(getErrorMessage(err, "Thanh toán thất bại."));
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
    setBookingType("HOURLY");
    setDurationUnits(1);
    setOpenPanel("building");
    setStep(0);
  }

  if (effectiveStep === 3 && confirmation) {
    const confIsPackage = confirmation.bookingType !== "HOURLY";
    const confPkgOpt = PACKAGE_OPTIONS.find((o) => o.value === confirmation.bookingType);
    const isDaily = confirmation.bookingType === "DAILY";
    const rows = [
      ["Mã đặt chỗ", `#${confirmation.bookingId}`],
      ["Trạng thái", confirmation.status, depositPaid ? "text-emerald-600" : "text-amber-600"],
      ["Toà nhà", confirmation.building],
      ["Tầng", confirmation.floor],
      ["Vị trí", `${confirmation.zone} — ${confirmation.slotCode}`],
      confIsPackage
        ? ["Hình thức", `${confPkgOpt?.label || confirmation.bookingType} × ${confirmation.durationUnits}`]
        : ["Hình thức", "Theo giờ (tính khi ra)"],
      ...(confIsPackage && !isDaily
        ? [["Thời hạn", `${confirmation.durationUnits * (confPkgOpt?.days || 7)} ngày`]]
        : []),
      ["Hẹn đến bãi", formatDateTime(confirmation.bookingStartTime)],
      confIsPackage && !isDaily
        ? ["Phí trọn gói", `${vnd(confirmation.depositAmount)} VND`, "font-semibold text-primary"]
        : ["Tiền cọc (giữ chỗ)", `${vnd(confirmation.depositAmount)} VND`, "font-semibold text-primary"],
      ["Hạn TT cọc", formatDateTime(confirmation.expiredAt)],
      ["Xe", confirmation.vehiclePlate],
    ];
    const title = confIsPackage
      ? (depositPaid ? "Đăng ký gói thành công — QR sẵn sàng" : "Đăng ký gói thành công — Cần thanh toán")
      : (depositPaid ? "Đặt chỗ thành công — QR sẵn sàng" : "Đặt chỗ thành công — Cần thanh toán cọc");
    const desc = confIsPackage
      ? (depositPaid
          ? "Phí gói đã thanh toán. Vào Lịch sử đặt chỗ để xem mã QR. Vào/ra tự do trong suốt kỳ hạn."
          : "Thanh toán phí gói qua VNPay để nhận mã QR. Sau đó vào/ra tự do không cần thanh toán thêm.")
      : (depositPaid
          ? "Đã thanh toán cọc. Vào Lịch sử đặt chỗ để xem mã QR check-in."
          : "Thanh toán cọc qua VNPay để xác nhận giữ chỗ. Phần còn lại trả khi ra.");
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${depositPaid ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-amber-100 dark:bg-amber-500/15"}`}>
            {confIsPackage && !depositPaid
              ? <Package size={30} className="text-amber-600 dark:text-amber-300" />
              : <CheckCircle2 size={30} className={depositPaid ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"} />}
          </div>
          <h3 className="font-bold text-foreground mb-1 text-xl">{title}</h3>
          <p className="text-muted-foreground text-sm mb-6">{desc}</p>
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
            {rows.map(([label, value, cls]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-medium ${cls || "text-foreground"}`}>{value}</span>
              </div>
            ))}
          </div>
          {confIsPackage && !isDaily && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 text-left mb-4">
              <p className="font-semibold mb-1">Quyền lợi gói {confPkgOpt?.label}:</p>
              <ul className="space-y-0.5 list-disc list-inside text-xs">
                <li>Vào/ra bãi nhiều lần trong kỳ hạn</li>
                <li>Slot {confirmation.slotCode} được giữ riêng cho bạn</li>
                <li>Không tính phí thêm khi ra giữa kỳ</li>
                <li>Slot tự giải phóng khi hết kỳ</li>
              </ul>
            </div>
          )}
          <AlertBox>{payError}</AlertBox>
          <div className="space-y-3 mt-4">
            {!depositPaid ? (
              <button onClick={handlePayDeposit} disabled={payingDeposit} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60">
                {payingDeposit
                  ? "Đang xử lý..."
                  : `Thanh toán ${vnd(confirmation.depositAmount)} VND qua VNPay`}
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

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { to: "/driver/find-parking", icon: SquareParking, title: "Tìm chỗ đỗ", desc: "So độ trống, khoảng cách giữa các bãi" },
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
        {stepLabels.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= effectiveStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < effectiveStep ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i === effectiveStep ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < stepLabels.length - 1 && <div className={`flex-1 h-px mx-3 ${i < effectiveStep ? "bg-primary" : "bg-border"}`} />}
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
                setOpenPanel("building");
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
            selection.building && openPanel !== "building" ? (
              <SummaryRow icon={MapPin} label="Toà nhà" value={selection.building} onEdit={() => setOpenPanel("building")} />
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Toà nhà</label>
                <div className="grid grid-cols-2 gap-3">
                  {buildingOptions.map((b) => (
                    <button key={b} onClick={() => {
                        setSelection((p) => ({ ...p, building: b, floor: "", zone: "", slotCode: "", slotId: "" }));
                        setOpenPanel("floorZone");
                      }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${selection.building === b ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}>
                      <div className={`mb-2 flex size-8 items-center justify-center rounded-lg ${selection.building === b ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <MapPin size={14} />
                      </div>
                      <p className="font-medium text-sm text-foreground">{b}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{slotGrid.filter((s) => s.building === b).length} vị trí</p>
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {!loadingSlots && selection.vehicleId && !isSelectedVehicleLocked && buildingOptions.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Không có slot trống phù hợp với loại xe này.
            </div>
          )}

          {selection.building && (
            selection.floor && selection.zone && openPanel !== "floorZone" ? (
              <SummaryRow icon={MapPin} label="Tầng / Khu vực" value={`${selection.floor} — ${selection.zone}`} onEdit={() => setOpenPanel("floorZone")} />
            ) : (
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
                      <button key={z} onClick={() => {
                          setSelection((p) => ({ ...p, zone: z, slotCode: "", slotId: "" }));
                          if (selection.floor) setOpenPanel("slot");
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${selection.zone === z ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/40 text-foreground"}`}>
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {selection.zone && (
            selection.slotCode && openPanel !== "slot" ? (
              <SummaryRow icon={SquareParking} label="Slot" value={selection.slotCode} onEdit={() => setOpenPanel("slot")} />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Chọn vị trí đỗ</label>
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
                        onClick={() => {
                          setSelection((p) => ({ ...p, slotCode: slot.slotCode, slotId: slot.slotId || slot.uiId }));
                          setOpenPanel(null);
                        }}
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
            )
          )}

          <button onClick={() => setStep(1)}
            disabled={!selection.vehicleId || !selection.slotCode || isSelectedVehicleLocked}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors">
            Tiếp tục — Chọn hình thức
          </button>
        </div>
      )}

      {/* ─── STEP 2: Hình thức (Theo giờ / Theo gói) ─────── */}
      {effectiveStep === 1 && !isSelectedVehicleLocked && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <Clock size={20} /> {isPackageMode ? "Chọn gói đỗ xe" : "Chọn thời gian"}
          </h3>

          {selectedSlot && (
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <SquareParking size={16} className="text-primary" />
              <span className="text-foreground font-medium">{selectedSlot.building} — {selectedSlot.floor} — {selectedSlot.zone} — {selectedSlot.slotCode}</span>
            </div>
          )}

          {/* Hình thức toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleModeChange("HOURLY")}
              className={`p-3 rounded-xl border-2 text-left transition-all ${!isPackageMode ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}>
              <p className={`font-semibold text-sm ${!isPackageMode ? "text-primary" : "text-foreground"}`}>Theo giờ</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cọc trước, trả phần còn lại khi ra</p>
            </button>
            <button type="button" onClick={() => handleModeChange("WEEKLY")}
              className={`p-3 rounded-xl border-2 text-left transition-all ${isPackageMode ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}>
              <p className={`font-semibold text-sm flex items-center gap-1.5 ${isPackageMode ? "text-primary" : "text-foreground"}`}><Package size={13} /> Theo gói</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ngày / tuần / tháng — thanh toán trọn gói</p>
            </button>
          </div>

          {!isPackageMode ? (
            <>
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
                          <th className="text-left px-3 py-2 font-semibold text-primary">Khung giờ</th>
                          <th className="text-right px-3 py-2 font-semibold text-primary">Đơn giá</th>
                          <th className="text-right px-3 py-2 font-semibold text-primary">Tính theo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const currentPolicy = resolveHourlyPolicy(hourlyPolicies, effectiveDayType, bookingStart.getHours(), bookingStart);
                          return hourlyPolicies.map((p) => {
                            const isActive = p.policyId === currentPolicy?.policyId;
                            const night = isNightRange(p.startHour, p.endHour);
                            return (
                              <tr key={p.policyId} className={`border-t border-primary/20 ${isActive ? "bg-primary/5" : night ? "bg-muted/20" : ""}`}>
                                <td className="px-3 py-2 text-foreground">
                                  {DAY_TYPE_LABELS[p.dayType] || p.dayType}
                                  {isActive && <span className="ml-1.5 text-[10px] text-primary font-semibold">◀ đang áp dụng</span>}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="font-medium text-foreground whitespace-nowrap">{formatHourRange(p.startHour, p.endHour)}</span>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${night ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-600"}`}>
                                      {night ? <Moon size={10} /> : <Sun size={10} />}
                                      {night ? "Ban đêm" : "Ban ngày"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-foreground">
                                  {Number(p.pricePerHour).toLocaleString("vi-VN")}đ/giờ
                                </td>
                                <td className="px-3 py-2 text-right text-muted-foreground">mỗi 30 phút</td>
                              </tr>
                            );
                          });
                        })()}
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
                  <span className="font-bold text-base">{estimatedDeposit > 0 ? `${vnd(estimatedDeposit)}đ` : "Miễn phí"}</span>
                </div>
                <p className="text-xs opacity-75">
                  {estimatedDeposit > 0
                    ? "Cọc tăng dần theo thời gian còn lại đến giờ hẹn — đặt càng sớm cọc càng thấp. Cọc được trừ vào tổng phí khi ra."
                    : selectedVehicle?.vehicleType?.name === "MOTORBIKE"
                      ? "Xe máy không yêu cầu đặt cọc."
                      : "Phí tính theo thời gian thực khi ra."}
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Loại gói */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Loại gói</label>
                <div className="grid grid-cols-2 gap-3">
                  {PACKAGE_OPTIONS.map((opt) => {
                    const policies = priceByType[opt.value] || [];
                    const policy =
                      latestEffectivePolicy(policies, bookingStart, (p) => p.dayType === effectiveDayType) ||
                      latestEffectivePolicy(policies, bookingStart, () => true) ||
                      policies[0];
                    const selected = bookingType === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => handleModeChange(opt.value)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${selected ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"}`}>
                        <p className={`font-semibold text-sm mb-0.5 ${selected ? "text-primary" : "text-foreground"}`}>{opt.label}</p>
                        {policy && (
                          <p className="text-[11px] text-muted-foreground">{Number(policy.pricePerHour).toLocaleString("vi-VN")}đ/{opt.unitLabel}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bảng giá gói */}
              {pricingPolicies.length > 0 && PACKAGE_OPTIONS.some((o) => priceByType[o.value]?.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Bảng giá gói</label>
                  <div className="rounded-xl border border-primary/30 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-primary/10">
                          <th className="text-left px-3 py-2 font-semibold text-primary">Gói</th>
                          <th className="text-left px-3 py-2 font-semibold text-primary">Loại ngày</th>
                          <th className="text-right px-3 py-2 font-semibold text-primary">Giá / kỳ</th>
                          <th className="text-right px-3 py-2 font-semibold text-primary">Quy đổi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PACKAGE_OPTIONS.filter((opt) => priceByType[opt.value]?.length > 0).flatMap((opt) => {
                          const optPolicies = priceByType[opt.value];
                          const resolvedForOpt =
                            latestEffectivePolicy(optPolicies, bookingStart, (p) => p.dayType === effectiveDayType) ||
                            latestEffectivePolicy(optPolicies, bookingStart, () => true) ||
                            optPolicies[0];
                          return optPolicies.map((p, i) => {
                            const active = bookingType === opt.value && p.policyId === resolvedForOpt?.policyId;
                            const perDay = Number(p.pricePerHour) / opt.days;
                            return (
                              <tr key={p.policyId} className={`border-t border-primary/20 ${active ? "bg-primary/5" : ""}`}>
                                <td className="px-3 py-2 font-medium text-foreground">
                                  {i === 0 ? opt.label : ""}
                                  {active && <span className="ml-1.5 text-[10px] text-primary font-semibold">◀ đang chọn</span>}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {p.dayType === "WEEKEND" ? "Cuối tuần" : p.dayType === "WEEKDAY" ? "Ngày thường" : p.dayType}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-foreground">
                                  {Number(p.pricePerHour).toLocaleString("vi-VN")}đ/{opt.unitLabel}
                                </td>
                                <td className="px-3 py-2 text-right text-muted-foreground">
                                  ≈ {Math.round(perDay).toLocaleString("vi-VN")}đ/ngày
                                </td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Ngày bắt đầu gói</label>
                <input type="datetime-local"
                  value={formatLocalDateTime(bookingStart).slice(0, 16)}
                  min={formatLocalDateTime(new Date(Date.now() + 10 * 60 * 1000)).slice(0, 16)}
                  onChange={(e) => { if (e.target.value) setBookingStart(new Date(e.target.value)); }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">Phải cách hiện tại ít nhất 10 phút</p>
              </div>

              {(() => {
                const pkgOpt = PACKAGE_OPTIONS.find((o) => o.value === bookingType);
                return (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Số {pkgOpt?.unitLabel} ({pkgOpt?.days} ngày/kỳ)
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setDurationUnits((n) => Math.max(1, n - 1))}
                        className="size-9 rounded-xl border border-border bg-background text-foreground font-bold text-lg hover:bg-muted transition-colors flex items-center justify-center">
                        −
                      </button>
                      <input type="number" min={1} max={12} value={durationUnits}
                        onChange={(e) => setDurationUnits(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground text-center font-medium" />
                      <button type="button" onClick={() => setDurationUnits((n) => Math.min(12, n + 1))}
                        className="size-9 rounded-xl border border-border bg-background text-foreground font-bold text-lg hover:bg-muted transition-colors flex items-center justify-center">
                        +
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Tóm tắt */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 px-4 py-4 text-sm text-emerald-800 dark:text-emerald-200 space-y-1.5">
                {(() => {
                  const pkgOpt = PACKAGE_OPTIONS.find((o) => o.value === bookingType);
                  return [
                    ["Gói", `${pkgOpt?.label} × ${durationUnits}`],
                    ["Bắt đầu", bookingStart.toLocaleString("vi-VN")],
                    ["Kết thúc", computeBookingEnd(bookingStart, bookingType, durationUnits).toLocaleString("vi-VN")],
                    ["Tổng ngày", `${durationUnits * (pkgOpt?.days || 7)} ngày`],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between"><span>{l}</span><span className="font-medium">{v}</span></div>
                  ));
                })()}
                {estimatedCost != null && (
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-500/30 mt-1">
                    <span className="font-semibold">
                      {bookingType === "DAILY" ? "Phí dự tính (trả khi ra)" : "Phí trọn gói cần thanh toán"}
                    </span>
                    <span className="font-bold text-base">{vnd(estimatedCost)}đ</span>
                  </div>
                )}
                <p className="text-xs opacity-75 pt-1">
                  {bookingType === "DAILY"
                    ? "Slot được giữ trọn ngày. Thanh toán phí khi ra cổng."
                    : "Thanh toán 1 lần qua VNPay. Sau đó vào/ra tự do."}
                </p>
              </div>
            </>
          )}

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
              isPackageMode
                ? ["Hình thức", `${PACKAGE_OPTIONS.find((o) => o.value === bookingType)?.label} × ${durationUnits}`]
                : ["Hình thức", "Theo giờ (tính khi ra)"],
              isPackageMode
                ? ["Bắt đầu gói", formatDateTime(bookingStart)]
                : ["Hẹn đến bãi", formatDateTime(bookingStart)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">{isPackageMode ? "Phí trọn gói dự kiến" : "Tiền cọc giữ chỗ"}</span>
              <span className="font-bold text-primary">{isPackageMode ? `${vnd(estimatedCost)}đ` : (estimatedDeposit > 0 ? `${vnd(estimatedDeposit)}đ` : "Miễn phí")}</span>
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

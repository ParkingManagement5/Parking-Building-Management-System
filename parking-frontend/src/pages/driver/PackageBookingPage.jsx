import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Car,
  History,
  LoaderCircle,
  MapPin,
  Package,
  SquareParking,
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

// ─── helpers ──────────────────────────────────────────────────────────────────
function slotClasses(status, active) {
  if (active) return "bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-2 ring-primary/40";
  if (status === "occupied") return "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400";
  if (status === "reserved")  return "bg-amber-400 text-white cursor-not-allowed dark:bg-amber-500/80";
  return "bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500/80 dark:hover:bg-emerald-400/90";
}

function formatDT(value) {
  if (!value) return "--";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("vi-VN");
}

function formatLocalDateTime(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function getErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
}

const vnd = (v) => new Intl.NumberFormat("vi-VN").format(v ?? 0);

const PACKAGE_OPTIONS = [
  { value: "DAILY",   label: "Gói ngày",  days: 1,  unitLabel: "ngày",  desc: "Trọn ngày · thanh toán khi ra cổng" },
  { value: "WEEKLY",  label: "Gói tuần",  days: 7,  unitLabel: "tuần",  desc: "7 ngày · vào/ra tự do · trả trọn gói" },
  { value: "MONTHLY", label: "Gói tháng", days: 30, unitLabel: "tháng", desc: "30 ngày · vào/ra tự do · giá ưu đãi" },
];

function computeEnd(start, type, units) {
  const d = new Date(start);
  const n = Math.max(1, Number(units) || 1);
  if (type === "DAILY")   d.setDate(d.getDate() + n);
  if (type === "WEEKLY")  d.setDate(d.getDate() + n * 7);
  if (type === "MONTHLY") d.setMonth(d.getMonth() + n);
  return d;
}

function isVehicleLocked(b) {
  const s = String(b?.status || "").toUpperCase();
  return ["PENDING_PAYMENT","CONFIRMED","CHECKED_IN","WAITING_PAYMENT"].includes(s);
}

function AlertBox({ children, variant = "error" }) {
  if (!children) return null;
  const cls = variant === "warn"
    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${cls}`}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" /><span>{children}</span>
    </div>
  );
}

const STEP_LABELS = ["Chọn slot", "Chọn gói", "Thanh toán"];

export default function PackageBookingPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [backendSlots, setBackendSlots] = useState([]);
  const [pricingPolicies, setPricingPolicies] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payingDeposit, setPayingDeposit] = useState(false);
  const [paid, setPaid] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [payError, setPayError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const [selection, setSelection] = useState({ vehicleId: "", building: "", floor: "", zone: "", slotCode: "", slotId: "" });
  const [pkgType, setPkgType]     = useState("WEEKLY");
  const [units, setUnits]         = useState(1);
  const [startTime, setStartTime] = useState(() => { const d = new Date(Date.now() + 15*60000); d.setSeconds(0,0); return d; });

  // load vehicles + my bookings
  useEffect(() => {
    (async () => {
      setLoadingVehicles(true);
      try {
        const [vRes, bRes] = await Promise.all([driverVehicleApi.getMyVehicles(), bookingApi.getMyBookings()]);
        setVehicles(unwrapApiData(vRes.data, []));
        setMyBookings(unwrapApiData(bRes.data, []));
      } catch { setLoadError("Không tải được danh sách xe."); }
      finally { setLoadingVehicles(false); }
    })();
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.vehicleId || v.id) === String(selection.vehicleId)),
    [vehicles, selection.vehicleId],
  );

  const vehiclesWithStatus = useMemo(() => vehicles.map((v) => {
    const vid = v.vehicleId || v.id;
    const active = myBookings.find((b) => String(b.vehicleId || b.vehicle?.id) === String(vid) && isVehicleLocked(b));
    return { ...v, vehicleId: vid, activeBooking: active || null, isLocked: Boolean(active) };
  }), [vehicles, myBookings]);

  const isLocked = Boolean(vehiclesWithStatus.find((v) => String(v.vehicleId) === String(selection.vehicleId))?.isLocked);

  // load slots when vehicle changes
  useEffect(() => {
    if (!selectedVehicle) { setBackendSlots([]); return; }
    const vtId = selectedVehicle.vehicleType?.vehicleTypeId ?? selectedVehicle.vehicleType?.id ?? selectedVehicle.vehicleTypeId;
    if (!vtId) { setBackendSlots([]); return; }
    setLoadingSlots(true);
    bookingApi.getAvailableSlots(vtId)
      .then((r) => setBackendSlots(unwrapApiData(r.data, [])))
      .catch(() => setBackendSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedVehicle]);

  // load pricing policies when vehicle changes
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

  const priceByType = useMemo(() => {
    const map = {};
    for (const opt of PACKAGE_OPTIONS) {
      map[opt.value] = pricingPolicies.filter((p) => p.timeType === opt.value);
    }
    return map;
  }, [pricingPolicies]);

  const effectiveDayType = useMemo(() => {
    const dow = startTime.getDay();
    return dow === 0 || dow === 6 ? "WEEKEND" : "WEEKDAY";
  }, [startTime]);

  const estimatedCost = useMemo(() => {
    const policies = priceByType[pkgType];
    if (!policies?.length) return null;
    const policy = policies.find((p) => p.dayType === effectiveDayType) || policies[0];
    return Number(policy.pricePerHour) * Number(units);
  }, [pkgType, units, effectiveDayType, priceByType]);

  const slotGrid = useMemo(
    () => backendSlots.map((s, i) => ({
      uiId: s.id || s.slotId || `${i}`,
      slotId: s.id || s.slotId || "",
      slotCode: s.slotCode || `S${i+1}`,
      status: String(s.status || "available").toLowerCase(),
      floor: s.zone?.floor?.floorName || s.zone?.floor?.name || "Tầng chưa rõ",
      zone: s.zone?.zoneName || s.zone?.name || "Khu chưa rõ",
      building: s.zone?.floor?.building?.name || "Toà chưa rõ",
    })),
    [backendSlots],
  );

  const buildingOpts = useMemo(() => [...new Set(slotGrid.map((s) => s.building))], [slotGrid]);
  const floorOpts    = useMemo(() => [...new Set(slotGrid.filter((s) => !selection.building || s.building === selection.building).map((s) => s.floor))], [slotGrid, selection.building]);
  const zoneOpts     = useMemo(() => [...new Set(slotGrid.filter((s) => (!selection.building || s.building === selection.building) && (!selection.floor || s.floor === selection.floor)).map((s) => s.zone))], [slotGrid, selection.building, selection.floor]);
  const filteredGrid = useMemo(() => slotGrid.filter((s) => (!selection.building || s.building === selection.building) && (!selection.floor || s.floor === selection.floor) && (!selection.zone || s.zone === selection.zone)), [slotGrid, selection.building, selection.floor, selection.zone]);
  const selectedSlot = useMemo(() => filteredGrid.find((s) => String(s.slotId || s.uiId) === String(selection.slotId || selection.slotCode) || s.slotCode === selection.slotCode), [filteredGrid, selection.slotCode, selection.slotId]);

  async function handleSubmit() {
    if (!selection.vehicleId || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await bookingApi.create({
        vehicleId: Number(selection.vehicleId),
        slotId: Number(selectedSlot.slotId),
        bookingStartTime: formatLocalDateTime(startTime),
        bookingType: pkgType,
        durationUnits: Number(units),
      });
      const p = unwrapApiData(res.data, {});
      setConfirmation({
        bookingId: p.bookingId, status: p.status,
        depositAmount: p.depositAmount,
        expiredAt: p.expiredAt,
        bookingStartTime: p.bookingStartTime || formatLocalDateTime(startTime),
        bookingEndTime: p.bookingEndTime,
        building: selectedSlot.building, floor: selectedSlot.floor,
        zone: selectedSlot.zone, slotCode: p.slotCode || selectedSlot.slotCode,
        vehiclePlate: p.licensePlate || selectedVehicle?.licensePlate || "Xe",
        pkgType, units: Number(units), estimatedCost,
      });
      setStep(2);
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Tạo booking thất bại. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePay() {
    if (!confirmation?.bookingId) return;
    setPayingDeposit(true);
    setPayError("");
    try {
      const amount = Number(confirmation.depositAmount || 0);
      if (amount > 0) {
        const res = await paymentApi.createVnpayDepositUrl(confirmation.bookingId);
        const data = unwrapApiData(res.data, null);
        if (data?.paymentUrl) { window.location.href = data.paymentUrl; return; }
        throw new Error("Không lấy được URL thanh toán VNPay");
      } else {
        // DAILY: depositAmount = 0, auto-confirm CASH
        const depositRes = await paymentApi.createDeposit({
          bookingId: Number(confirmation.bookingId),
          depositAmount: 0,
          paymentMethod: "CASH",
        });
        const deposit = unwrapApiData(depositRes.data, null);
        if (deposit?.paymentId) await paymentApi.confirmDeposit(deposit.paymentId);
        setPaid(true);
        setConfirmation((p) => ({ ...p, status: "CONFIRMED" }));
      }
    } catch (err) {
      setPayError(getErrorMessage(err, "Xác nhận đặt chỗ thất bại."));
    } finally {
      setPayingDeposit(false);
    }
  }

  function reset() {
    setSelection({ vehicleId: "", building: "", floor: "", zone: "", slotCode: "", slotId: "" });
    setBackendSlots([]);
    setConfirmation(null);
    setSubmitError("");
    setPayError("");
    setPaid(false);
    setStep(0);
  }

  const pkgOpt = PACKAGE_OPTIONS.find((o) => o.value === pkgType);

  // ── Step 2: Payment card ────────────────────────────────────────────────────
  if (step === 2 && confirmation) {
    const confPkgOpt = PACKAGE_OPTIONS.find((o) => o.value === confirmation.pkgType);
    const isDaily = confirmation.pkgType === "DAILY";
    const rows = [
      ["Mã đặt chỗ",  `#${confirmation.bookingId}`],
      ["Trạng thái",  confirmation.status],
      ["Toà nhà",     confirmation.building],
      ["Tầng / Khu",  `${confirmation.floor} — ${confirmation.zone}`],
      ["Slot",        confirmation.slotCode],
      ["Loại",        confPkgOpt?.label || confirmation.pkgType],
      ...(!isDaily ? [["Thời hạn", `${confirmation.units} ${confPkgOpt?.unitLabel || "kỳ"} (${confirmation.units * (confPkgOpt?.days || 7)} ngày)`]] : []),
      ["Bắt đầu",     formatDT(confirmation.bookingStartTime)],
      ["Kết thúc",    formatDT(confirmation.bookingEndTime)],
      ...(isDaily
        ? [["Phí dự tính (trả khi ra)", `${vnd(confirmation.estimatedCost ?? 0)} VND`, "font-bold text-emerald-600"]]
        : [
            ["Phí trọn gói", `${vnd(confirmation.depositAmount)} VND`, "font-bold text-emerald-600"],
            ["Hạn thanh toán", formatDT(confirmation.expiredAt)],
          ]),
      ["Xe",          confirmation.vehiclePlate],
    ];
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${paid ? "bg-emerald-100 dark:bg-emerald-500/15" : "bg-amber-100 dark:bg-amber-500/15"}`}>
            {paid ? <CheckCircle2 size={30} className="text-emerald-600 dark:text-emerald-300" /> : <Package size={30} className="text-amber-600 dark:text-amber-300" />}
          </div>
          <h3 className="font-bold text-foreground mb-1 text-xl">
            {isDaily
              ? (paid ? "Đặt chỗ thành công — QR sẵn sàng" : "Đặt chỗ thành công")
              : (paid ? "Đăng ký gói thành công — QR sẵn sàng" : "Đăng ký gói thành công — Cần thanh toán")}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {isDaily
              ? (paid
                  ? "Slot đã xác nhận. Vào Lịch sử đặt chỗ để xem mã QR check-in. Thanh toán phí khi ra cổng."
                  : "Nhấn xác nhận để lấy mã QR check-in. Phí sẽ tính khi ra cổng.")
              : (paid
                  ? "Phí gói đã thanh toán. Vào Lịch sử đặt chỗ để xem mã QR. Vào/ra tự do trong suốt kỳ hạn."
                  : "Thanh toán phí gói qua VNPay để nhận mã QR. Sau đó vào/ra tự do không cần thanh toán thêm.")}
          </p>
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
            {rows.map(([label, value, cls]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-medium text-foreground ${cls || ""}`}>{value}</span>
              </div>
            ))}
          </div>
          {!isDaily && (
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
            {!paid ? (
              <button onClick={handlePay} disabled={payingDeposit}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60">
                {payingDeposit
                  ? "Đang xử lý..."
                  : isDaily
                    ? "Xác nhận đặt chỗ (trả khi ra)"
                    : `Thanh toán ${vnd(confirmation.depositAmount)} VND qua VNPay`}
              </button>
            ) : (
              <button onClick={() => navigate("/driver/bookings")}
                className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors">
                Xem QR Check-in
              </button>
            )}
            <button onClick={reset} className="w-full border border-border text-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-muted transition-colors">
              Đặt lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step header ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* shortcuts */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { to: "/driver/booking",  icon: SquareParking, title: "Đặt chỗ theo giờ", desc: "Đặt chỗ theo giờ, cọc trước qua VNPay" },
          { to: "/driver/bookings", icon: History,        title: "Lịch sử đặt chỗ",   desc: "Xem QR, trạng thái booking" },
        ].map(({ to, icon: Icon, title, desc }) => (
          <button key={to} type="button" onClick={() => navigate(to)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40">
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

      {/* step indicator */}
      <div className="flex items-center gap-0">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 0: Chọn xe & slot ───────────────────────────── */}
      {step === 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <Car size={20} /> Chọn xe & vị trí đỗ
          </h3>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Xe của bạn</label>
            <Select value={selection.vehicleId}
              onValueChange={(v) => setSelection({ vehicleId: v, building: "", floor: "", zone: "", slotCode: "", slotId: "" })}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-background px-4 text-sm" disabled={loadingVehicles}>
                <SelectValue placeholder={loadingVehicles ? "Đang tải xe..." : "Chọn xe"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border bg-card shadow-xl">
                {vehiclesWithStatus.map((v) => {
                  const tName = v.vehicleType?.name;
                  const tLabel = tName === "CAR" ? "Ô tô" : tName === "MOTORBIKE" ? "Xe máy" : tName || "";
                  return (
                    <SelectItem key={v.vehicleId} value={String(v.vehicleId)} disabled={v.isLocked} className="rounded-lg px-3 py-2 text-sm">
                      {v.licensePlate}{tLabel ? ` (${tLabel})` : ""}
                      {v.isLocked ? ` — đang có booking #${v.activeBooking?.bookingId || v.activeBooking?.id}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {isLocked && <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Xe này đang có booking chưa hoàn tất. Vui lòng chọn xe khác.</p>}
          </div>

          {selection.vehicleId && loadingSlots && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle size={16} className="animate-spin" /> Đang tải slot phù hợp...
            </div>
          )}

          {selection.vehicleId && !isLocked && buildingOpts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Toà nhà</label>
              <div className="grid grid-cols-2 gap-3">
                {buildingOpts.map((b) => (
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

          {!loadingSlots && selection.vehicleId && !isLocked && buildingOpts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Không có slot trống phù hợp với loại xe này.
            </div>
          )}

          {selection.building && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tầng</label>
                <div className="space-y-1.5">
                  {floorOpts.map((f) => (
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
                  {zoneOpts.map((z) => (
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
                  {[["bg-emerald-500","Trống"],["bg-gray-300 dark:bg-gray-600","Đã đỗ"],["bg-amber-400","Đã giữ"]].map(([cls, lbl]) => (
                    <span key={lbl} className="flex items-center gap-1"><span className={`size-3 rounded-sm ${cls}`}/><span className="text-muted-foreground">{lbl}</span></span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-4 bg-muted/30 rounded-xl">
                {filteredGrid.map((slot) => {
                  const blocked = slot.status !== "available";
                  const active  = slot.slotCode === selection.slotCode || String(slot.slotId) === String(selection.slotId);
                  return (
                    <button key={slot.uiId} disabled={blocked}
                      onClick={() => setSelection((p) => ({ ...p, slotCode: slot.slotCode, slotId: slot.slotId || slot.uiId }))}
                      className={`rounded-lg aspect-square flex items-center justify-center text-[10px] font-mono font-bold transition-all ${slotClasses(slot.status, active)}`}>
                      {slot.slotCode}
                    </button>
                  );
                })}
              </div>
              {filteredGrid.length === 0 && <p className="mt-3 text-center text-sm text-muted-foreground">Không có slot nào ở khu vực này.</p>}
            </div>
          )}

          <button onClick={() => setStep(1)}
            disabled={!selection.vehicleId || !selection.slotCode || isLocked}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors">
            Tiếp tục — Chọn gói
          </button>
        </div>
      )}

      {/* ── STEP 1: Chọn gói ────────────────────────────────── */}
      {step === 1 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
            <Package size={20} /> Chọn gói đỗ xe
          </h3>

          {selectedSlot && (
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <SquareParking size={16} className="text-primary" />
              <span className="font-medium text-foreground">{selectedSlot.building} — {selectedSlot.floor} — {selectedSlot.zone} — <strong>{selectedSlot.slotCode}</strong></span>
            </div>
          )}

          {/* Package type selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Loại gói</label>
            <div className="grid grid-cols-2 gap-3">
              {PACKAGE_OPTIONS.map((opt) => {
                const policies = priceByType[opt.value];
                const policy   = policies?.find((p) => p.dayType === effectiveDayType) || policies?.[0];
                const selected = pkgType === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => { setPkgType(opt.value); setUnits(1); }}
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

          {/* Bảng giá */}
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
                    {PACKAGE_OPTIONS.filter((opt) => priceByType[opt.value]?.length > 0).flatMap((opt) =>
                      priceByType[opt.value].map((p, i) => {
                        const active = pkgType === opt.value && (p.dayType === effectiveDayType || priceByType[opt.value].length === 1);
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ngày bắt đầu */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Ngày bắt đầu gói</label>
            <input type="datetime-local"
              value={formatLocalDateTime(startTime).slice(0, 16)}
              min={formatLocalDateTime(new Date(Date.now() + 10*60000)).slice(0, 16)}
              onChange={(e) => { if (e.target.value) setStartTime(new Date(e.target.value)); }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">Phải cách hiện tại ít nhất 10 phút</p>
          </div>

          {/* Số kỳ */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Số {pkgOpt?.unitLabel} ({pkgOpt?.days} ngày/kỳ)
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setUnits((n) => Math.max(1, n-1))}
                className="size-9 rounded-xl border border-border bg-background text-foreground font-bold text-lg hover:bg-muted transition-colors flex items-center justify-center">
                −
              </button>
              <input type="number" min={1} max={12} value={units}
                onChange={(e) => setUnits(Math.max(1, Math.min(12, Number(e.target.value)||1)))}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground text-center font-medium" />
              <button type="button" onClick={() => setUnits((n) => Math.min(12, n+1))}
                className="size-9 rounded-xl border border-border bg-background text-foreground font-bold text-lg hover:bg-muted transition-colors flex items-center justify-center">
                +
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 px-4 py-4 text-sm text-emerald-800 dark:text-emerald-200 space-y-1.5">
            {[
              ["Gói", `${pkgOpt?.label} × ${units}`],
              ["Bắt đầu", startTime.toLocaleString("vi-VN")],
              ["Kết thúc", computeEnd(startTime, pkgType, units).toLocaleString("vi-VN")],
              ["Tổng ngày", `${units * (pkgOpt?.days || 7)} ngày`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between"><span>{l}</span><span className="font-medium">{v}</span></div>
            ))}
            {estimatedCost != null && (
              <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-500/30 mt-1">
                <span className="font-semibold">
                  {pkgType === "DAILY" ? "Phí dự tính (trả khi ra)" : "Phí trọn gói cần thanh toán"}
                </span>
                <span className="font-bold text-base">{estimatedCost.toLocaleString("vi-VN")}đ</span>
              </div>
            )}
            <p className="text-xs opacity-75 pt-1">
              {pkgType === "DAILY"
                ? "Slot được giữ trọn ngày. Thanh toán phí khi ra cổng."
                : "Thanh toán 1 lần qua VNPay. Sau đó vào/ra tự do."}
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 rounded-xl border border-border py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
              Quay lại
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {submitting ? <span className="flex items-center justify-center gap-2"><LoaderCircle size={14} className="animate-spin"/>Đang xử lý...</span> : "Đăng ký & Thanh toán"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

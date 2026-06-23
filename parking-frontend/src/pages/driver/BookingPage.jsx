import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  History,
  LoaderCircle,
  MapPin,
  SquareParking,
} from "lucide-react";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverVehicleApi } from "../../api/driver/driverVehicleApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/components/ui/select";
import { unwrapApiData } from "../../utils/api";

function slotClasses(status, active) {
  if (active) {
    return "bg-primary text-primary-foreground shadow-md shadow-primary/20";
  }

  if (status === "occupied") {
    return "bg-rose-400 text-white cursor-not-allowed dark:bg-rose-500/80";
  }

  if (status === "reserved") {
    return "bg-amber-400 text-white cursor-not-allowed dark:bg-amber-500/80";
  }

  return "bg-emerald-400 text-white hover:brightness-95 dark:bg-emerald-500/80";
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("vi-VN");
}

function formatLocalDateTime(value) {
  const pad = (number) => String(number).padStart(2, "0");

  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join("-") + `T${[
    pad(value.getHours()),
    pad(value.getMinutes()),
    pad(value.getSeconds()),
  ].join(":")}`;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function isOpenBooking(booking) {
  const status = String(booking?.status || booking?.bookingStatus || "").toUpperCase();
  const qrUsed = booking?.qrUsed === true || Boolean(booking?.qrUsedAt);
  const expiryValue = booking?.expiredAt || booking?.bookingEndTime;
  const expiresAt = expiryValue ? new Date(expiryValue).getTime() : null;
  const isExpired = Number.isFinite(expiresAt) && expiresAt < Date.now();
  return status === "PENDING_PAYMENT" || (status === "CONFIRMED" && !qrUsed && !isExpired);
}

function isVehicleBlockingBooking(booking) {
  const status = String(booking?.status || booking?.bookingStatus || "").toUpperCase();
  return isOpenBooking(booking) || status === "CHECKED_IN" || status === "WAITING_PAYMENT";
}

export default function BookingPage() {
  const navigate = useNavigate();
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
  const [bookingStart, setBookingStart] = useState(() => {
    const d = new Date(Date.now() + 15 * 60 * 1000);
    d.setSeconds(0, 0);
    return d;
  });
  const [bookingDurationHours, setBookingDurationHours] = useState(2);
  const [selection, setSelection] = useState({
    building: "",
    floor: "",
    zone: "",
    slotCode: "",
    slotId: "",
    vehicleId: "",
  });

  useEffect(() => {
    async function loadVehicles() {
      setLoadingVehicles(true);
      setLoadError("");
      try {
        const [vehiclesRes, bookingsRes] = await Promise.all([
          driverVehicleApi.getMyVehicles(),
          bookingApi.getMyBookings(),
        ]);
        setVehicles(unwrapApiData(vehiclesRes.data, []));
        setMyBookings(unwrapApiData(bookingsRes.data, []));
      } catch (error) {
        console.error("Failed to load driver vehicles", error);
        setVehicles([]);
        setMyBookings([]);
        setLoadError("Khong tai duoc danh sach xe cua ban.");
      } finally {
        setLoadingVehicles(false);
      }
    }

    void loadVehicles();
  }, []);

  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (item) => String(item.vehicleId || item.id) === String(selection.vehicleId)
      ),
    [vehicles, selection.vehicleId]
  );

  const vehiclesWithStatus = useMemo(() => {
    return vehicles.map((vehicle) => {
      const vehicleId = vehicle.vehicleId || vehicle.id;
      const activeBooking = myBookings.find((booking) => {
        const bookingVehicleId = booking.vehicleId || booking.vehicle?.id;
        return String(bookingVehicleId) === String(vehicleId) && isVehicleBlockingBooking(booking);
      });
      const conflictBooking =
        String(conflictLock?.vehicleId || "") === String(vehicleId)
          ? conflictLock
          : null;

      return {
        ...vehicle,
        vehicleId,
        activeBooking: activeBooking || conflictBooking,
        isLocked: Boolean(activeBooking || conflictBooking),
      };
    });
  }, [conflictLock, vehicles, myBookings]);

  useEffect(() => {
    async function loadAvailableSlots() {
      if (!selectedVehicle) {
        setBackendSlots([]);
        return;
      }

      const vehicleTypeId =
        selectedVehicle.vehicleType?.vehicleTypeId ??
        selectedVehicle.vehicleType?.id ??
        selectedVehicle.vehicleTypeId;

      if (!vehicleTypeId) {
        setBackendSlots([]);
        setLoadError("Khong xac dinh duoc loai xe de tim slot phu hop.");
        return;
      }

      setLoadingSlots(true);
      setLoadError("");
      try {
        const slotsRes = await bookingApi.getAvailableSlots(vehicleTypeId);
        setBackendSlots(unwrapApiData(slotsRes.data, []));
      } catch (error) {
        console.error("Failed to load available slots", error);
        setBackendSlots([]);
        setLoadError("Khong tai duoc danh sach slot trong tu backend.");
      } finally {
        setLoadingSlots(false);
      }
    }

    void loadAvailableSlots();
  }, [selectedVehicle]);

  const slotGrid = useMemo(
    () =>
      backendSlots.map((item, index) => ({
        uiId: item.id || item.slotId || `${index}`,
        slotId: item.id || item.slotId || "",
        slotCode: item.slotCode || `S${index + 1}`,
        status: String(item.status || "available").toLowerCase(),
        floor: item.zone?.floor?.floorName || item.zone?.floor?.name || "Unknown floor",
        zone: item.zone?.zoneName || item.zone?.name || "Unknown zone",
        building: item.zone?.floor?.building?.name || "Unknown building",
      })),
    [backendSlots]
  );

  const buildingOptions = useMemo(
    () =>
      Array.from(
        new Map(
          slotGrid.map((item) => [item.building, { id: item.building, name: item.building }])
        ).values()
      ),
    [slotGrid]
  );

  const floorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          slotGrid
            .filter((item) => !selection.building || item.building === selection.building)
            .map((item) => item.floor)
        )
      ),
    [slotGrid, selection.building]
  );

  const zoneOptions = useMemo(
    () =>
      Array.from(
        new Set(
          slotGrid
            .filter(
              (item) =>
                (!selection.building || item.building === selection.building) &&
                (!selection.floor || item.floor === selection.floor)
            )
            .map((item) => item.zone)
        )
      ),
    [slotGrid, selection.building, selection.floor]
  );

  const filteredSlotGrid = useMemo(
    () =>
      slotGrid.filter(
        (item) =>
          (!selection.building || item.building === selection.building) &&
          (!selection.floor || item.floor === selection.floor) &&
          (!selection.zone || item.zone === selection.zone)
      ),
    [slotGrid, selection.building, selection.floor, selection.zone]
  );

  const selectedSlot = useMemo(
    () =>
      filteredSlotGrid.find(
        (item) =>
          String(item.slotId || item.uiId) === String(selection.slotId || selection.slotCode) ||
          item.slotCode === selection.slotCode
      ),
    [filteredSlotGrid, selection.slotCode, selection.slotId]
  );

  const steps = ["Vehicle & Building", "Floor & Zone", "Select Slot", "Result"];
  const selectedVehicleBooking = vehiclesWithStatus.find(
    (vehicle) => String(vehicle.vehicleId) === String(selection.vehicleId)
  );
  const lockedBooking = selectedVehicleBooking?.activeBooking || null;
  const isSelectedVehicleLocked = Boolean(selectedVehicleBooking?.isLocked);
  const effectiveStep = isSelectedVehicleLocked ? 0 : step;

  useEffect(() => {
    if (!isSelectedVehicleLocked) {
      return;
    }

    setSelection((prev) => ({
      ...prev,
      building: "",
      floor: "",
      zone: "",
      slotCode: "",
      slotId: "",
    }));
    setBackendSlots([]);
    setSubmitError("");
    setConfirmation(null);
    setStep(0);
  }, [isSelectedVehicleLocked]);

  async function handleConfirm() {
    if (!selection.vehicleId || !selectedSlot || isSelectedVehicleLocked) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const start = bookingStart;
      const end = new Date(start.getTime() + bookingDurationHours * 60 * 60 * 1000);
      const minutesUntilStart = (start.getTime() - Date.now()) / 60000;
      if (minutesUntilStart < 10) {
        setSubmitError("Thoi gian bat dau phai cach hien tai it nhat 10 phut.");
        setSubmitting(false);
        return;
      }
      const res = await bookingApi.create({
        vehicleId: Number(selection.vehicleId),
        slotId: Number(selectedSlot.slotId),
        bookingStartTime: formatLocalDateTime(start),
        bookingEndTime: formatLocalDateTime(end),
      });

      const payload = res.data?.data || res.data || {};
      setConfirmation({
        bookingId: payload.bookingId,
        status: payload.status,
        depositAmount: payload.depositAmount,
        expiredAt: payload.expiredAt,
        building: selectedSlot.building,
        floor: selectedSlot.floor,
        zone: selectedSlot.zone,
        slotCode: payload.slotCode || selectedSlot.slotCode,
        vehiclePlate:
          payload.licensePlate || selectedVehicle?.licensePlate || "Vehicle",
      });
      setStep(3);
    } catch (error) {
      console.error("Create booking failed", error);
      const message = getErrorMessage(error, "Tao booking that bai. Vui long thu lai.");
      setSubmitError(message);
      if (error?.response?.status === 409 && /booking active/i.test(message)) {
        const bookingId = message.match(/#(\d+)/)?.[1];
        setConflictLock({
          bookingId,
          vehicleId: selection.vehicleId,
          status: "CONFLICT",
        });
        setSelection((prev) => ({
          ...prev,
          building: "",
          floor: "",
          zone: "",
          slotCode: "",
          slotId: "",
        }));
        setBackendSlots([]);
        setStep(0);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (effectiveStep === 3 && confirmation) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-emerald-500/15">
            <CheckCircle2 size={30} className="text-emerald-600 dark:text-emerald-300" />
          </div>
          <h3 className="font-bold text-foreground mb-1 text-[1.25rem]">Booking Created</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Booking da duoc tao tren backend that. Hien tai booking dang cho thanh toan coc.
          </p>
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Booking ID</span>
              <span className="font-medium text-foreground">#{confirmation.bookingId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-foreground">{confirmation.status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Building</span>
              <span className="font-medium text-foreground">{confirmation.building}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Floor</span>
              <span className="font-medium text-foreground">{confirmation.floor}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Slot</span>
              <span className="font-medium text-foreground">
                {confirmation.zone} - {confirmation.slotCode}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deposit</span>
              <span className="font-medium text-foreground">{confirmation.depositAmount ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pay before</span>
              <span className="font-medium text-foreground">
                {formatDateTime(confirmation.expiredAt)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vehicle</span>
              <span className="font-medium text-foreground">{confirmation.vehiclePlate}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setSelection({
                building: "",
                floor: "",
                zone: "",
                slotCode: "",
                slotId: "",
                vehicleId: "",
              });
              setBackendSlots([]);
              setConfirmation(null);
              setSubmitError("");
              setStep(0);
            }}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            New Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate("/driver/parking-slots")}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <SquareParking size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">Available slots</span>
            <span className="block text-xs text-muted-foreground">Browse live slot status by vehicle type.</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/driver/bookings")}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">Booking history</span>
            <span className="block text-xs text-muted-foreground">Review deposits, Entry QR, and booking status.</span>
          </span>
        </button>
      </div>

      {loadError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {submitError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      ) : null}

      {isSelectedVehicleLocked && lockedBooking ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>
            Xe nay dang co booking/phien chua hoan tat (#{lockedBooking.bookingId || lockedBooking.id}).
            Vui long hoan tat vao/ra cong, thanh toan, hoac huy booking cu truoc khi tao booking moi.
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-0">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  index <= effectiveStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index < effectiveStep ? <Check size={12} /> : index + 1}
              </div>
              <span
                className={`text-xs ${
                  index === effectiveStep ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${index < effectiveStep ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {effectiveStep === 0 ? (
          <div>
            <h3 className="font-semibold text-foreground mb-4">Select Vehicle And Building</h3>

            <div className="mb-4">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Select Vehicle
              </label>
              <Select
                value={selection.vehicleId}
                onValueChange={(value) => {
                  setConflictLock(null);
                  setSelection({
                    building: "",
                    floor: "",
                    zone: "",
                    slotCode: "",
                    slotId: "",
                    vehicleId: value,
                  });
                }}
              >
                <SelectTrigger
                  className="h-12 rounded-xl border-border bg-background/80 px-4 text-sm text-foreground shadow-sm shadow-black/5 hover:border-primary/40 hover:bg-muted/40"
                  disabled={loadingVehicles}
                >
                  <SelectValue
                    placeholder={loadingVehicles ? "Loading vehicles..." : "Choose a vehicle"}
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-card shadow-xl">
                  {vehiclesWithStatus.map((vehicle) => (
                    <SelectItem
                      key={vehicle.vehicleId || vehicle.id}
                      value={String(vehicle.vehicleId || vehicle.id)}
                      disabled={vehicle.isLocked}
                      className="rounded-lg px-3 py-2 text-sm"
                    >
                      {vehicle.licensePlate}
                      {vehicle.isLocked
                        ? ` - unfinished #${vehicle.activeBooking.bookingId || vehicle.activeBooking.id}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selection.vehicleId && selectedVehicle ? (
              isSelectedVehicleLocked ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  Xe nay dang co booking/phien chua hoan tat. Vui long hoan tat thanh toan hoac chon xe khac.
                </div>
              ) : null
            ) : null}

            {selection.vehicleId && loadingSlots ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <LoaderCircle size={16} className="animate-spin" />
                Loading available slots for this vehicle...
              </div>
            ) : null}

            {selection.vehicleId ? (
              <div className="grid grid-cols-2 gap-3">
                {buildingOptions.map((building) => (
                  <button
                    key={building.id}
                    onClick={() =>
                      setSelection((prev) => ({
                        ...prev,
                        building: building.name,
                        floor: "",
                        zone: "",
                        slotCode: "",
                        slotId: "",
                      }))
                    }
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selection.building === building.name
                        ? "border-primary/70 bg-primary/10 shadow-sm shadow-primary/10"
                        : "border-border bg-background/80 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div
                      className={`mb-2 flex size-8 items-center justify-center rounded-lg ${
                        selection.building === building.name
                          ? "bg-primary/15 text-primary"
                          : "bg-muted/70 text-muted-foreground"
                      }`}
                    >
                      <MapPin size={14} />
                    </div>
                    <p className="font-medium text-sm text-foreground">{building.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {slotGrid.filter((item) => item.building === building.name).length} slots
                      available
                    </p>
                  </button>
                ))}
              </div>
            ) : null}

            {!loadingSlots && selection.vehicleId && buildingOptions.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Khong co slot AVAILABLE nao phu hop voi xe nay.
              </div>
            ) : null}

            <button
              onClick={() => setStep(1)}
              disabled={
                !selection.vehicleId ||
                !selection.building ||
                isSelectedVehicleLocked
              }
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted"
            >
              Next -&gt;
            </button>
          </div>
        ) : null}

        {effectiveStep === 1 && !isSelectedVehicleLocked ? (
          <div>
            <h3 className="font-semibold text-foreground mb-4">Floor &amp; Zone</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Floor
                </label>
                <div className="space-y-2">
                  {floorOptions.map((floor) => (
                    <button
                      key={floor}
                      onClick={() =>
                        setSelection((prev) => ({
                          ...prev,
                          floor,
                          zone: "",
                          slotCode: "",
                          slotId: "",
                        }))
                      }
                      className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${
                        selection.floor === floor
                          ? "border-primary/70 bg-primary/10 text-primary font-medium shadow-sm shadow-primary/10"
                          : "border-border bg-background/80 hover:border-primary/40 hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      {floor}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Zone
                </label>
                <div className="space-y-2">
                  {zoneOptions.map((zone) => (
                    <button
                      key={zone}
                      onClick={() =>
                        setSelection((prev) => ({
                          ...prev,
                          zone,
                          slotCode: "",
                          slotId: "",
                        }))
                      }
                      className={`w-full text-left p-2.5 rounded-xl border text-sm transition-all ${
                        selection.zone === zone
                          ? "border-primary/70 bg-primary/10 text-primary font-medium shadow-sm shadow-primary/10"
                          : "border-border bg-background/80 hover:border-primary/40 hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      {zone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selection.floor || !selection.zone}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted"
              >
                Next -&gt;
              </button>
            </div>
          </div>
        ) : null}

        {effectiveStep === 2 && !isSelectedVehicleLocked ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Select a Slot</h3>
              <div className="flex items-center gap-3 text-xs">
                {[
                  ["bg-emerald-400 dark:bg-emerald-500/80", "Available"],
                  ["bg-rose-400 dark:bg-rose-500/80", "Occupied"],
                  ["bg-amber-400 dark:bg-amber-500/80", "Reserved"],
                ].map(([cls, label]) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className={`size-3 rounded-sm ${cls}`} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-8 gap-1.5 mb-5 p-4 bg-muted/30 rounded-xl">
              {filteredSlotGrid.map((slot) => {
                const blocked = slot.status !== "available";
                const active =
                  slot.slotCode === selection.slotCode ||
                  String(slot.slotId) === String(selection.slotId);

                return (
                  <button
                    key={slot.uiId}
                    disabled={blocked}
                    onClick={() =>
                      setSelection((prev) => ({
                        ...prev,
                        slotCode: slot.slotCode,
                        slotId: slot.slotId || slot.uiId,
                      }))
                    }
                    className={`rounded-md aspect-[1.5] flex items-center justify-center text-[9px] font-mono font-bold transition-all ${slotClasses(
                      slot.status,
                      active
                    )}`}
                  >
                    {slot.slotCode}
                  </button>
                );
              })}
            </div>

            {filteredSlotGrid.length === 0 ? (
              <div className="mb-4 rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Khong co slot nao khop voi building, floor, zone da chon.
              </div>
            ) : null}

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Start time (min 10 min from now)
                </label>
                <input
                  type="datetime-local"
                  value={formatLocalDateTime(bookingStart).slice(0, 16)}
                  min={formatLocalDateTime(new Date(Date.now() + 10 * 60 * 1000)).slice(0, 16)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) setBookingStart(new Date(val));
                  }}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Duration (hours)
                </label>
                <select
                  value={bookingDurationHours}
                  onChange={(e) => setBookingDurationHours(Number(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                >
                  {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                    <option key={h} value={h}>{h} {h === 1 ? "hour" : "hours"}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selection.vehicleId || !selection.slotCode || submitting || isSelectedVehicleLocked}
                className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted"
              >
                {submitting ? "Creating..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

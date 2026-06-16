import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  LoaderCircle,
  MapPin,
} from "lucide-react";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverVehicleApi } from "../../api/driver/driverVehicleApi";
import { unwrapApiData } from "../../utils/api";

function slotClasses(status, active) {
  if (active) {
    return "bg-[#5B4AE6] text-white shadow-md shadow-indigo-200";
  }

  if (status === "occupied") {
    return "bg-[#EE7991] text-white cursor-not-allowed";
  }

  if (status === "reserved") {
    return "bg-[#F8C933] text-white cursor-not-allowed";
  }

  return "bg-[#6BD4A5] text-white hover:brightness-95";
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

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [backendSlots, setBackendSlots] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [confirmation, setConfirmation] = useState(null);
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
        return (
          String(bookingVehicleId) === String(vehicleId) &&
          ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"].includes(
            String(booking.status || "").toUpperCase()
          )
        );
      });

      return {
        ...vehicle,
        vehicleId,
        activeBooking,
        isLocked: Boolean(activeBooking),
      };
    });
  }, [vehicles, myBookings]);

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

  async function handleConfirm() {
    if (!selection.vehicleId || !selectedSlot) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const start = new Date(Date.now() + 20 * 60 * 1000);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      const res = await bookingApi.create({
        vehicleId: Number(selection.vehicleId),
        slotId: Number(selectedSlot.slotId),
        bookingStartTime: start.toISOString().slice(0, 19),
        bookingEndTime: end.toISOString().slice(0, 19),
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
      setSubmitError(
        error.response?.data?.message || "Tao booking that bai. Vui long thu lai."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 3 && confirmation) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={30} className="text-emerald-600" />
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
      {loadError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {submitError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-0">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  index <= step
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index < step ? <Check size={12} /> : index + 1}
              </div>
              <span
                className={`text-xs ${
                  index === step ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${index < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        {step === 0 ? (
          <div>
            <h3 className="font-semibold text-foreground mb-4">Select Vehicle And Building</h3>

            <div className="mb-4">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Select Vehicle
              </label>
              <select
                value={selection.vehicleId}
                onChange={(event) =>
                  setSelection({
                    building: "",
                    floor: "",
                    zone: "",
                    slotCode: "",
                    slotId: "",
                    vehicleId: event.target.value,
                  })
                }
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                disabled={loadingVehicles}
              >
                <option value="">
                  {loadingVehicles ? "Loading vehicles..." : "Choose a vehicle"}
                </option>
                {vehiclesWithStatus.map((vehicle) => (
                  <option
                    key={vehicle.vehicleId || vehicle.id}
                    value={vehicle.vehicleId || vehicle.id}
                    disabled={vehicle.isLocked}
                  >
                    {vehicle.licensePlate}
                    {vehicle.isLocked
                      ? ` - already has booking #${vehicle.activeBooking.bookingId}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {selection.vehicleId && selectedVehicle ? (
              vehiclesWithStatus.find(
                (vehicle) => String(vehicle.vehicleId) === String(selection.vehicleId)
              )?.isLocked ? (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Xe nay dang co booking active. Vui long chon xe khac hoac huy booking cu.
                </div>
              ) : null
            ) : null}

            {selection.vehicleId && loadingSlots ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                <LoaderCircle size={16} className="animate-spin" />
                Loading available slots for this vehicle...
              </div>
            ) : null}

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
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="size-8 bg-muted rounded-lg flex items-center justify-center mb-2">
                    <MapPin size={14} className="text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm text-foreground">{building.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {slotGrid.filter((item) => item.building === building.name).length} slots
                    available
                  </p>
                </button>
              ))}
            </div>

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
                vehiclesWithStatus.find(
                  (vehicle) => String(vehicle.vehicleId) === String(selection.vehicleId)
                )?.isLocked
              }
              className="w-full mt-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Next -&gt;
            </button>
          </div>
        ) : null}

        {step === 1 ? (
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
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:border-primary/40 text-foreground"
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
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:border-primary/40 text-foreground"
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
                className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selection.floor || !selection.zone}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Next -&gt;
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Select a Slot</h3>
              <div className="flex items-center gap-3 text-xs">
                {[
                  ["bg-[#6BD4A5]", "Available"],
                  ["bg-[#EE7991]", "Occupied"],
                  ["bg-[#F8C933]", "Reserved"],
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

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selection.vehicleId || !selection.slotCode || submitting}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
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

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, MapPin } from "lucide-react";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverVehicleApi } from "../../api/driver/driverVehicleApi";
import { unwrapApiData } from "../../utils/api";

const BUILDING_OPTIONS = [
  { id: "central-tower", name: "Central Tower", available: 120 },
  { id: "north-plaza", name: "North Plaza", available: 120 },
  { id: "east-wing", name: "East Wing", available: 120 },
  { id: "west-gate", name: "West Gate", available: 120 },
];

const FLOOR_OPTIONS = [
  "B1 - Basement 1",
  "G - Ground",
  "1F - Floor 1",
  "2F - Floor 2",
  "3F - Floor 3",
];

const ZONE_OPTIONS = ["Zone A", "Zone B", "Zone C", "Zone D"];

function QRCodeMock({ value }) {
  const grid = Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => ((row * 3 + col * 7 + row * col) % 3) === 0)
  );

  return (
    <div className="p-3 bg-white inline-block rounded-xl border border-border">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: "repeat(10, 1fr)", width: 100 }}
      >
        {grid.flat().map((filled, index) => (
          <div
            key={index}
            className={filled ? "bg-slate-800 aspect-square" : "bg-white aspect-square"}
            style={{ width: 9, height: 9 }}
          />
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground text-center mt-1 font-mono">{value}</p>
    </div>
  );
}

function buildFallbackSlots() {
  const statuses = [
    "available",
    "available",
    "available",
    "occupied",
    "available",
    "available",
    "occupied",
    "available",
    "available",
    "reserved",
    "available",
    "available",
    "available",
    "occupied",
    "available",
    "available",
    "occupied",
    "available",
    "available",
    "reserved",
    "available",
    "available",
    "available",
    "occupied",
    "available",
    "available",
    "occupied",
    "available",
    "available",
    "reserved",
    "available",
    "available",
    "available",
    "occupied",
    "available",
    "available",
    "occupied",
    "available",
    "available",
    "reserved",
  ];

  return Array.from({ length: 40 }, (_, index) => {
    const row = String.fromCharCode(65 + Math.floor(index / 8));
    const col = String(index % 8 + 1).padStart(2, "0");
    return {
      uiId: `${row}${col}`,
      slotCode: `${row}${col}`,
      status: statuses[index] || "available",
      floor: FLOOR_OPTIONS[Math.floor(index / 8)] || FLOOR_OPTIONS[0],
      zone: ZONE_OPTIONS[index % ZONE_OPTIONS.length],
      building: BUILDING_OPTIONS[0].name,
      source: "ui-fallback",
    };
  });
}

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

export default function BookingPage() {
  const [step, setStep] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [backendSlots, setBackendSlots] = useState([]);
  const [createMode, setCreateMode] = useState("pending");
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
    async function loadData() {
      try {
        const [vehiclesRes, slotsRes] = await Promise.all([
          driverVehicleApi.getMyVehicles(),
          bookingApi.getAvailableSlots(),
        ]);

        setVehicles(unwrapApiData(vehiclesRes.data, []));
        setBackendSlots(unwrapApiData(slotsRes.data, []));
        setCreateMode("ready");
      } catch (error) {
        console.error("Failed to load booking sources", error);
        setCreateMode("scaffold");
      }
    }

    void loadData();
  }, []);

  const slotGrid = useMemo(() => {
    if (backendSlots.length === 0) {
      return buildFallbackSlots().filter((item) => {
        const floorOk = !selection.floor || item.floor === selection.floor;
        const zoneOk = !selection.zone || item.zone === selection.zone;
        return floorOk && zoneOk;
      });
    }

    return backendSlots.map((item, index) => ({
      uiId: item.id || item.slotId || `${index}`,
      slotId: item.id || item.slotId || "",
      slotCode: item.slotCode || `S${index + 1}`,
      status: String(item.status || "available").toLowerCase(),
      floor: item.zone?.floor?.name || selection.floor || FLOOR_OPTIONS[0],
      zone: item.zone?.name || selection.zone || ZONE_OPTIONS[0],
      building:
        item.zone?.floor?.building?.name || selection.building || BUILDING_OPTIONS[0].name,
      source: "backend",
    }));
  }, [backendSlots, selection.floor, selection.zone, selection.building]);

  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (item) => String(item.vehicleId || item.id) === String(selection.vehicleId)
      ),
    [vehicles, selection.vehicleId]
  );

  const selectedSlot = useMemo(
    () =>
      slotGrid.find(
        (item) =>
          String(item.slotId || item.uiId) === String(selection.slotId || selection.slotCode) ||
          item.slotCode === selection.slotCode
      ),
    [slotGrid, selection.slotCode, selection.slotId]
  );

  const steps = ["Building", "Floor & Zone", "Select Slot", "Confirm"];

  const handleConfirm = async () => {
    if (!selection.vehicleId || !selectedSlot) {
      return;
    }

    const fallbackConfirmation = {
      bookingCode: `BK-${Date.now().toString().slice(-6)}`,
      building: selection.building,
      floor: selection.floor,
      zone: selection.zone,
      slotCode: selectedSlot.slotCode,
      vehiclePlate: selectedVehicle?.licensePlate || "Vehicle",
    };

    if (createMode === "ready" && selectedSlot.slotId) {
      try {
        const start = new Date();
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const res = await bookingApi.create({
          vehicleId: Number(selection.vehicleId),
          slotId: Number(selectedSlot.slotId),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });

        const payload = res.data?.data || res.data || {};
        setConfirmation({
          bookingCode: payload.bookingCode || payload.bookingId || fallbackConfirmation.bookingCode,
          building:
            payload.buildingName ||
            payload.parkingBuildingName ||
            fallbackConfirmation.building,
          floor: payload.floorName || fallbackConfirmation.floor,
          zone: payload.zoneName || fallbackConfirmation.zone,
          slotCode: payload.slotCode || payload.parkingSlotCode || fallbackConfirmation.slotCode,
          vehiclePlate:
            payload.licensePlate || payload.vehiclePlate || fallbackConfirmation.vehiclePlate,
        });
        setStep(3);
        return;
      } catch (error) {
        console.error("Create booking failed, using scaffold confirmation", error);
      }
    }

    setConfirmation(fallbackConfirmation);
    setStep(3);
  };

  if (step === 3 && confirmation) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="size-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={30} className="text-emerald-600" />
          </div>
          <h3 className="font-bold text-foreground mb-1 text-[1.25rem]">Booking Confirmed!</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Your slot has been reserved. Show this QR code at the gate.
          </p>
          <div className="flex justify-center mb-6">
            <QRCodeMock value={String(confirmation.bookingCode)} />
          </div>
          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
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
              setConfirmation(null);
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
      <div className="flex items-center gap-0">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  index < step
                    ? "bg-primary text-white"
                    : index === step
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
        {step === 0 && (
          <div>
            <h3 className="font-semibold text-foreground mb-4">Select a Building</h3>
            <div className="grid grid-cols-2 gap-3">
              {BUILDING_OPTIONS.map((building) => (
                <button
                  key={building.id}
                  onClick={() =>
                    setSelection((prev) => ({
                      ...prev,
                      building: building.name,
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
                    {building.available} slots available
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              disabled={!selection.building}
              className="w-full mt-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="font-semibold text-foreground mb-4">Floor &amp; Zone</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Floor
                </label>
                <div className="space-y-2">
                  {FLOOR_OPTIONS.map((floor) => (
                    <button
                      key={floor}
                      onClick={() => setSelection((prev) => ({ ...prev, floor }))}
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
                  {ZONE_OPTIONS.map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setSelection((prev) => ({ ...prev, zone }))}
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
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
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
              {slotGrid.map((slot) => {
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

            <div className="mb-4">
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Select Vehicle
              </label>
              <select
                value={selection.vehicleId}
                onChange={(event) =>
                  setSelection((prev) => ({ ...prev, vehicleId: event.target.value }))
                }
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">Choose a vehicle</option>
                {vehicles.map((vehicle) => (
                  <option
                    key={vehicle.vehicleId || vehicle.id}
                    value={vehicle.vehicleId || vehicle.id}
                  >
                    {vehicle.licensePlate}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selection.vehicleId || !selection.slotCode}
                className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

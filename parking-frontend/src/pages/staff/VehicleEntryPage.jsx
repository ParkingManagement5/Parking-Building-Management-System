import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Search, ShieldAlert } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { buildingApi } from "../../api/manager/buildingApi";
import { gateApi } from "../../api/manager/gateApi";
import { unwrapApiData } from "../../utils/api";
import {
  createPortalId,
  formatStaffCurrency,
  formatStaffDateTime,
  getStaffPortalState,
  updateStaffPortalState,
} from "./staffPortalState";
import {
  StaffEmptyState,
  StaffField,
  StaffInput,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffSelect,
  StaffStatusBadge,
} from "./StaffUi";

const ENTRY_FEES = {
  CAR: 20000,
  MOTORBIKE: 5000,
  SUV: 25000,
};

function normalizeVehicleType(vehicle) {
  return String(vehicle?.vehicleType?.typeName || vehicle?.vehicleTypeName || "CAR").toUpperCase();
}

export default function VehicleEntryPage() {
  const [step, setStep] = useState(1);
  const [buildings, setBuildings] = useState([]);
  const [gates, setGates] = useState([]);
  const [recentEntries, setRecentEntries] = useState(() =>
    getStaffPortalState().sessions.filter((item) => item.status === "ACTIVE").slice(-5).reverse()
  );
  const [form, setForm] = useState({
    licensePlate: "",
    buildingId: "",
    gateId: "",
    qrCode: "",
  });
  const [lookup, setLookup] = useState({ loading: false, error: "", vehicle: null });
  const [confirmedSession, setConfirmedSession] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBuildings() {
      try {
        const res = await buildingApi.getAll();
        if (!cancelled) {
          const items = unwrapApiData(res.data, []);
          setBuildings(items);
          setForm((prev) => ({
            ...prev,
            buildingId: prev.buildingId || String(items[0]?.buildingId || ""),
          }));
        }
      } catch (error) {
        console.error("Failed to load buildings", error);
        if (!cancelled) {
          setBuildings([]);
        }
      }
    }

    void loadBuildings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGates() {
      if (!form.buildingId) {
        setGates([]);
        return;
      }

      try {
        const res = await gateApi.getActiveByBuilding(form.buildingId);
        if (!cancelled) {
          const items = unwrapApiData(res.data, []);
          setGates(items);
          setForm((prev) => ({
            ...prev,
            gateId: prev.gateId || String(items[0]?.gateId || ""),
          }));
        }
      } catch (error) {
        console.error("Failed to load gates", error);
        if (!cancelled) {
          setGates([]);
        }
      }
    }

    void loadGates();
    return () => {
      cancelled = true;
    };
  }, [form.buildingId]);

  const selectedBuilding = useMemo(
    () => buildings.find((item) => String(item.buildingId) === String(form.buildingId)),
    [buildings, form.buildingId]
  );
  const selectedGate = useMemo(
    () => gates.find((item) => String(item.gateId) === String(form.gateId)),
    [gates, form.gateId]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "buildingId" ? { gateId: "" } : {}),
    }));
  };

  const handleLookup = async (event) => {
    event?.preventDefault?.();
    if (!form.licensePlate.trim()) {
      setLookup({ loading: false, error: "Enter a license plate to continue.", vehicle: null });
      return;
    }

    setLookup({ loading: true, error: "", vehicle: null });
    try {
      const res = await axiosClient.get(`/vehicles/plate/${encodeURIComponent(form.licensePlate.trim())}`);
      const vehicle = unwrapApiData(res.data, null);
      setLookup({ loading: false, error: "", vehicle });
      setStep(2);
    } catch (error) {
      console.error("Vehicle lookup failed", error);
      setLookup({
        loading: false,
        error: "Vehicle was not found in backend. Staff can still record an exception below.",
        vehicle: null,
      });
      setStep(1);
    }
  };

  const handleConfirmEntry = () => {
    if (!lookup.vehicle || !selectedGate || !selectedBuilding) return;

    const session = {
      sessionId: createPortalId("SES"),
      licensePlate: lookup.vehicle.licensePlate || form.licensePlate.trim().toUpperCase(),
      driverName: lookup.vehicle.user?.fullName || lookup.vehicle.user?.username || "Registered Driver",
      slotCode: "ENTRY-PENDING",
      gateName: selectedGate.gateName || selectedGate.name || `Gate ${selectedGate.gateId}`,
      buildingName: selectedBuilding.name,
      entryTime: new Date().toISOString(),
      status: "ACTIVE",
      feeAmount: ENTRY_FEES[normalizeVehicleType(lookup.vehicle)] || 20000,
      paymentStatus: "UNPAID",
      qrCode: form.qrCode.trim(),
      source: "entry",
    };

    updateStaffPortalState((current) => ({
      ...current,
      sessions: [session, ...current.sessions],
      activity: [
        {
          id: createPortalId("ACT"),
          plate: session.licensePlate,
          action: `Entered via ${session.gateName}`,
          type: "entry",
          time: session.entryTime,
        },
        ...current.activity,
      ],
      exceptions:
        form.qrCode.trim() || lookup.vehicle
          ? current.exceptions
          : [
              {
                caseId: createPortalId("EX"),
                title: "Manual entry recorded without QR code",
                licensePlate: session.licensePlate,
                description: "Vehicle was processed through staff entry flow without a booking code.",
                severity: "MEDIUM",
                status: "OPEN",
                createdAt: session.entryTime,
              },
              ...current.exceptions,
            ],
    }));

    const latestState = getStaffPortalState();
    setRecentEntries(latestState.sessions.filter((item) => item.status === "ACTIVE").slice(0, 5));
    setConfirmedSession(session);
    setStep(3);
  };

  const handleCreateException = () => {
    if (!form.licensePlate.trim()) return;

    updateStaffPortalState((current) => ({
      ...current,
      exceptions: [
        {
          caseId: createPortalId("EX"),
          title: "Vehicle not found in backend registry",
          licensePlate: form.licensePlate.trim().toUpperCase(),
          description: "Staff attempted entry lookup but backend did not return a registered vehicle.",
          severity: "HIGH",
          status: "OPEN",
          createdAt: new Date().toISOString(),
        },
        ...current.exceptions,
      ],
      activity: [
        {
          id: createPortalId("ACT"),
          plate: form.licensePlate.trim().toUpperCase(),
          action: "Exception opened for unregistered vehicle",
          type: "exception",
          time: new Date().toISOString(),
        },
        ...current.activity,
      ],
    }));
    setLookup((prev) => ({ ...prev, error: "Exception case created and saved for follow-up." }));
  };

  const resetFlow = () => {
    setStep(1);
    setLookup({ loading: false, error: "", vehicle: null });
    setConfirmedSession(null);
    setForm((prev) => ({ ...prev, licensePlate: "", qrCode: "" }));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <StaffPageSection
          title="Entry Workflow"
          subtitle="Use backend vehicle lookup first, then confirm gate entry"
        >
          <div className="mb-5 flex items-center gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    step >= item ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item}
                </div>
                {item < 3 ? <div className={`h-px w-10 ${step > item ? "bg-primary" : "bg-border"}`} /> : null}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <form onSubmit={handleLookup} className="space-y-4">
              <StaffField label="License Plate" hint="This uses the real backend vehicle lookup API.">
                <StaffInput
                  name="licensePlate"
                  value={form.licensePlate}
                  onChange={handleChange}
                  placeholder="30A-12345"
                />
              </StaffField>

              <div className="grid gap-4 md:grid-cols-2">
                <StaffField label="Building">
                  <StaffSelect name="buildingId" value={form.buildingId} onChange={handleChange}>
                    <option value="">Select building</option>
                    {buildings.map((item) => (
                      <option key={item.buildingId} value={item.buildingId}>
                        {item.name}
                      </option>
                    ))}
                  </StaffSelect>
                </StaffField>

                <StaffField label="Entry Gate">
                  <StaffSelect name="gateId" value={form.gateId} onChange={handleChange}>
                    <option value="">Select gate</option>
                    {gates.map((item) => (
                      <option key={item.gateId} value={item.gateId}>
                        {item.gateName || item.name || `Gate ${item.gateId}`}
                      </option>
                    ))}
                  </StaffSelect>
                </StaffField>
              </div>

              <StaffField label="QR / Booking Code" hint="Optional for now until booking backend is fully integrated.">
                <StaffInput
                  name="qrCode"
                  value={form.qrCode}
                  onChange={handleChange}
                  placeholder="BK-852977"
                />
              </StaffField>

              {lookup.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {lookup.error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <StaffPrimaryButton type="submit" disabled={lookup.loading} className="flex items-center justify-center gap-2 sm:flex-1">
                  <Search size={15} />
                  {lookup.loading ? "Checking..." : "Lookup Vehicle"}
                </StaffPrimaryButton>
                <StaffSecondaryButton type="button" onClick={handleCreateException} className="flex items-center justify-center gap-2 sm:flex-1">
                  <ShieldAlert size={15} />
                  Open Exception
                </StaffSecondaryButton>
              </div>
            </form>
          ) : null}

          {step === 2 && lookup.vehicle ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-emerald-700">Vehicle Found</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{lookup.vehicle.licensePlate}</p>
                    <p className="text-sm text-muted-foreground">
                      {lookup.vehicle.user?.fullName || lookup.vehicle.user?.username || "Registered driver"}
                    </p>
                  </div>
                  <CheckCircle2 size={22} className="text-emerald-600" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Vehicle Type</p>
                  <p className="mt-1 font-semibold text-foreground">{normalizeVehicleType(lookup.vehicle)}</p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Assigned Gate</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedGate?.gateName || selectedGate?.name || "--"}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Building</p>
                  <p className="mt-1 font-semibold text-foreground">{selectedBuilding?.name || "--"}</p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Start Fee</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {formatStaffCurrency(ENTRY_FEES[normalizeVehicleType(lookup.vehicle)] || 20000)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <StaffSecondaryButton type="button" onClick={() => setStep(1)} className="sm:flex-1">
                  Back
                </StaffSecondaryButton>
                <StaffPrimaryButton type="button" onClick={handleConfirmEntry} className="flex items-center justify-center gap-2 sm:flex-1">
                  Confirm Entry
                  <ArrowRight size={15} />
                </StaffPrimaryButton>
              </div>
            </div>
          ) : null}

          {step === 3 && confirmedSession ? (
            <div className="mx-auto max-w-md rounded-3xl border border-border bg-background p-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Entry Confirmed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Vehicle {confirmedSession.licensePlate} has been recorded successfully.
              </p>
              <div className="mt-5 space-y-2 rounded-2xl bg-muted/30 p-4 text-left">
                {[
                  ["Session", confirmedSession.sessionId],
                  ["Gate", confirmedSession.gateName],
                  ["Building", confirmedSession.buildingName],
                  ["Time", formatStaffDateTime(confirmedSession.entryTime)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <StaffPrimaryButton type="button" onClick={resetFlow} className="mt-5 w-full">
                Process Next Vehicle
              </StaffPrimaryButton>
            </div>
          ) : null}
        </StaffPageSection>

        <StaffPageSection
          title="Recent Entry Queue"
          subtitle="Newly confirmed sessions appear here for follow-up in sessions and payment screens"
        >
          {recentEntries.length === 0 ? (
            <StaffEmptyState
              title="No entry records yet"
              description="Confirmed vehicle entries will appear here."
            />
          ) : (
            <div className="space-y-3">
              {recentEntries.map((item) => (
                <div key={item.sessionId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.sessionId}</p>
                      <p className="text-base font-semibold text-foreground">{item.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.gateName} • {item.slotCode}
                      </p>
                    </div>
                    <StaffStatusBadge tone="emerald">{item.status.toLowerCase()}</StaffStatusBadge>
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
      </div>
    </div>
  );
}

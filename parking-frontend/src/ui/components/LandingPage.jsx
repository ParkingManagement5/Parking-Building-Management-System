import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  QrCode,
  ScanLine,
  Shield,
  Smartphone,
  Building2,
  DoorOpen,
  Layers,
  SquareParking,
  Zap,
} from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { gateApi } from "../../api/manager/gateApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { unwrapApiData } from "../../utils/api";

const FEATURES = [
  {
    icon: QrCode,
    title: "Smart QR Booking",
    desc: "Reserve your slot in seconds with a QR code that works as your parking ticket.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: ScanLine,
    title: "License Plate OCR",
    desc: "AI-powered camera systems automatically detect and log vehicles as they enter and exit.",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: BarChart3,
    title: "Revenue Analytics",
    desc: "Real-time dashboards for revenue, occupancy, peak hours, and vehicle type trends.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "Four distinct roles with tailored interfaces and permissions.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Clock,
    title: "Real-time Tracking",
    desc: "Live occupancy maps, session timers, and instant notifications keep everyone informed.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    desc: "Fully responsive design works seamlessly on desktop, tablet, and mobile devices.",
    color: "bg-rose-50 text-rose-600",
  },
];

const PLANS = [
  {
    name: "Basic",
    price: "$29",
    period: "/month",
    desc: "Perfect for small parking lots",
    features: ["Up to 100 slots", "2 staff accounts", "QR booking", "Basic reports", "Email support"],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    desc: "For growing multi-floor facilities",
    features: ["Up to 500 slots", "10 staff accounts", "OCR scanning", "Advanced analytics", "Priority support", "API access"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large-scale deployments",
    features: ["Unlimited slots", "Unlimited accounts", "White-label option", "SLA guarantee", "Dedicated support", "Custom integrations"],
    cta: "Contact sales",
    highlight: false,
  },
];

function getBuildingId(item) {
  return item?.buildingId ?? item?.id;
}

function getFloorId(item) {
  return item?.floorId ?? item?.id;
}

function getZoneId(item) {
  return item?.zoneId ?? item?.id;
}

function getSettledData(result, fallback = []) {
  if (result?.status !== "fulfilled") {
    return fallback;
  }

  return unwrapApiData(result.value?.data, fallback);
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [liveData, setLiveData] = useState({
    buildings: [],
    vehicleTypes: [],
    gates: [],
    slots: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPublicData() {
      try {
        const [buildingRes, vehicleTypeRes] = await Promise.all([
          buildingApi.getAll(),
          vehicleTypeApi.getAll(),
        ]);

        const buildings = unwrapApiData(buildingRes.data, []);
        const vehicleTypes = unwrapApiData(vehicleTypeRes.data, []);

        const [floorResponses, gateResponses] = await Promise.all([
          Promise.allSettled(buildings.map((item) => floorApi.getByBuilding(getBuildingId(item)))),
          Promise.allSettled(buildings.map((item) => gateApi.getByBuilding(getBuildingId(item)))),
        ]);

        const floors = floorResponses.flatMap((result) => getSettledData(result, []));
        const gates = gateResponses.flatMap((result) => getSettledData(result, []));

        const zoneResponses = await Promise.allSettled(
          floors.map((item) => zoneApi.getByFloor(getFloorId(item)))
        );
        const zones = zoneResponses.flatMap((result) => getSettledData(result, []));

        const slotResponses = await Promise.allSettled(
          zones.map((item) => parkingSlotApi.getByZone(getZoneId(item)))
        );
        const slots = slotResponses.flatMap((result) => getSettledData(result, []));

        if (!cancelled) {
          setLiveData({ buildings, vehicleTypes, gates, slots });
        }
      } catch (error) {
        console.error("Failed to load public landing data", error);
        if (!cancelled) {
          setLiveData({ buildings: [], vehicleTypes: [], gates: [], slots: [] });
        }
      }
    }

    void loadPublicData();
    return () => {
      cancelled = true;
    };
  }, []);

  const slotSummary = useMemo(() => {
    const summary = { available: 0, occupied: 0, reserved: 0, maintenance: 0 };
    liveData.slots.forEach((item) => {
      const status = String(item.status || "").toUpperCase();
      if (status === "AVAILABLE") summary.available += 1;
      else if (status === "OCCUPIED") summary.occupied += 1;
      else if (status === "RESERVED") summary.reserved += 1;
      else summary.maintenance += 1;
    });
    return summary;
  }, [liveData.slots]);

  const stats = useMemo(
    () => [
      { value: String(liveData.buildings.length), label: "Parking Buildings" },
      { value: String(liveData.slots.length), label: "Configured Slots" },
      { value: String(liveData.vehicleTypes.length), label: "Vehicle Types" },
      { value: String(liveData.gates.filter((item) => item.isActive !== false).length), label: "Active Gates" },
    ],
    [liveData]
  );

  const previewActivity = useMemo(() => {
    const items = [];
    if (liveData.buildings[0]) {
      items.push({
        plate: liveData.buildings[0].name,
        action: `${slotSummary.available} slots available right now`,
        time: `Open ${liveData.buildings[0].openTime?.slice(0, 5) || "--:--"}`,
        status: "bg-emerald-100 text-emerald-700",
      });
    }
    if (liveData.buildings[1]) {
      items.push({
        plate: liveData.buildings[1].name,
        action: `${slotSummary.occupied} occupied slots in the system`,
        time: `Close ${liveData.buildings[1].closeTime?.slice(0, 5) || "--:--"}`,
        status: "bg-blue-100 text-blue-700",
      });
    }
    if (liveData.vehicleTypes[0]) {
      items.push({
        plate: liveData.vehicleTypes[0].name,
        action: `${liveData.vehicleTypes.length} supported vehicle categories`,
        time: `${liveData.gates.length} gates`,
        status: "bg-amber-100 text-amber-700",
      });
    }
    return items;
  }, [liveData, slotSummary]);

  const liveHighlights = useMemo(
    () => [
      {
        title: "Facility Coverage",
        value: liveData.buildings.length,
        hint: "Buildings currently configured in the system",
        icon: Building2,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        title: "Floor Structure",
        value: liveData.slots.length ? new Set(liveData.slots.map((item) => item.zone?.floor?.floorId ?? item.zone?.floor?.id)).size : 0,
        hint: "Distinct floors currently carrying slot inventory",
        icon: Layers,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        title: "Access Points",
        value: liveData.gates.length,
        hint: "Entry and exit gates now active in backend data",
        icon: DoorOpen,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        title: "Live Capacity",
        value: slotSummary.available,
        hint: "Slots currently marked AVAILABLE in the database",
        icon: SquareParking,
        tone: "bg-amber-50 text-amber-600",
      },
    ],
    [liveData, slotSummary]
  );

  const buildingCards = useMemo(
    () =>
      liveData.buildings.slice(0, 3).map((building) => ({
        id: getBuildingId(building),
        name: building.name,
        address: building.address,
        openTime: building.openTime?.slice(0, 5) || "--:--",
        closeTime: building.closeTime?.slice(0, 5) || "--:--",
      })),
    [liveData.buildings]
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.9" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.7" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.7" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" opacity="0.5" />
              </svg>
            </div>
            <span className="font-bold text-foreground">ParkSmart</span>
          </div>
          <div className="hidden md:flex items-center gap-6 flex-1">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </a>
            <button onClick={() => navigate("/parking-info")} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Parking Info
            </button>
            <button onClick={() => navigate("/public-slots")} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Public Slots
            </button>
          </div>
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <button onClick={() => navigate("/login")} className="px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </button>
            <button onClick={() => navigate("/register")} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              Get started
            </button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-background to-cyan-50/40" />
        <div className="absolute right-0 top-20 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-20 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-24 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Zap size={12} />
              Smart Parking Platform
            </div>
            <h1 className="mb-5 text-5xl font-bold leading-tight text-foreground" style={{ fontSize: "3rem", fontWeight: 700, lineHeight: 1.15 }}>
              Intelligent Parking
              <span className="text-primary"> Management</span>
              <br />
              for Modern Cities
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              Streamline your entire parking operation from slot booking and OCR entry to real-time analytics and multi-role management.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={() => navigate("/register")} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30">
                Start for free
                <ArrowRight size={16} />
              </button>
              <button onClick={() => navigate("/public-slots")} className="flex items-center gap-2 rounded-xl border border-primary/20 bg-card px-6 py-3 font-medium text-primary transition-colors hover:bg-primary/5">
                Browse public slots
                <ChevronRight size={16} />
              </button>
              <button onClick={() => navigate("/login")} className="flex items-center gap-2 rounded-xl border border-border px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted">
                View demo
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              {["No credit card required", "Free 14-day trial", "Cancel anytime"].map((text) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
              <div className="flex items-center gap-2 bg-[#4F46E5] p-4">
                <div className="size-2.5 rounded-full bg-white/30" />
                <div className="size-2.5 rounded-full bg-white/30" />
                <div className="size-2.5 rounded-full bg-white/30" />
                <span className="ml-2 text-xs text-white/70">ParkSmart Dashboard</span>
              </div>
              <div className="p-5">
                <div className="mb-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Available", value: String(slotSummary.available), color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Occupied", value: String(slotSummary.occupied), color: "text-rose-600", bg: "bg-rose-50" },
                    { label: "Reserved", value: String(slotSummary.reserved), color: "text-amber-600", bg: "bg-amber-50" },
                  ].map((item) => (
                    <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                      <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    {liveData.buildings[0]?.name || "Live parking map"} - current slot status
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {Array.from({ length: Math.max(32, Math.min(40, liveData.slots.length || 32)) }, (_, i) => {
                      const slot = liveData.slots[i];
                      const status = String(slot?.status || "").toUpperCase();
                      const color =
                        status === "OCCUPIED"
                          ? "bg-rose-400"
                          : status === "RESERVED"
                            ? "bg-amber-400"
                            : status && status !== "AVAILABLE"
                              ? "bg-slate-400"
                              : "bg-emerald-400";
                      return <div key={i} className={`${color} aspect-[1.6] rounded-sm`} />;
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    {[["bg-emerald-400", "Available"], ["bg-rose-400", "Occupied"], ["bg-amber-400", "Reserved"]].map(([color, label]) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`size-2 rounded-sm ${color}`} />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {previewActivity.map((item) => (
                    <div key={item.plate} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50">
                      <div className="flex size-7 items-center justify-center rounded-md bg-muted">
                        <Car size={13} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{item.plate}</p>
                        <p className="text-[11px] text-muted-foreground">{item.action}</p>
                      </div>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${item.status}`}>{item.time}</span>
                    </div>
                  ))}
                  {previewActivity.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">Public preview updates when backend data is available.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card py-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="text-center">
              <div className="mb-1 text-3xl font-bold text-primary">{item.value}</div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-center gap-3 px-6">
          <button onClick={() => navigate("/parking-info")} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
            View Parking Information
          </button>
          <button onClick={() => navigate("/public-slots")} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Check Public Slot Availability
          </button>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Globe size={12} />
              Platform Features
            </span>
            <h2 className="mb-4 text-3xl font-bold text-foreground" style={{ fontSize: "1.875rem", fontWeight: 700 }}>
              Everything you need to manage parking
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              A complete suite of tools built for parking operators, staff, and drivers alike.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-md hover:shadow-primary/5">
                  <div className={`mb-4 flex size-10 items-center justify-center rounded-xl ${feature.color}`}>
                    <Icon size={18} />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground" style={{ fontSize: "1rem", fontWeight: 600 }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-primary/5 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-foreground" style={{ fontWeight: 700 }}>Live System Coverage</h2>
            <p className="text-muted-foreground">These figures are pulled from the parking data currently available in the backend.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {liveHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:shadow-md">
                  <div className={`mb-3 flex size-10 items-center justify-center rounded-xl ${item.tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="text-3xl font-bold text-foreground">{item.value}</div>
                  <div className="mt-1 font-semibold text-foreground">{item.title}</div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.hint}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-foreground" style={{ fontWeight: 700 }}>What The Current System Already Supports</h2>
            <p className="mt-3 text-muted-foreground">A quick overview of the real parking facilities and operational setup already loaded into the platform.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {buildingCards.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-5">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 size={18} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.address}</p>
                  <p className="mt-4 text-xs font-medium text-foreground">
                    Operating hours: <span className="text-muted-foreground">{item.openTime} - {item.closeTime}</span>
                  </p>
                </div>
              ))}
              {buildingCards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                  No building data is currently available from the backend.
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-border bg-background p-6">
              <h3 className="text-lg font-semibold text-foreground">Operational Snapshot</h3>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Available Slots</p>
                    <p className="text-xs text-muted-foreground">Ready for immediate use</p>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">{slotSummary.available}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Occupied Slots</p>
                    <p className="text-xs text-muted-foreground">Already in use right now</p>
                  </div>
                  <span className="text-2xl font-bold text-rose-600">{slotSummary.occupied}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Reserved Slots</p>
                    <p className="text-xs text-muted-foreground">Held for existing assignments</p>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">{slotSummary.reserved}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Vehicle Profiles</p>
                    <p className="text-xs text-muted-foreground">Types already configured in backend</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">{liveData.vehicleTypes.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold text-foreground" style={{ fontWeight: 700 }}>Simple, transparent pricing</h2>
            <p className="text-muted-foreground">No hidden fees. Scale as you grow.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-7 ${plan.highlight ? "scale-[1.02] border-primary bg-primary text-primary-foreground shadow-2xl shadow-primary/30" : "border-border bg-card"}`}>
                {plan.highlight ? (
                  <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white">
                    <Zap size={10} />
                    Most popular
                  </span>
                ) : null}
                <h3 className={`mb-1 font-bold ${plan.highlight ? "text-white" : "text-foreground"}`}>{plan.name}</h3>
                <p className={`mb-5 text-xs ${plan.highlight ? "text-white/70" : "text-muted-foreground"}`}>{plan.desc}</p>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-foreground"}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? "text-white/70" : "text-muted-foreground"}`}>{plan.period}</span>
                </div>
                <ul className="mb-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className={`flex items-center gap-2 text-sm ${plan.highlight ? "text-white/90" : "text-muted-foreground"}`}>
                      <CheckCircle2 size={14} className={plan.highlight ? "text-white" : "text-emerald-500"} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate("/register")} className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${plan.highlight ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white" style={{ fontWeight: 700 }}>
            Ready to transform your parking?
          </h2>
          <p className="mb-8 text-lg text-white/70">
            Join facilities already using ParkSmart to modernize their operations.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button onClick={() => navigate("/register")} className="flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-semibold text-primary shadow-lg transition-all hover:bg-white/90">
              Get started free <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate("/login")} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-3 font-medium text-white transition-all hover:bg-white/20">
              Sign in
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-foreground py-12 text-white/60">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.9" />
                  <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.7" />
                  <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.7" />
                  <rect x="8" y="8" width="5" height="5" rx="1" fill="white" opacity="0.5" />
                </svg>
              </div>
              <span className="font-semibold text-white">ParkSmart</span>
            </div>
            <p className="text-sm">© 2026 ParkSmart. All rights reserved.</p>
            <div className="flex gap-6 text-sm">
              {["Privacy", "Terms", "Contact"].map((item) => (
                <a key={item} href="#" className="transition-colors hover:text-white">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

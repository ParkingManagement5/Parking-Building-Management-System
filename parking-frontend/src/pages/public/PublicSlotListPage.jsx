import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  Building2,
  Car,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  Grid3x3,
  List,
  Map,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wrench,
  X,
} from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { unwrapApiData } from "../../utils/api";

function getBuildingId(item) {
  return item?.buildingId ?? item?.id;
}

function getFloorId(item) {
  return item?.floorId ?? item?.id;
}

function getZoneId(item) {
  return item?.zoneId ?? item?.id;
}

function getVehicleTypeId(item) {
  return item?.vehicleTypeId ?? item?.id;
}

function getSettledData(result, fallback = []) {
  if (result?.status !== "fulfilled") {
    return fallback;
  }

  return unwrapApiData(result.value?.data, fallback);
}

function toDisplayStatus(status) {
  const normalized = String(status || "AVAILABLE").toUpperCase();

  if (normalized === "AVAILABLE") return "Available";
  if (normalized === "OCCUPIED") return "Occupied";
  if (normalized === "RESERVED") return "Reserved";
  return "Maintenance";
}

function normalizeSlot(item) {
  return {
    id: item.slotId ?? item.id,
    code: item.slotCode || `SLOT-${item.slotId ?? item.id}`,
    buildingId: item.zone?.floor?.building?.buildingId ?? item.zone?.floor?.building?.id,
    building: item.zone?.floor?.building?.name || "Unknown building",
    floorId: item.zone?.floor?.floorId ?? item.zone?.floor?.id,
    floor: item.zone?.floor?.name || "Unknown floor",
    zoneId: item.zone?.zoneId ?? item.zone?.id,
    zone: item.zone?.name || "Unknown zone",
    vehicleTypeId: item.zone?.vehicleType?.vehicleTypeId ?? item.zone?.vehicleType?.id,
    vehicleType: item.zone?.vehicleType?.name || "Unknown vehicle type",
    status: toDisplayStatus(item.status),
    rawStatus: String(item.status || "AVAILABLE").toUpperCase(),
    updatedAt: "Live backend data",
    slotSize: item.slotSize || "Standard",
  };
}

const STATUS_CONFIG = {
  Available: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-500/20",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  Occupied: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-500/20",
    dot: "bg-rose-500",
    icon: AlertCircle,
  },
  Reserved: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-500/20",
    dot: "bg-amber-500",
    icon: Clock,
  },
  Maintenance: {
    bg: "bg-slate-100 dark:bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-500/20",
    dot: "bg-slate-400",
    icon: Wrench,
  },
};

const MAP_COLOR = {
  Available: "#10b981",
  Occupied: "#f43f5e",
  Reserved: "#f59e0b",
  Maintenance: "#94a3b8",
};

function StatusBadge({ status, size = "md" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Maintenance;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span className={`size-1.5 rounded-full ${config.dot} shrink-0`} />
      {status}
    </span>
  );
}

function ParkingIllustration({ counts }) {
  const statuses = [
    ...Array.from({ length: Math.max(counts.available, 1) }, () => "Available"),
    ...Array.from({ length: counts.occupied }, () => "Occupied"),
    ...Array.from({ length: counts.reserved }, () => "Reserved"),
    ...Array.from({ length: counts.maintenance }, () => "Maintenance"),
  ];
  const palette = statuses.length > 0 ? statuses : ["Available"];
  const rowColors = Array.from({ length: 4 }, (_, rowIndex) =>
    Array.from({ length: 9 }, (_, colIndex) => palette[(rowIndex * 9 + colIndex) % palette.length])
  );

  const slotWidth = 32;
  const slotHeight = 22;
  const gap = 2;
  const aisle = 26;
  const marginX = 14;
  const marginY = 12;
  const totalWidth = 9 * slotWidth + 8 * gap + marginX * 2;
  const totalHeight = marginY + slotHeight + gap + slotHeight + aisle + slotHeight + gap + slotHeight + marginY;

  const getRowY = (rowIndex) =>
    rowIndex < 2
      ? marginY + rowIndex * (slotHeight + gap)
      : marginY + 2 * slotHeight + gap + aisle + (rowIndex - 2) * (slotHeight + gap);

  return (
    <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="h-full w-full" aria-label="Parking map">
      <rect width={totalWidth} height={totalHeight} fill="#0f172a" rx="16" />
      <rect
        x={marginX}
        y={marginY + 2 * (slotHeight + gap)}
        width={totalWidth - marginX * 2}
        height={aisle}
        fill="#1e3a8a"
        rx="4"
        opacity="0.6"
      />
      <text
        x={marginX + 4}
        y={marginY + 2 * (slotHeight + gap) + 15}
        fill="#93c5fd"
        fontSize="7"
        fontFamily="monospace"
      >
        AISLE
      </text>

      {rowColors.map((row, rowIndex) =>
        row.map((status, colIndex) => {
          const x = marginX + colIndex * (slotWidth + gap);
          const y = getRowY(rowIndex);

          return (
            <g key={`${rowIndex}-${colIndex}`}>
              <rect x={x} y={y} width={slotWidth} height={slotHeight} rx="3" fill={MAP_COLOR[status]} opacity="0.9" />
              <rect x={x + 1} y={y + 1} width={slotWidth - 2} height={3} rx="1" fill="white" opacity="0.15" />
            </g>
          );
        })
      )}

      {["B", "C", "D", "E"].map((label, rowIndex) => (
        <text
          key={label}
          x={marginX - 6}
          y={getRowY(rowIndex) + slotHeight / 2 + 3}
          fill="#64748b"
          fontSize="7"
          fontFamily="monospace"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

function SlotModal({ slot, onClose }) {
  const config = STATUS_CONFIG[slot.status] || STATUS_CONFIG.Maintenance;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Parking Slot</p>
            <h3 className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">{slot.code}</h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={slot.status} />
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          {[
            { label: "Building", value: slot.building },
            { label: "Floor", value: slot.floor },
            { label: "Zone", value: slot.zone },
            { label: "Vehicle Type", value: slot.vehicleType },
            { label: "Slot Size", value: slot.slotSize },
            { label: "Source", value: slot.updatedAt },
          ].map((field) => (
            <div key={field.label} className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{field.label}</p>
              <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{field.value}</p>
            </div>
          ))}
        </div>

        <div className={`mb-5 rounded-2xl border p-4 ${config.bg} ${config.text} ${config.border}`}>
          <div className="flex items-center gap-2">
            <Icon size={16} />
            <span className="text-sm font-semibold">{slot.status}</span>
          </div>
          <p className="mt-2 text-sm">
            {slot.status === "Available"
              ? "This slot is currently visible as available from the backend."
              : "This slot is visible in public mode but cannot be booked from this page right now."}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            Close
          </button>
          <Link
            to="/login"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <BookOpen size={15} />
            Sign In To Book
          </Link>
        </div>
      </div>
    </div>
  );
}

function TableView({ slots, onSelect }) {
  const [page, setPage] = useState(1);
  const perPage = 12;
  const totalPages = Math.max(1, Math.ceil(slots.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visibleSlots = slots.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-slate-50/80 dark:bg-white/[0.03]">
            <tr className="border-b border-slate-100 dark:border-white/10">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Slot Code</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Building</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Floor</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Zone</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Vehicle</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Source</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {visibleSlots.map((slot) => (
              <tr key={slot.id} className="group transition hover:bg-blue-50/30 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100">{slot.code}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={slot.status} />
                </td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{slot.building}</td>
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{slot.floor}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{slot.zone}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{slot.vehicleType}</td>
                <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{slot.updatedAt}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelect(slot)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <Eye size={12} />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing {(currentPage - 1) * perPage + (slots.length > 0 ? 1 : 0)}-{Math.min(currentPage * perPage, slots.length)} of {slots.length} slots
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage === 1}
            className="inline-flex h-9 min-w-[76px] items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            Prev
          </button>
          <span className="inline-flex h-9 items-center text-xs font-medium text-slate-500 dark:text-slate-400">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex h-9 min-w-[76px] items-center justify-center rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function CardView({ slots, onSelect }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {slots.map((slot) => (
        <button
          key={slot.id}
          onClick={() => onSelect(slot)}
          className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-white/10 dark:bg-card dark:hover:border-blue-500/30"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Slot</p>
              <h3 className="mt-2 font-mono text-xl font-bold text-slate-900 dark:text-slate-100">{slot.code}</h3>
            </div>
            <StatusBadge status={slot.status} size="sm" />
          </div>

          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-3">
              <Building2 size={16} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Building</p>
                <p className="font-medium text-slate-800 dark:text-slate-100">{slot.building}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Floor and Zone</p>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {slot.floor} / {slot.zone}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Car size={16} className="mt-0.5 shrink-0 text-blue-600" />
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Vehicle Type</p>
                <p className="font-medium text-slate-800 dark:text-slate-100">{slot.vehicleType}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
            <span className="text-xs text-slate-500 dark:text-slate-400">{slot.updatedAt}</span>
            <span className="text-xs font-semibold text-blue-600">View details</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function MapView({ slots, onSelect }) {
  const groupedSlots = useMemo(() => {
    return slots.reduce((accumulator, slot) => {
      const key = `${slot.building}__${slot.floor}`;

      if (!accumulator[key]) {
        accumulator[key] = {
          id: key,
          building: slot.building,
          floor: slot.floor,
          slots: [],
        };
      }

      accumulator[key].slots.push(slot);
      return accumulator;
    }, {});
  }, [slots]);

  const groups = Object.values(groupedSlots);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{group.building}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{group.floor}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              {Object.keys(MAP_COLOR).map((status) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className="size-3 rounded-sm" style={{ backgroundColor: MAP_COLOR[status] }} />
                  <span>{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {group.slots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => onSelect(slot)}
                className="rounded-2xl border border-slate-100 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-white/10 dark:hover:border-blue-500/30 dark:hover:bg-white/[0.03]"
              >
                <div
                  className="mb-3 rounded-xl px-3 py-2 text-center font-mono text-sm font-bold text-white"
                  style={{ backgroundColor: MAP_COLOR[slot.status] }}
                >
                  {slot.code}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{slot.zone}</p>
                <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">{slot.vehicleType}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full appearance-none rounded-2xl border px-3 py-2.5 pr-9 text-sm outline-none transition ${
            value
              ? "border-blue-200 bg-blue-50/60 text-slate-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-slate-100"
              : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
          } focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10`}
        >
          <option value="">All {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      </div>
    </div>
  );
}

function FilterSidebar({
  filters,
  setFilters,
  buildings,
  vehicleTypes,
  total,
  filtered,
}) {
  const hasActive = Boolean(filters.search || filters.buildingId || filters.vehicleTypeId || filters.status);

  function updateFilter(name, value) {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  return (
    <aside className="w-full shrink-0 xl:sticky xl:top-20 xl:w-80">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-blue-600" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filters</span>
          </div>
          {hasActive ? (
            <button
              onClick={() =>
                setFilters({
                  search: "",
                  buildingId: "",
                  vehicleTypeId: "",
                  status: "",
                })
              }
              className="text-xs font-medium text-blue-600 transition hover:underline dark:text-blue-300"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <div className="space-y-5 p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Search Slot</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Slot code, zone, floor..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {filters.search ? (
                <button
                  onClick={() => updateFilter("search", "")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>
          </div>

          <SelectField
            label="Building"
            value={filters.buildingId}
            onChange={(value) => updateFilter("buildingId", value)}
            options={buildings.map((item) => ({
              value: String(getBuildingId(item)),
              label: item.name,
            }))}
          />

          <SelectField
            label="Vehicle Type"
            value={filters.vehicleTypeId}
            onChange={(value) => updateFilter("vehicleTypeId", value)}
            options={vehicleTypes.map((item) => ({
              value: String(getVehicleTypeId(item)),
              label: item.name,
            }))}
          />

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {["", "Available", "Occupied", "Reserved", "Maintenance"].map((status) => {
                const isActive = filters.status === status;
                const buttonCopy = status || "All";
                let activeClasses = "bg-blue-600 text-white border-blue-600";

                if (status === "Available") activeClasses = "bg-emerald-500 text-white border-emerald-500";
                if (status === "Occupied") activeClasses = "bg-rose-500 text-white border-rose-500";
                if (status === "Reserved") activeClasses = "bg-amber-500 text-white border-amber-500";
                if (status === "Maintenance") activeClasses = "bg-slate-500 text-white border-slate-500";

                return (
                  <button
                    key={buttonCopy}
                    onClick={() => updateFilter("status", status)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      isActive ? activeClasses : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {buttonCopy}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`rounded-2xl p-4 text-center ${hasActive ? "border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10" : "bg-slate-50 dark:bg-white/5"}`}>
            <p className={`text-2xl font-bold ${hasActive ? "text-blue-600 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}>{filtered}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">of {total} slots match</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function PublicSlotListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("table");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    buildingId: "",
    vehicleTypeId: "",
    status: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPublicSlots() {
      setLoading(true);
      setError("");

      try {
        const [buildingRes, vehicleTypeRes] = await Promise.all([
          buildingApi.getAll(),
          vehicleTypeApi.getAll(),
        ]);

        const buildingList = unwrapApiData(buildingRes.data, []);
        const vehicleTypeList = unwrapApiData(vehicleTypeRes.data, []);

        const floorResponses = await Promise.allSettled(
          buildingList.map((item) => floorApi.getByBuilding(getBuildingId(item)))
        );
        const floors = floorResponses.flatMap((result) => getSettledData(result, []));

        const zoneResponses = await Promise.allSettled(
          floors.map((item) => zoneApi.getByFloor(getFloorId(item)))
        );
        const zones = zoneResponses.flatMap((result) => getSettledData(result, []));

        const slotResponses = await Promise.allSettled(
          zones.map((item) => parkingSlotApi.getByZone(getZoneId(item)))
        );
        const slotList = slotResponses.flatMap((result) =>
          getSettledData(result, []).map(normalizeSlot)
        );

        if (!cancelled) {
          setBuildings(buildingList);
          setVehicleTypes(vehicleTypeList);
          setSlots(slotList);
        }
      } catch (loadError) {
        console.error("Failed to load public slot list", loadError);

        if (!cancelled) {
          setBuildings([]);
          setVehicleTypes([]);
          setSlots([]);
          setError("Could not load slot availability from the backend.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPublicSlots();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSlots = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    return slots.filter((slot) => {
      const matchesSearch =
        !keyword ||
        slot.code.toLowerCase().includes(keyword) ||
        slot.building.toLowerCase().includes(keyword) ||
        slot.floor.toLowerCase().includes(keyword) ||
        slot.zone.toLowerCase().includes(keyword);

      const matchesBuilding =
        !filters.buildingId || String(slot.buildingId) === String(filters.buildingId);

      const matchesVehicleType =
        !filters.vehicleTypeId || String(slot.vehicleTypeId) === String(filters.vehicleTypeId);

      const matchesStatus = !filters.status || slot.status === filters.status;

      return matchesSearch && matchesBuilding && matchesVehicleType && matchesStatus;
    });
  }, [filters, slots]);

  const stats = useMemo(() => {
    return {
      total: slots.length,
      available: slots.filter((slot) => slot.status === "Available").length,
      occupied: slots.filter((slot) => slot.status === "Occupied").length,
      reserved: slots.filter((slot) => slot.status === "Reserved").length,
      maintenance: slots.filter((slot) => slot.status === "Maintenance").length,
    };
  }, [slots]);

  const resultStats = useMemo(() => {
    return {
      total: filteredSlots.length,
      available: filteredSlots.filter((slot) => slot.status === "Available").length,
      occupied: filteredSlots.filter((slot) => slot.status === "Occupied").length,
      reserved: filteredSlots.filter((slot) => slot.status === "Reserved").length,
      maintenance: filteredSlots.filter((slot) => slot.status === "Maintenance").length,
    };
  }, [filteredSlots]);

  const occupancyPct = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0;
  const activeFilters = [
    filters.buildingId
      ? {
          key: "buildingId",
          label: buildings.find((item) => String(getBuildingId(item)) === String(filters.buildingId))?.name || "Building",
        }
      : null,
    filters.vehicleTypeId
      ? {
          key: "vehicleTypeId",
          label:
            vehicleTypes.find((item) => String(getVehicleTypeId(item)) === String(filters.vehicleTypeId))?.name ||
            "Vehicle Type",
        }
      : null,
    filters.status ? { key: "status", label: filters.status } : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 pb-0 pt-14">
          <div className="grid gap-12 lg:grid-cols-[1fr_460px] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-white/80">{stats.available} slots available right now</span>
              </div>

              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
                Find Parking
                <br />
                <span className="text-blue-300">Before You Arrive</span>
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/65">
                Real-time parking availability across all buildings. Search, filter, and inspect live slot inventory from the backend before signing in to book.
              </p>

              <div className="mt-6 flex max-w-md items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <Search size={16} className="shrink-0 text-white/50" />
                <input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((previous) => ({
                      ...previous,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Search by slot code or building..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
              </div>
            </div>

            <div className="hidden self-end lg:block">
              <div className="h-[180px] overflow-hidden rounded-t-3xl shadow-2xl shadow-slate-950/40">
                <ParkingIllustration counts={stats} />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10 grid translate-y-6 grid-cols-2 gap-3 pb-0 lg:grid-cols-4">
            {[
              {
                label: "Total Slots",
                value: stats.total,
                sub: `Across ${buildings.length} buildings`,
                classes: "from-slate-700/85 to-slate-600/85",
                accent: "#94a3b8",
              },
              {
                label: "Available",
                value: stats.available,
                sub: `${stats.total ? Math.round((stats.available / stats.total) * 100) : 0}% of all slots`,
                classes: "from-emerald-700/85 to-emerald-600/85",
                accent: "#34d399",
              },
              {
                label: "Occupied",
                value: stats.occupied,
                sub: `${occupancyPct}% occupancy rate`,
                classes: "from-rose-700/85 to-rose-600/85",
                accent: "#fb7185",
              },
              {
                label: "Reserved",
                value: stats.reserved,
                sub: "Pre-booked slots",
                classes: "from-amber-700/85 to-amber-600/85",
                accent: "#fcd34d",
              },
            ].map((card) => (
              <div key={card.label} className={`rounded-3xl border border-white/10 bg-gradient-to-br ${card.classes} p-5 shadow-xl backdrop-blur-md`}>
                <div className="mb-3 flex items-start justify-between">
                  <div
                    className="flex size-8 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${card.accent}20` }}
                  >
                    <div className="size-3 rounded-full" style={{ backgroundColor: card.accent }} />
                  </div>
                </div>
                <div className="text-3xl font-bold leading-none text-white">{card.value}</div>
                <div className="mt-1 text-sm font-medium text-white/90">{card.label}</div>
                <div className="mt-0.5 text-xs text-white/55">{card.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-16">
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
          <FilterSidebar
            filters={filters}
            setFilters={setFilters}
            buildings={buildings}
            vehicleTypes={vehicleTypes}
            total={stats.total}
            filtered={filteredSlots.length}
          />

          <main className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Parking Slots
                  {filteredSlots.length !== stats.total ? (
                    <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">- {filteredSlots.length} results</span>
                  ) : null}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {loading ? "Loading live inventory from the backend..." : "Live public availability synced from backend endpoints."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-card dark:text-slate-200 dark:hover:bg-white/5"
                >
                  <RefreshCw size={14} />
                  Reload
                </button>

                <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-card">
                  {[
                    { mode: "table", label: "Table", icon: List },
                    { mode: "card", label: "Cards", icon: Grid3x3 },
                    { mode: "map", label: "Map", icon: Map },
                  ].map(({ mode, label, icon: Icon }) => (
                    <button
                      key={mode}
                      onClick={() => setView(mode)}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                        view === mode
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-slate-100"
                      }`}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <Filter size={11} />
                  Active:
                </span>
                {activeFilters.map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() =>
                      setFilters((previous) => ({
                        ...previous,
                        [chip.key]: "",
                      }))
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/15"
                  >
                    {chip.label}
                    <X size={11} />
                  </button>
                ))}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Visible Slots", value: resultStats.total, tone: "text-slate-900 dark:text-slate-100", bg: "bg-white dark:bg-card" },
                { label: "Available", value: resultStats.available, tone: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                { label: "Occupied", value: resultStats.occupied, tone: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-500/10" },
                { label: "Reserved", value: resultStats.reserved, tone: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10" },
              ].map((item) => (
                <div key={item.label} className={`rounded-3xl border border-slate-200 ${item.bg} p-4 shadow-sm dark:border-white/10`}>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{item.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-white/10 dark:bg-card">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <RefreshCw size={22} className="animate-spin" />
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">Loading public slot data...</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Fetching buildings, floors, zones, and real slot inventory.</p>
              </div>
            ) : filteredSlots.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm dark:border-white/15 dark:bg-card">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                  <Search size={22} />
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">No slots found</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try another building, vehicle type, or status filter.</p>
              </div>
            ) : (
              <>
                {view === "table" ? <TableView slots={filteredSlots} onSelect={setSelectedSlot} /> : null}
                {view === "card" ? <CardView slots={filteredSlots} onSelect={setSelectedSlot} /> : null}
                {view === "map" ? <MapView slots={filteredSlots} onSelect={setSelectedSlot} /> : null}
              </>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-card dark:text-slate-400">
              Public mode is now using real backend inventory. Booking is intentionally routed to sign-in, so guests can inspect slot availability without creating mock reservations.
            </div>
          </main>
        </div>
      </section>

      {selectedSlot ? <SlotModal slot={selectedSlot} onClose={() => setSelectedSlot(null)} /> : null}

      <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-card">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-slate-400 dark:text-slate-500">
          <span>ParkSmart public availability</span>
          <span>Data source: building, floor, zone, and parking slot backend APIs</span>
        </div>
      </footer>
    </div>
  );
}

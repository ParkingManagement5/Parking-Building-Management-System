import { useEffect, useState } from "react";
import { floorOccupancyApi } from "../../api/manager/floorOccupancyApi";
import {
  StaffPageSection,
  StaffStatCard,
  StaffStatusBadge,
} from "../staff/StaffUi";
import {
  Building2,
  RefreshCw,
  ParkingSquare,
  CarFront,
  AlertCircle,
} from "lucide-react";

/* ── helpers ── */
function pctTone(pct) {
  if (pct >= 80) return "rose";
  if (pct >= 50) return "amber";
  return "emerald";
}

function pctLabel(pct) {
  if (pct >= 80) return "Gần đầy";
  if (pct >= 50) return "Trung bình";
  return "Còn trống";
}

const BAR_COLOR = {
  rose:    "bg-rose-500",
  amber:   "bg-amber-400",
  emerald: "bg-emerald-500",
};

const BAR_TRACK = {
  rose:    "bg-rose-100 dark:bg-rose-500/15",
  amber:   "bg-amber-100 dark:bg-amber-500/15",
  emerald: "bg-emerald-100 dark:bg-emerald-500/15",
};

/* ── main component ── */
export default function FloorOccupancyPage() {
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    floorOccupancyApi
      .getFloorOccupancy()
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setFloors(data?.floors ?? []);
        setUpdatedAt(new Date());
      })
      .catch((err) => {
        const status = err?.response?.status;
        setError(
          status === 404 || !status
            ? "Không kết nối được server. Vui lòng khởi động lại backend."
            : `Lỗi ${status} — không tải được dữ liệu.`
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  /* tổng hợp */
  const totalSlots    = floors.reduce((s, f) => s + f.totalSlots, 0);
  const totalOccupied = floors.reduce((s, f) => s + f.occupiedSlots, 0);
  const totalAvail    = floors.reduce((s, f) => s + f.availableSlots, 0);
  const overallPct    = totalSlots > 0 ? Math.round((totalOccupied / totalSlots) * 100) : 0;

  /* nhóm theo tòa nhà */
  const byBuilding = floors.reduce((acc, f) => {
    if (!acc[f.buildingId])
      acc[f.buildingId] = { name: f.buildingName, floors: [] };
    acc[f.buildingId].floors.push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Tỷ lệ lấp đầy theo tầng
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Trạng thái slot theo thời gian thực
            {updatedAt && (
              <span className="ml-2 text-xs">
                · Cập nhật {updatedAt.toLocaleTimeString("vi-VN")}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />
          Làm mới
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-muted-foreground">
          <RefreshCw size={22} className="animate-spin opacity-40" />
          Đang tải dữ liệu...
        </div>
      )}

      {/* ── Stat cards ── */}
      {!loading && floors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StaffStatCard
            icon={Building2}
            label="Tỷ lệ lấp đầy"
            value={`${overallPct}%`}
            hint={`${totalOccupied} / ${totalSlots} slot`}
            tone={pctTone(overallPct)}
          />
          <StaffStatCard
            icon={CarFront}
            label="Đang có xe"
            value={totalOccupied}
            hint="Slot đang bị chiếm"
            tone="rose"
          />
          <StaffStatCard
            icon={ParkingSquare}
            label="Còn trống"
            value={totalAvail}
            hint="Slot có thể đỗ xe"
            tone="emerald"
          />
        </div>
      )}

      {/* ── Theo từng tòa nhà ── */}
      {!loading &&
        Object.entries(byBuilding).map(([bid, { name, floors: bFloors }]) => (
          <StaffPageSection
            key={bid}
            title={name}
            subtitle={`${bFloors.length} tầng`}
          >
            {/* Thanh ngang */}
            <div className="mb-6 flex flex-col gap-4">
              {bFloors.map((f) => {
                const tone = pctTone(f.occupancyPercent);
                return (
                  <div key={f.floorId}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        {f.floorName || `Tầng ${f.floorNumber}`}
                      </span>
                      <div className="flex items-center gap-3">
                        <StaffStatusBadge tone={tone}>
                          {pctLabel(f.occupancyPercent)}
                        </StaffStatusBadge>
                        <span className="text-sm font-bold text-foreground">
                          {f.occupancyPercent}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {f.occupiedSlots}/{f.totalSlots}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className={`h-2.5 w-full overflow-hidden rounded-full ${BAR_TRACK[tone]}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[tone]}`}
                        style={{ width: `${f.occupancyPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bảng chi tiết */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { label: "Tầng",       align: "text-left"   },
                      { label: "Tổng slot",  align: "text-center" },
                      { label: "Đang có xe", align: "text-center" },
                      { label: "Còn trống",  align: "text-center" },
                      { label: "Đặt trước",  align: "text-center" },
                      { label: "Bảo trì",    align: "text-center" },
                      { label: "Tỷ lệ",      align: "text-center" },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={`${h.align} pb-3 text-xs font-medium text-muted-foreground`}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bFloors.map((f) => (
                    <tr
                      key={f.floorId}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <td className="py-3 font-semibold text-foreground">
                        {f.floorName || `Tầng ${f.floorNumber}`}
                      </td>
                      <td className="py-3 text-center text-muted-foreground">
                        {f.totalSlots}
                      </td>
                      <td className="py-3 text-center font-semibold text-rose-600 dark:text-rose-400">
                        {f.occupiedSlots}
                      </td>
                      <td className="py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                        {f.availableSlots}
                      </td>
                      <td className="py-3 text-center text-blue-600 dark:text-blue-400">
                        {f.reservedSlots}
                      </td>
                      <td className="py-3 text-center text-muted-foreground">
                        {f.maintenanceSlots}
                      </td>
                      <td className="py-3 text-center">
                        <StaffStatusBadge tone={pctTone(f.occupancyPercent)}>
                          {f.occupancyPercent}%
                        </StaffStatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StaffPageSection>
        ))}

      {/* ── Empty ── */}
      {!loading && floors.length === 0 && !error && (
        <StaffPageSection>
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu tầng nào trong hệ thống.
          </p>
        </StaffPageSection>
      )}
    </div>
  );
}

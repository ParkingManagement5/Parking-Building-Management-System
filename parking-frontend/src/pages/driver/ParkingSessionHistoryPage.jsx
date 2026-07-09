import { useEffect, useMemo, useState } from "react";
import { Car, Clock, CircleDollarSign, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { formatCurrency, formatDateTime, formatDuration, getStatusClasses } from "./driverPortalUtils";

const STATUS_LABELS = {
  ACTIVE: "Đang đỗ",
  WAITING_PAYMENT: "Chờ thanh toán",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "ACTIVE", label: "Đang đỗ" },
  { value: "WAITING_PAYMENT", label: "Chờ thanh toán" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã huỷ" },
];

const PAGE_SIZE = 10;

function SessionCard({ session, expanded, onToggle }) {
  const status = (session.status || "").toUpperCase();
  const duration = formatDuration(session.entryTime, session.exitTime);
  const location = [session.buildingName, session.floorName, session.zoneName, session.slotCode]
    .filter(Boolean)
    .join(" › ");

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground font-mono">
              #{session.sessionId}
            </span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(status)}`}
            >
              {STATUS_LABELS[status] || status}
            </span>
            {session.licensePlate && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Car size={10} /> {session.licensePlate}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={10} /> {formatDateTime(session.entryTime)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-shrink-0">
          {status !== "ACTIVE" && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Thời gian đỗ</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{duration}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Phí</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {session.calculatedFee != null ? formatCurrency(session.calculatedFee) : "—"}
            </p>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 text-xs">
          <Detail label="Mã session" value={`#${session.sessionId}`} mono />
          <Detail label="Trạng thái" value={STATUS_LABELS[status] || status} />
          <Detail label="Biển số" value={session.licensePlate} />
          <Detail label="Loại xe" value={session.vehicleTypeName} />
          <Detail label="Vào lúc" value={formatDateTime(session.entryTime)} />
          <Detail label="Ra lúc" value={session.exitTime ? formatDateTime(session.exitTime) : "Đang đỗ"} />
          <Detail label="Thời gian đỗ" value={status !== "ACTIVE" ? duration : "Đang tính..."} />
          <Detail label="Phí đỗ xe" value={session.calculatedFee != null ? formatCurrency(session.calculatedFee) : "—"} />
          <Detail label="Đơn giá/giờ" value={session.hourlyRate != null ? formatCurrency(session.hourlyRate) : "—"} />
          <Detail label="Tòa nhà" value={session.buildingName} />
          <Detail label="Tầng / Khu" value={[session.floorName, session.zoneName].filter(Boolean).join(" / ")} />
          <Detail label="Ô đỗ" value={session.slotCode} />
          {session.entryMode && <Detail label="Cách vào" value={session.entryMode} />}
          {session.entryGateCode && <Detail label="Cổng vào" value={session.entryGateCode} />}
          {session.exitGateCode && <Detail label="Cổng ra" value={session.exitGateCode} />}
          {session.bookingId && <Detail label="Booking liên kết" value={`#${session.bookingId}`} mono />}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

export default function ParkingSessionHistoryPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await driverSessionApi.getMySessions();
        setSessions(unwrapApiData(res.data, []));
      } catch (err) {
        console.error("Failed to load session history", err);
        setError(err.response?.data?.message || "Không tải được lịch sử đỗ xe.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!statusFilter) return sessions;
    return sessions.filter((s) => (s.status || "").toUpperCase() === statusFilter);
  }, [sessions, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const completedSessions = sessions.filter((s) => (s.status || "").toUpperCase() === "COMPLETED");
  const totalFee = completedSessions.reduce((sum, s) => sum + Number(s.calculatedFee || 0), 0);
  const totalDurationMin = completedSessions.reduce((sum, s) => {
    if (!s.entryTime || !s.exitTime) return sum;
    const diff = (new Date(s.exitTime) - new Date(s.entryTime)) / 60000;
    return sum + Math.max(0, diff);
  }, 0);
  const avgDurationMin = completedSessions.length ? Math.round(totalDurationMin / completedSessions.length) : 0;

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    setExpandedId(null);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Car} label="Tổng số lần đỗ" value={String(sessions.length)} sub="Toàn bộ lịch sử" />
        <StatCard icon={CircleDollarSign} label="Tổng phí đã trả" value={formatCurrency(totalFee)} sub="Chỉ tính session hoàn thành" color="emerald" />
        <StatCard
          icon={Clock}
          label="Thời gian đỗ TB"
          value={avgDurationMin >= 60 ? `${Math.floor(avgDurationMin / 60)}h ${avgDurationMin % 60}p` : `${avgDurationMin}p`}
          sub="Tính trên session hoàn thành"
          color="violet"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Lọc:</span>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} phiên
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Session list */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          Đang tải lịch sử đỗ xe...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-card text-muted-foreground">
          <Car size={32} className="opacity-30" />
          <p className="text-sm">Chưa có phiên đỗ xe nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paged.map((s) => (
            <SessionCard
              key={s.sessionId}
              session={s}
              expanded={expandedId === s.sessionId}
              onToggle={() => setExpandedId(expandedId === s.sessionId ? null : s.sessionId)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`size-8 rounded-lg text-xs font-bold transition ${
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${colorMap[color] || "text-foreground"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

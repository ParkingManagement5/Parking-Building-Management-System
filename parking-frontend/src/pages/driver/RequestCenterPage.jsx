import { useEffect, useMemo, useState } from "react";
import { buildingApi } from "../../api/manager/buildingApi";
import { requestApi } from "../../api/driver/requestApi";
import { unwrapApiData } from "../../utils/api";
import { formatDateTime, getStatusClasses, getStatusLabel } from "./driverPortalUtils";

export default function RequestCenterPage() {
  const [requests, setRequests] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [form, setForm] = useState({
    requestType: "OTHER",
    subject: "",
    content: "",
    buildingId: "",
  });
  const [submitStatus, setSubmitStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  const paged = useMemo(() => requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [requests, page]);
  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const [requestRes, buildingRes] = await Promise.all([
          requestApi.getMyRequests(),
          buildingApi.getAll(),
        ]);
        if (!cancelled) {
          setRequests(unwrapApiData(requestRes.data, []));
          setBuildings(unwrapApiData(buildingRes.data, []));
        }
      } catch (error) {
        console.error("Failed to load requests", error);
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitStatus("");

    if (!form.buildingId) {
      setSubmitStatus("error:Vui lòng chọn tòa nhà bạn đang ở.");
      return;
    }
    if (!form.content.trim()) {
      setSubmitStatus("error:Request content is required.");
      return;
    }

    try {
      await requestApi.create({
        requestType: form.requestType,
        subject: form.subject.trim() || requestTypeLabel(form.requestType),
        description: form.content.trim(),
        buildingId: form.buildingId ? Number(form.buildingId) : null,
      });
      const res = await requestApi.getMyRequests();
      setRequests(unwrapApiData(res.data, []));

      setForm({
        requestType: "OTHER",
        subject: "",
        content: "",
        buildingId: "",
      });
      setSubmitStatus("success:Request submitted successfully!");
    } catch (error) {
      console.error("Failed to create request", error);
      setSubmitStatus(`error:${error.response?.data?.message || "Create request failed."}`);
    }
  };

  return (
    <div className="grid lg:grid-cols-[400px_1fr] gap-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4 text-sm">Submit a Request</h3>
        {submitStatus && (
          <div className={`mb-3 rounded-xl px-4 py-3 text-sm ${
            submitStatus.startsWith("success:")
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
          }`}>
            {submitStatus.replace(/^(success|error):/, "")}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Request Type
            </label>
            <select
              value={form.requestType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requestType: event.target.value }))
              }
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="LOST_QR">Lost QR</option>
              <option value="WRONG_FEE">Wrong Fee</option>
              <option value="CANNOT_FIND_CAR">Cannot Find Car</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Building <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.buildingId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, buildingId: event.target.value }))
              }
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">Chọn tòa nhà bạn đang ở</option>
              {buildings.map((b) => (
                <option key={b.buildingId ?? b.id} value={b.buildingId ?? b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Subject
            </label>
            <input
              value={form.subject}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, subject: event.target.value }))
              }
              placeholder="Short summary"
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              value={form.content}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, content: event.target.value }))
              }
              rows={4}
              placeholder="Describe your issue in detail..."
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Submit Request
          </button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">My Requests</h3>
        </div>
        <div className="divide-y divide-border">
          {paged.map((item) => (
            <div key={item.requestId || item.id} className="p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.subject || requestTypeLabel(item.requestType) || "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.requestId || item.id} - {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
                    item.status || "pending"
                  )}`}
                >
                  {getStatusLabel(item.status || "pending")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.description || item.content || "-"}
              </p>
            </div>
          ))}
          {requests.length > 0 && Array.from({ length: Math.max(0, PAGE_SIZE - paged.length) }, (_, index) => (
            <div key={`filler-${index}`} aria-hidden="true" className="invisible p-5">
              &nbsp;
            </div>
          ))}
          {requests.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">
              No support requests returned from the backend.
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              ← Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`size-8 rounded-lg text-xs font-bold transition ${p === page ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
              Sau →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function requestTypeLabel(value) {
  const labels = {
    LOST_QR: "Lost QR",
    WRONG_FEE: "Wrong Fee",
    CANNOT_FIND_CAR: "Cannot Find Car",
    OTHER: "Other",
  };
  return labels[value] || value || "Request";
}

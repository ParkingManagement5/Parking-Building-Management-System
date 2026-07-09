import { useEffect, useState } from "react";
import { requestApi } from "../../api/driver/requestApi";
import { unwrapApiData } from "../../utils/api";
import { formatDateTime, getStatusClasses } from "./driverPortalUtils";

export default function RequestCenterPage() {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    type: "Booking Support",
    content: "",
  });

  async function loadRequests() {
    try {
      const res = await requestApi.getMyRequests();
      setRequests(unwrapApiData(res.data, []));
    } catch (error) {
      console.error("Failed to load requests", error);
      setRequests([]);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.content.trim()) {
      alert("Request content is required");
      return;
    }

    try {
      await requestApi.create({
        type: form.type,
        content: form.content.trim(),
      });

      setForm({
        type: "Booking Support",
        content: "",
      });
      await loadRequests();
    } catch (error) {
      console.error("Failed to create request", error);
      alert(error.response?.data?.message || "Create request failed");
    }
  };

  return (
    <div className="grid lg:grid-cols-[400px_1fr] gap-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4 text-sm">Submit a Request</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Request Type
            </label>
            <select
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, type: event.target.value }))
              }
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="Booking Support">Booking Support</option>
              <option value="Payment Issue">Payment Issue</option>
              <option value="Vehicle Issue">Vehicle Issue</option>
              <option value="Other">Other</option>
            </select>
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
          {requests.map((item) => (
            <div key={item.requestId || item.id} className="p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.type || item.requestType || "-"}
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
                  {item.status || "PENDING"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.content || item.description || "-"}
              </p>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="p-5 text-sm text-muted-foreground">
              No support requests returned from the backend.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

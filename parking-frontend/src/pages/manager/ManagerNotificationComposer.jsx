import { useState } from "react";
import { Send } from "lucide-react";
import { notificationApi } from "../../api/notificationApi";
import { unwrapApiData } from "../../utils/api";
import {
  ManagerField,
  ManagerInput,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerSelect,
  ManagerSecondaryButton,
  ManagerTextarea,
} from "../../ui/components/manager/ManagerUi";

const QUICK_TITLES = ["Parking Closed", "Holiday Notice", "Maintenance"];

const TARGET_OPTIONS = [
  { value: "ALL_USERS", label: "All Users" },
  { value: "STAFF", label: "Staff" },
  { value: "MANAGERS", label: "Managers" },
  { value: "DRIVERS", label: "Drivers" },
  { value: "ADMINS", label: "Admins" },
];

const TYPE_OPTIONS = ["INFO", "WARNING", "MAINTENANCE", "SYSTEM"];

const INITIAL_FORM = {
  title: "Parking Closed",
  body: "",
  type: "INFO",
  targetGroup: "ALL_USERS",
};

export default function ManagerNotificationComposer({ onSent }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setResult("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const title = form.title.trim();
    const body = form.body.trim();

    if (!title) {
      setError("Title is required.");
      return;
    }

    setSending(true);
    setError("");
    setResult("");

    try {
      const response = await notificationApi.broadcast({
        title,
        body,
        type: form.type,
        targetGroup: form.targetGroup,
        entityType: "SYSTEM_NOTIFICATION",
      });
      const created = unwrapApiData(response.data, []);
      setResult(`Sent "${title}" to ${created.length} user(s).`);
      setForm((prev) => ({ ...prev, body: "" }));
      await onSent?.();
    } catch (err) {
      console.error("Failed to broadcast notification", err);
      setError(err.response?.data?.message || "Send notification failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ManagerPanel title="Create notification" subtitle="Manager creates announcements and sends them to selected user groups.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ManagerField label="Quick title">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {QUICK_TITLES.map((title) => (
              <ManagerSecondaryButton
                key={title}
                type="button"
                onClick={() => updateField("title", title)}
                className={`text-left font-mono ${form.title === title ? "border-primary bg-primary/10 text-primary" : ""}`}
              >
                {title}
              </ManagerSecondaryButton>
            ))}
          </div>
        </ManagerField>

        <div className="grid gap-4 md:grid-cols-2">
          <ManagerField label="Title">
            <ManagerInput
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="Parking Closed"
              maxLength={200}
            />
          </ManagerField>
          <ManagerField label="Type">
            <ManagerSelect value={form.type} onChange={(event) => updateField("type", event.target.value)}>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </ManagerSelect>
          </ManagerField>
        </div>

        <ManagerField label="Send to">
          <div className="grid gap-2 sm:grid-cols-3">
            {TARGET_OPTIONS.map((target) => (
              <button
                key={target.value}
                type="button"
                onClick={() => updateField("targetGroup", target.value)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  form.targetGroup === target.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/20 text-foreground hover:bg-muted"
                }`}
              >
                {target.label}
              </button>
            ))}
          </div>
        </ManagerField>

        <ManagerField label="Content">
          <ManagerTextarea
            value={form.body}
            onChange={(event) => updateField("body", event.target.value)}
            placeholder="Write the announcement content..."
            rows={5}
          />
        </ManagerField>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            {result}
          </div>
        ) : null}

        <ManagerPrimaryButton type="submit" disabled={sending} className="inline-flex items-center gap-2">
          <Send size={16} />
          {sending ? "Sending..." : "Send notification"}
        </ManagerPrimaryButton>
      </form>
    </ManagerPanel>
  );
}

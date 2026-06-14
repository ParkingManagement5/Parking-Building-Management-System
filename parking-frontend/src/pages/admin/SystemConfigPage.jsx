import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { systemConfigApi } from "../../api/admin/systemConfigApi";
import { getUserId } from "../../utils/auth";
import {
  ManagerEmptyState,
  ManagerField,
  ManagerForm,
  ManagerInput,
  ManagerPageHeader,
  ManagerPrimaryButton,
  ManagerSecondaryButton,
} from "../../ui/components/manager/ManagerUi";

const GROUP_META = {
  OCR: { title: "OCR System" },
  BOOKING: { title: "Booking System" },
  NOTIFICATION: { title: "Notifications" },
  SECURITY: { title: "Security" },
  OTHER: { title: "Other Settings" },
};

function prettifyKey(key) {
  return String(key || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function detectGroup(configKey) {
  const key = String(configKey || "").toUpperCase();
  if (key.includes("OCR")) return "OCR";
  if (key.includes("BOOK") || key.includes("CANCEL")) return "BOOKING";
  if (key.includes("NOTIF") || key.includes("REMINDER") || key.includes("EMAIL") || key.includes("ALERT")) {
    return "NOTIFICATION";
  }
  if (key.includes("SECURITY") || key.includes("SESSION") || key.includes("LOGIN") || key.includes("2FA")) {
    return "SECURITY";
  }
  return "OTHER";
}

function detectFieldType(configKey, value) {
  const key = String(configKey || "").toUpperCase();
  const normalized = String(value || "").trim().toLowerCase();

  if (
    normalized === "enabled" ||
    normalized === "disabled" ||
    normalized === "true" ||
    normalized === "false" ||
    key.includes("ENABLE") ||
    key.includes("AUTO_CORRECT") ||
    key.includes("GUEST_BOOKING") ||
    key.includes("EMAIL_NOTIFICATION")
  ) {
    return "toggle";
  }

  return "input";
}

function normalizeToggleValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "enabled" || normalized === "true";
}

function serializeToggleValue(value, originalValue) {
  const original = String(originalValue || "").trim().toLowerCase();
  if (original === "true" || original === "false") {
    return value ? "true" : "false";
  }
  return value ? "Enabled" : "Disabled";
}

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [draftValues, setDraftValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    configKey: "",
    configValue: "",
    description: "",
  });

  useEffect(() => {
    void loadConfigs();
  }, []);

  async function loadConfigs() {
    try {
      const res = await systemConfigApi.getAll();
      const items = Array.isArray(res.data) ? res.data : [];
      setConfigs(items);
      setDraftValues(
        Object.fromEntries(
          items.map((item) => [item.configId, item.configValue ?? ""])
        )
      );
    } catch (error) {
      console.error("Failed to load system configs", error);
      alert("Cannot load system configurations");
      setConfigs([]);
      setDraftValues({});
    }
  }

  const groupedConfigs = useMemo(() => {
    const groups = {
      OCR: [],
      BOOKING: [],
      NOTIFICATION: [],
      SECURITY: [],
      OTHER: [],
    };

    configs.forEach((item) => {
      groups[detectGroup(item.configKey)].push(item);
    });

    return groups;
  }, [configs]);

  const hasChanges = useMemo(
    () =>
      configs.some(
        (item) => String(draftValues[item.configId] ?? "") !== String(item.configValue ?? "")
      ),
    [configs, draftValues]
  );

  const handleInputChange = (configId, value) => {
    setDraftValues((prev) => ({
      ...prev,
      [configId]: value,
    }));
  };

  const handleToggleChange = (item, checked) => {
    setDraftValues((prev) => ({
      ...prev,
      [item.configId]: serializeToggleValue(checked, item.configValue),
    }));
  };

  const handleReset = () => {
    setDraftValues(
      Object.fromEntries(
        configs.map((item) => [item.configId, item.configValue ?? ""])
      )
    );
  };

  const handleSaveChanges = async () => {
    const userId = getUserId();
    if (!userId) {
      alert("Please login again to manage system configs");
      return;
    }

    const changedItems = configs.filter(
      (item) => String(draftValues[item.configId] ?? "") !== String(item.configValue ?? "")
    );

    if (!changedItems.length) {
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        changedItems.map((item) =>
          systemConfigApi.update(
            item.configId,
            {
              configKey: item.configKey,
              configValue: String(draftValues[item.configId] ?? ""),
              description: item.description || "",
            },
            userId
          )
        )
      );

      await loadConfigs();
    } catch (error) {
      console.error("Failed to save system configs", error);
      alert("Save system configuration failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChange = (event) => {
    setCreateForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const resetCreateForm = () => {
    setCreateForm({
      configKey: "",
      configValue: "",
      description: "",
    });
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetCreateForm();
  };

  const handleCreateConfig = async (event) => {
    event.preventDefault();

    const userId = getUserId();
    if (!userId) {
      alert("Please login again to manage system configs");
      return;
    }

    if (!createForm.configKey.trim()) {
      alert("Config key is required");
      return;
    }

    try {
      await systemConfigApi.create(
        {
          configKey: createForm.configKey.trim(),
          configValue: createForm.configValue,
          description: createForm.description,
        },
        userId
      );
      await loadConfigs();
      closeAddModal();
    } catch (error) {
      console.error("Failed to create system config", error);
      alert("Create system configuration failed");
    }
  };

  const addConfigModal = showAddModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Add Config</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a new system configuration record.</p>
          </div>
          <button type="button" onClick={closeAddModal} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted">
            <X size={18} />
          </button>
        </div>
        <ManagerForm onSubmit={handleCreateConfig}>
          <ManagerField label="Config Key">
            <ManagerInput name="configKey" value={createForm.configKey} onChange={handleCreateChange} placeholder="QR_EXPIRE_MINUTES" />
          </ManagerField>
          <ManagerField label="Config Value">
            <ManagerInput name="configValue" value={createForm.configValue} onChange={handleCreateChange} placeholder="30" />
          </ManagerField>
          <ManagerField label="Description">
            <ManagerInput name="description" value={createForm.description} onChange={handleCreateChange} placeholder="Short explanation" />
          </ManagerField>
          <div className="flex gap-3">
            <ManagerPrimaryButton type="submit" className="flex-1">Create Config</ManagerPrimaryButton>
            <ManagerSecondaryButton type="button" className="flex-1" onClick={closeAddModal}>Cancel</ManagerSecondaryButton>
          </div>
        </ManagerForm>
      </div>
    </div>
  ) : null;

  const renderCard = (groupKey, items) => {
    if (!items.length) {
      return null;
    }

    return (
      <div
        key={groupKey}
        className={`rounded-3xl border border-border bg-card p-6 ${
          groupKey === "OTHER" ? "xl:col-span-2" : ""
        }`}
      >
        <h3 className="text-xl font-semibold text-foreground">{GROUP_META[groupKey].title}</h3>
        <div className="mt-4 space-y-5 border-t border-border pt-4">
          {items.map((item) => {
            const fieldType = detectFieldType(item.configKey, item.configValue);
            const currentValue = draftValues[item.configId] ?? "";

            return (
              <div key={item.configId} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-base text-foreground">
                    {item.description?.trim() || prettifyKey(item.configKey)}
                  </p>
                </div>

                {fieldType === "toggle" ? (
                  <button
                    type="button"
                    onClick={() => handleToggleChange(item, !normalizeToggleValue(currentValue))}
                    className={`relative inline-flex h-9 w-11 shrink-0 rounded-full transition-colors ${
                      normalizeToggleValue(currentValue) ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`m-0.5 inline-block size-8 rounded-full bg-white shadow transition-transform ${
                        normalizeToggleValue(currentValue) ? "translate-x-2.5" : "translate-x-0"
                      }`}
                    />
                  </button>
                ) : (
                  <input
                    value={currentValue}
                    onChange={(event) => handleInputChange(item.configId, event.target.value)}
                    className="w-32 shrink-0 rounded-full border border-border bg-muted px-4 py-2 text-right text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!configs.length) {
    return (
      <div className="space-y-4">
        <ManagerEmptyState
          title="No system configurations found"
          description="The backend did not return any system config entries yet."
        />
        <div className="flex justify-end">
          <ManagerPrimaryButton type="button" onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus size={14} />
            Add Config
          </ManagerPrimaryButton>
        </div>
        {addConfigModal}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid auto-rows-fr gap-5 xl:grid-cols-2">
        {["OCR", "BOOKING", "NOTIFICATION", "SECURITY", "OTHER"]
          .map((groupKey) => renderCard(groupKey, groupedConfigs[groupKey]))
          .filter(Boolean)}
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <ManagerPrimaryButton type="button" onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 sm:justify-start">
          <Plus size={14} />
          Add Config
        </ManagerPrimaryButton>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={!hasChanges || saving}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {addConfigModal}
    </div>
  );
}

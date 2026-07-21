import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { systemConfigApi } from "../../api/admin/systemConfigApi";
import { getUserId } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";
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
  OCR: { title: "Hệ thống OCR" },
  BOOKING: { title: "Hệ thống đặt chỗ" },
  NOTIFICATION: { title: "Thông báo" },
  SECURITY: { title: "Bảo mật" },
  OTHER: { title: "Cài đặt khác" },
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
  const [page, setPage] = useState(1);
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
      const items = unwrapApiData(res.data, []);
      setConfigs(items);
      setDraftValues(
        Object.fromEntries(
          items.map((item) => [item.configId, item.configValue ?? ""])
        )
      );
    } catch (error) {
      console.error("Failed to load system configs", error);
      alert("Không tải được cấu hình hệ thống");
      setConfigs([]);
      setDraftValues({});
    }
  }

  const PAGE_SIZE = 10;
  const pagedConfigs = useMemo(() => configs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [configs, page]);
  const totalPages = Math.max(1, Math.ceil(configs.length / PAGE_SIZE));
  const summary = useMemo(() => {
    const total = configs.length;
    const changed = configs.filter(
      (item) => String(draftValues[item.configId] ?? "") !== String(item.configValue ?? "")
    ).length;
    return { total, changed };
  }, [configs, draftValues]);

  const groupedConfigs = useMemo(() => {
    const groups = {
      OCR: [],
      BOOKING: [],
      NOTIFICATION: [],
      SECURITY: [],
      OTHER: [],
    };

    pagedConfigs.forEach((item) => {
      groups[detectGroup(item.configKey)].push(item);
    });

    return groups;
  }, [pagedConfigs]);

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
      alert("Vui lòng đăng nhập lại để quản lý cấu hình hệ thống");
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
      alert("Lưu cấu hình hệ thống thất bại");
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
      alert("Vui lòng đăng nhập lại để quản lý cấu hình hệ thống");
      return;
    }

    if (!createForm.configKey.trim()) {
      alert("Khóa cấu hình là bắt buộc");
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
      alert("Tạo cấu hình hệ thống thất bại");
    }
  };

  const addConfigModal = showAddModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Thêm cấu hình</h3>
            <p className="mt-1 text-sm text-muted-foreground">Tạo một bản ghi cấu hình hệ thống mới.</p>
          </div>
          <button type="button" onClick={closeAddModal} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted">
            <X size={18} />
          </button>
        </div>
        <ManagerForm onSubmit={handleCreateConfig}>
          <ManagerField label="Khóa cấu hình">
            <ManagerInput name="configKey" value={createForm.configKey} onChange={handleCreateChange} placeholder="QR_EXPIRE_MINUTES" />
          </ManagerField>
          <ManagerField label="Giá trị">
            <ManagerInput name="configValue" value={createForm.configValue} onChange={handleCreateChange} placeholder="30" />
          </ManagerField>
          <ManagerField label="Mô tả">
            <ManagerInput name="description" value={createForm.description} onChange={handleCreateChange} placeholder="Mô tả ngắn gọn" />
          </ManagerField>
          <div className="flex gap-3">
            <ManagerPrimaryButton type="submit" className="flex-1">Tạo cấu hình</ManagerPrimaryButton>
            <ManagerSecondaryButton type="button" className="flex-1" onClick={closeAddModal}>Hủy</ManagerSecondaryButton>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{GROUP_META[groupKey].title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{items.length} cấu hình</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const fieldType = detectFieldType(item.configKey, item.configValue);
            const currentValue = draftValues[item.configId] ?? "";
            const hasChanged = String(currentValue ?? "") !== String(item.configValue ?? "");

            return (
              <div
                key={item.configId}
                className={`rounded-2xl border px-4 py-3 transition-colors ${
                  hasChanged ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-6 text-foreground">
                      {item.description?.trim() || prettifyKey(item.configKey)}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.configKey}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start lg:self-center">
                    {hasChanged ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        Đã sửa
                      </span>
                    ) : null}

                    {fieldType === "toggle" ? (
                      <button
                        type="button"
                        onClick={() => handleToggleChange(item, !normalizeToggleValue(currentValue))}
                        className={`relative inline-flex h-8 w-11 shrink-0 rounded-full transition-colors ${
                          normalizeToggleValue(currentValue) ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`m-0.5 inline-block size-7 rounded-full bg-white shadow transition-transform dark:bg-slate-100 ${
                            normalizeToggleValue(currentValue) ? "translate-x-3" : "translate-x-0"
                          }`}
                        />
                      </button>
                    ) : (
                      <input
                        value={currentValue}
                        onChange={(event) => handleInputChange(item.configId, event.target.value)}
                        className="h-11 w-24 shrink-0 rounded-2xl border border-border bg-muted px-4 text-right text-sm font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                    )}
                  </div>
                </div>
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
          title="Chưa có cấu hình hệ thống nào"
          description="Hệ thống chưa trả về bản ghi cấu hình nào."
        />
        <div className="flex justify-end">
          <ManagerPrimaryButton type="button" onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus size={14} />
            Thêm cấu hình
          </ManagerPrimaryButton>
        </div>
        {addConfigModal}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Cấu hình hệ thống"
        description="Quản lý nhanh các mốc thời gian, toggle hệ thống và cấu hình vận hành cốt lõi."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {summary.total} cấu hình
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              {summary.changed} thay đổi
            </span>
          </div>
        }
      />

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <ManagerPrimaryButton type="button" onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2">
            <Plus size={14} />
            Thêm cấu hình
          </ManagerPrimaryButton>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Đặt lại
          </button>
        </div>
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={!hasChanges || saving}
          className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>

      <div className="grid auto-rows-fr gap-5 xl:grid-cols-2" style={{ minHeight: totalPages > 1 ? 420 : undefined }}>
        {["OCR", "BOOKING", "NOTIFICATION", "SECURITY", "OTHER"]
          .map((groupKey) => renderCard(groupKey, groupedConfigs[groupKey]))
          .filter(Boolean)}
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

      {addConfigModal}
    </div>
  );
}

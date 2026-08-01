import { useEffect, useMemo, useState } from "react";
import { Car, Plus, X } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { unwrapApiData } from "../../utils/api";
import { getStatusClasses } from "./driverPortalUtils";
import { useToast } from "../../ui/components/Toast";
import { useConfirm } from "../../ui/components/ConfirmDialog";
import { Banner } from "../../ui/components/Banner";

function getVehicleTypeId(item) {
  return item?.vehicleTypeId ?? item?.id ?? "";
}

export default function MyVehiclesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [vehicles, setVehicles] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    licensePlate: "",
    vehicleTypeId: "",
    color: "",
    brand: "",
    model: "",
    year: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadVehicles() {
      try {
        const [vehiclesRes, typesRes] = await Promise.all([
          axiosClient.get("/vehicles/my"),
          vehicleTypeApi.getAll(),
        ]);
        if (!cancelled) {
          const types = unwrapApiData(typesRes.data, []);
          setVehicles(unwrapApiData(vehiclesRes.data, []));
          setVehicleTypes(types);
          setForm((prev) => ({
            ...prev,
            vehicleTypeId: prev.vehicleTypeId || String(getVehicleTypeId(types[0])),
          }));
        }
      } catch (error) {
        console.error("Failed to load vehicles or vehicle types", error);
        if (!cancelled) {
          setVehicles([]);
          setVehicleTypes([]);
        }
      }
    }

    void loadVehicles();

    return () => {
      cancelled = true;
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      licensePlate: "",
      vehicleTypeId: String(getVehicleTypeId(vehicleTypes[0])),
      color: "",
      brand: "",
      model: "",
      year: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.vehicleId || item.id);
    setForm({
      licensePlate: item.licensePlate || "",
      vehicleTypeId: String(item.vehicleType?.vehicleTypeId || item.vehicleType?.id || item.vehicleTypeId || getVehicleTypeId(vehicleTypes[0])),
      color: item.color || "",
      brand: item.brand || "",
      model: item.model || "",
      year: item.year || "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.licensePlate.trim()) {
      setFormError("Biển số xe là bắt buộc.");
      return;
    }
    if (!form.vehicleTypeId) {
      setFormError("Loại xe là bắt buộc. Vui lòng liên hệ quản lý để tạo loại xe trước.");
      return;
    }

    const payload = {
      vehicleTypeId: Number(form.vehicleTypeId),
      licensePlate: form.licensePlate.trim().toUpperCase(),
      brand: form.brand || "Không rõ",
      model: form.model || "Không rõ",
      color: form.color || "",
    };

    try {
      if (editingId) {
        await axiosClient.put(`/vehicles/${editingId}`, payload);
      } else {
        await axiosClient.post("/vehicles", payload);
      }

      const res = await axiosClient.get("/vehicles/my");
      setVehicles(unwrapApiData(res.data, []));
      setShowModal(false);
      resetForm();
      toast.success(editingId ? "Đã cập nhật xe" : "Đã thêm xe mới");
    } catch (error) {
      console.error("Failed to save vehicle", error);
      setFormError(error.response?.data?.message || "Lưu xe thất bại.");
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: "Vô hiệu hóa xe này?",
      message: "Xe sẽ bị ẩn khỏi các booking mới nhưng lịch sử vẫn được giữ lại.",
      confirmLabel: "Vô hiệu hóa",
      tone: "warning",
    });
    if (!ok) return;

    try {
      await axiosClient.delete(`/vehicles/${id}`);
      const res = await axiosClient.get("/vehicles/my");
      setVehicles(unwrapApiData(res.data, []));
      toast.success("Đã vô hiệu hóa xe");
    } catch (error) {
      console.error("Failed to delete vehicle", error);
      toast.error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Vô hiệu hóa xe thất bại"
      );
    }
  };

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;
  const paged = useMemo(() => vehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [vehicles, page]);
  const totalPages = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));

  const inputClass =
    "w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Xe của tôi</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {vehicles.length} xe đã đăng ký
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Thêm xe
        </button>
      </div>

      {/* Vehicle grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paged.map((item) => {
          const id = item.vehicleId || item.id;
          const status =
            item.isActive !== false && item.status !== "INACTIVE" ? "active" : "inactive";
          const typeName =
            item.vehicleType?.name || item.vehicleTypeName || item.vehicleType || "Xe";
          const displayName = [item.brand, item.model].filter(Boolean).join(" ") || "Xe";

          return (
            <div
              key={id}
              className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-md"
            >
              {/* Top: icon + status */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <Car size={18} className="text-muted-foreground" />
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getStatusClasses(status)}`}
                >
                  {status === "active" ? "Hoạt động" : "Ngưng"}
                </span>
              </div>

              {/* Info */}
              <p className="font-mono text-lg font-bold text-foreground">{item.licensePlate}</p>
              <p className="mt-0.5 text-sm text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {typeName}{item.color ? ` · ${item.color}` : ""}{item.year ? ` · ${item.year}` : ""}
              </p>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEdit(item)}
                  className="flex-1 rounded-lg border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => handleDelete(id)}
                  className="flex-1 rounded-lg border border-destructive/30 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
                >
                  Vô hiệu hóa
                </button>
              </div>
            </div>
          );
        })}
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

      {/* Empty state */}
      {vehicles.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          Chưa có xe nào được đăng ký.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Modal header */}
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                {editingId ? "Cập nhật xe" : "Thêm xe mới"}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="rounded-lg p-1.5 transition-colors hover:bg-muted"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <Banner tone="error">{formError}</Banner>}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Biển số xe *</label>
                <input
                  required
                  value={form.licensePlate}
                  onChange={(event) => setForm((prev) => ({ ...prev, licensePlate: event.target.value }))}
                  placeholder="51L-666.66"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Loại xe</label>
                  <select
                    value={form.vehicleTypeId}
                    onChange={(event) => setForm((prev) => ({ ...prev, vehicleTypeId: event.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Chọn loại</option>
                    {vehicleTypes.map((item) => (
                      <option key={getVehicleTypeId(item)} value={getVehicleTypeId(item)}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Năm SX</label>
                  <input
                    value={form.year}
                    onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
                    placeholder="2024"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Hãng xe</label>
                <input
                  value={form.brand}
                  onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
                  placeholder="Toyota"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Mẫu xe</label>
                <input
                  value={form.model}
                  onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
                  placeholder="Camry"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Màu sắc</label>
                <input
                  value={form.color}
                  onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                  placeholder="Bạc"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm transition-colors hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {editingId ? "Cập nhật" : "Thêm xe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

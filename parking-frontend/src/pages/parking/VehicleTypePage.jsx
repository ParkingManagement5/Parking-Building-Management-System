import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerField,
  ManagerForm,
  ManagerInput,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerRow,
  ManagerSecondaryButton,
  ManagerSelect,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";
import { useToast } from "../../ui/components/Toast";
import { useConfirm } from "../../ui/components/ConfirmDialog";

const SLOT_SIZE_LABELS = { SMALL: "Nhỏ", MEDIUM: "Vừa", LARGE: "Lớn" };

export default function VehicleTypePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    slotSize: "SMALL",
    hourlyRate: 5000,
    dailyRate: 50000,
  });

  useEffect(() => {
    void fetchVehicleTypes();
  }, []);

  async function fetchVehicleTypes() {
    try {
      const res = await vehicleTypeApi.getAll();
      setVehicleTypes(unwrapApiData(res.data, []));
    } catch (error) {
      console.error("Failed to fetch vehicle types", error);
      toast.error("Không tải được danh sách loại xe");
    }
  }

  const resetForm = () => {
    setEditingId(null);
    setFormError("");
    setForm({
      name: "",
      description: "",
      slotSize: "SMALL",
      hourlyRate: 5000,
      dailyRate: 50000,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Tên loại xe là bắt buộc");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      slotSize: form.slotSize,
      hourlyRate: Number(form.hourlyRate),
      dailyRate: Number(form.dailyRate),
    };

    try {
      if (editingId) {
        await vehicleTypeApi.update(editingId, payload);
      } else {
        await vehicleTypeApi.create(payload);
      }
      await fetchVehicleTypes();
      toast.success(editingId ? "Đã cập nhật loại xe" : "Đã tạo loại xe mới");
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save vehicle type", error);
      toast.error("Lưu loại xe thất bại");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.vehicleTypeId || item.id);
    setFormError("");
    setForm({
      name: item.name || "",
      description: item.description || "",
      slotSize: item.slotSize || "SMALL",
      hourlyRate: item.hourlyRate || 5000,
      dailyRate: item.dailyRate || 50000,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: "Xóa loại xe này?", confirmLabel: "Xóa", tone: "danger" });
    if (!ok) return;
    try {
      await vehicleTypeApi.delete(id);
      toast.success("Đã xóa loại xe");
      await fetchVehicleTypes();
    } catch (error) {
      console.error("Failed to delete vehicle type", error);
      toast.error("Xóa loại xe thất bại");
    }
  };

  return (
    <div className="space-y-5">
      <ManagerPanel>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Loại xe</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{vehicleTypes.length} loại xe</p>
          </div>
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={14} /> Thêm loại xe
          </ManagerPrimaryButton>
        </div>
        {vehicleTypes.length === 0 ? (
          <ManagerEmptyState title="Chưa có loại xe nào" description="Tạo loại xe trước khi cấu hình zone, slot hoặc bảng giá." />
        ) : (
          <ManagerDataTable columns={["Tên", "Mô tả", "Kích cỡ slot", "Giá/giờ", "Giá/ngày", "Thao tác"]}>
            {vehicleTypes.map((item) => (
              <ManagerRow key={item.vehicleTypeId || item.id}>
                <ManagerCell className="font-medium">{item.name}</ManagerCell>
                <ManagerCell>{item.description || "Không có mô tả"}</ManagerCell>
                <ManagerCell><ManagerStatusBadge tone="blue">{SLOT_SIZE_LABELS[item.slotSize] || item.slotSize}</ManagerStatusBadge></ManagerCell>
                <ManagerCell>{Number(item.hourlyRate || 0).toLocaleString("vi-VN")}đ</ManagerCell>
                <ManagerCell>{Number(item.dailyRate || 0).toLocaleString("vi-VN")}đ</ManagerCell>
                <ManagerCell>
                  <div className="flex gap-2">
                    <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Sửa</ManagerSecondaryButton>
                    <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.vehicleTypeId || item.id)}>Xóa</ManagerSecondaryButton>
                  </div>
                </ManagerCell>
              </ManagerRow>
            ))}
          </ManagerDataTable>
        )}
      </ManagerPanel>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Cập nhật loại xe" : "Thêm loại xe"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Đảm bảo kích cỡ và giá mặc định khớp với cấu hình bảng giá.</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={handleSubmit}>
              <ManagerField label="Tên loại xe" error={formError}>
                <ManagerInput value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setFormError(""); }} placeholder="Ô tô" />
              </ManagerField>
              <ManagerField label="Mô tả">
                <ManagerInput value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Xe chở khách tiêu chuẩn" />
              </ManagerField>
              <ManagerField label="Kích cỡ slot">
                <ManagerSelect value={form.slotSize} onChange={(event) => setForm({ ...form, slotSize: event.target.value })}>
                  <option value="SMALL">Nhỏ</option>
                  <option value="MEDIUM">Vừa</option>
                  <option value="LARGE">Lớn</option>
                </ManagerSelect>
              </ManagerField>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Giá theo giờ">
                  <ManagerInput type="number" value={form.hourlyRate} onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })} />
                </ManagerField>
                <ManagerField label="Giá theo ngày">
                  <ManagerInput type="number" value={form.dailyRate} onChange={(event) => setForm({ ...form, dailyRate: event.target.value })} />
                </ManagerField>
              </div>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{editingId ? "Lưu thay đổi" : "Tạo loại xe"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Hủy</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

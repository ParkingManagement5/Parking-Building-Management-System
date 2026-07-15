import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { pricingPolicyApi } from "../../api/manager/pricingPolicyApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import {
  ManagerCell,
  ManagerDataTable,
  ManagerEmptyState,
  ManagerField,
  ManagerForm,
  ManagerInput,
  ManagerPageHeader,
  ManagerPanel,
  ManagerPrimaryButton,
  ManagerRow,
  ManagerSecondaryButton,
  ManagerSelect,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

const TIME_TYPE_LABELS = { HOURLY: "Theo giờ", DAILY: "Theo ngày", WEEKLY: "Theo tuần", MONTHLY: "Theo tháng" };
const DAY_TYPE_LABELS = { WEEKDAY: "Ngày thường", WEEKEND: "Cuối tuần", HOLIDAY: "Ngày lễ" };

export default function PricingPolicyPage() {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [filterVehicleType, setFilterVehicleType] = useState("");
  const [filterTimeType, setFilterTimeType] = useState("");
  const [filterDayType, setFilterDayType] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    vehicleTypeId: "",
    buildingId: "",
    timeType: "HOURLY",
    dayType: "WEEKDAY",
    startHour: "",
    endHour: "",
    pricePerHour: "",
    isActive: true,
  });

  useEffect(() => {
    void loadInitialData();
  }, []);

  const vehicleTypeMap = useMemo(
    () => Object.fromEntries(vehicleTypes.map((item) => [item.id ?? item.vehicleTypeId, item.name])),
    [vehicleTypes]
  );

  async function loadInitialData() {
    try {
      const [vehicleTypeRes, policyRes] = await Promise.all([vehicleTypeApi.getAll(), pricingPolicyApi.getAll()]);
      setVehicleTypes(unwrapApiData(vehicleTypeRes.data, []));
      setPolicies(unwrapApiData(policyRes.data, []));
    } catch (error) {
      console.error("Failed to load pricing data", error);
      alert("Không tải được danh sách bảng giá");
    }
  }

  const resetForm = () => {
    setEditingId(null);
    setForm({
      vehicleTypeId: "",
      buildingId: "",
      timeType: "HOURLY",
      dayType: "WEEKDAY",
      startHour: "",
      endHour: "",
      pricePerHour: "",
      isActive: true,
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

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.vehicleTypeId || !form.pricePerHour) {
      alert("Loại xe và giá là bắt buộc");
      return;
    }

    const payload = {
      vehicleTypeId: Number(form.vehicleTypeId),
      // buildingId luôn để null - backend tự gán theo toà Manager đang quản lý (resolveScopeBuildingId).
      buildingId: null,
      timeType: form.timeType,
      dayType: form.dayType,
      startHour: form.startHour ? Number(form.startHour) : null,
      endHour: form.endHour ? Number(form.endHour) : null,
      pricePerHour: Number(form.pricePerHour),
      isActive: form.isActive,
    };

    try {
      // Backend da tu set dung isActive theo payload.isActive khi create/update roi
      // (xem PricingPolicyServiceImpl) - KHONG duoc goi them activate(editingId) o day:
      // khi gia thay doi that su, update() tao ban ghi MOI (id khac) va deactivate ban
      // ghi CU, nhung editingId van tro ve ban ghi CU - goi activate(editingId) se vo
      // tinh bat lai gia CU, khien 2 ban ghi cung active va gia moi sua khong hien ra.
      if (editingId) {
        await pricingPolicyApi.update(editingId, payload);
      } else {
        await pricingPolicyApi.create(payload);
      }
      await loadInitialData();
      setPage(1);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save pricing policy", error);
      alert(error.response?.data?.message || "Lưu bảng giá thất bại");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.policyId);
    setForm({
      vehicleTypeId: item.vehicleTypeId,
      buildingId: item.buildingId ?? "",
      timeType: item.timeType,
      dayType: item.dayType,
      startHour: item.startHour ?? "",
      endHour: item.endHour ?? "",
      pricePerHour: item.pricePerHour ?? "",
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm("Tắt bảng giá này? Các phiên đỗ xe cũ vẫn giữ nguyên giá lịch sử, chỉ dừng áp dụng cho phiên mới.")) return;
    try {
      await pricingPolicyApi.delete(id);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to deactivate pricing policy", error);
      alert(error.response?.data?.message || "Tắt bảng giá thất bại");
    }
  };

  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      if (filterVehicleType && String(p.vehicleTypeId) !== String(filterVehicleType)) return false;
      if (filterTimeType && p.timeType !== filterTimeType) return false;
      if (filterDayType && p.dayType !== filterDayType) return false;
      if (filterStatus === "active" && !p.isActive) return false;
      if (filterStatus === "inactive" && p.isActive) return false;
      return true;
    });
  }, [policies, filterVehicleType, filterTimeType, filterDayType, filterStatus]);

  const PAGE_SIZE = 10;
  const pagedPolicies = useMemo(() => filteredPolicies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredPolicies, page]);
  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / PAGE_SIZE));

  const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Quản lý bảng giá"
        description="Thiết lập giá theo loại xe, loại ngày và khung giờ."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              {policies.length} bảng giá
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              {policies.filter((item) => item.isActive).length} đang bật
            </span>
            <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
              <Plus size={14} /> Thêm bảng giá
            </ManagerPrimaryButton>
          </div>
        }
      />

      <ManagerPanel
        title="Danh sách bảng giá"
        subtitle={`${filteredPolicies.length} / ${policies.length} chính sách`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterVehicleType}
              onChange={(e) => { setFilterVehicleType(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
            >
              <option value="">Tất cả loại xe</option>
              {vehicleTypes.map((v) => (
                <option key={v.id ?? v.vehicleTypeId} value={v.id ?? v.vehicleTypeId}>{v.name}</option>
              ))}
            </select>
            <select
              value={filterTimeType}
              onChange={(e) => { setFilterTimeType(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
            >
              <option value="">Tất cả loại thời gian</option>
              <option value="HOURLY">Theo giờ</option>
              <option value="DAILY">Theo ngày</option>
              <option value="WEEKLY">Theo tuần</option>
              <option value="MONTHLY">Theo tháng</option>
            </select>
            <select
              value={filterDayType}
              onChange={(e) => { setFilterDayType(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
            >
              <option value="">Tất cả loại ngày</option>
              <option value="WEEKDAY">Ngày thường</option>
              <option value="WEEKEND">Cuối tuần</option>
              <option value="HOLIDAY">Ngày lễ</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bật</option>
              <option value="inactive">Đã tắt</option>
            </select>
            {(filterVehicleType || filterTimeType || filterDayType || filterStatus !== "all") && (
              <button
                onClick={() => { setFilterVehicleType(""); setFilterTimeType(""); setFilterDayType(""); setFilterStatus("all"); setPage(1); }}
                className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} /> Xóa lọc
              </button>
            )}
          </div>
        }
      >
        {filteredPolicies.length === 0 ? (
          <ManagerEmptyState title="Chưa có bảng giá nào" description="Tạo bảng giá để hệ thống tính phí đặt chỗ và thanh toán." />
        ) : (
          <ManagerDataTable columns={["Loại xe", "Toà nhà", "Loại thời gian", "Loại ngày", "Khung giờ", "Giá", "Trạng thái", "Thao tác"]} minRows={PAGE_SIZE}>
            {pagedPolicies.map((item) => (
              <ManagerRow key={item.policyId}>
                <ManagerCell>{vehicleTypeMap[item.vehicleTypeId] || item.vehicleTypeId}</ManagerCell>
                <ManagerCell>
                  {item.buildingId ? (item.buildingName || item.buildingId) : (
                    <ManagerStatusBadge tone="slate">Mặc định (Global)</ManagerStatusBadge>
                  )}
                </ManagerCell>
                <ManagerCell><ManagerStatusBadge tone="blue">{TIME_TYPE_LABELS[item.timeType] || item.timeType}</ManagerStatusBadge></ManagerCell>
                <ManagerCell>{DAY_TYPE_LABELS[item.dayType] || item.dayType}</ManagerCell>
                <ManagerCell>{item.startHour ?? "-"} - {item.endHour ?? "-"}</ManagerCell>
                <ManagerCell className="font-medium">{formatCurrency(item.pricePerHour)}</ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={item.isActive ? "emerald" : "amber"}>{item.isActive ? "Đang bật" : "Đã tắt"}</ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>
                  {!item.buildingId ? (
                    <span className="text-xs text-muted-foreground whitespace-nowrap" title="Bảng giá mặc định cũ, không còn tạo mới được — tạo bảng giá riêng cho toà bạn để ghi đè giá này">Giá mặc định</span>
                  ) : (
                    <div className="flex gap-2">
                      <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Sửa</ManagerSecondaryButton>
                      {item.isActive && (
                        <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDeactivate(item.policyId)}>Tắt</ManagerSecondaryButton>
                      )}
                    </div>
                  )}
                </ManagerCell>
              </ManagerRow>
            ))}
          </ManagerDataTable>
        )}
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
      </ManagerPanel>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Cập nhật bảng giá" : "Thêm bảng giá"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Thiết lập rõ ràng để đặt chỗ và báo cáo luôn nhất quán.</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={handleSubmit}>
              <ManagerField label="Loại xe">
                <ManagerSelect name="vehicleTypeId" value={form.vehicleTypeId} onChange={handleChange}>
                  <option value="">Chọn loại xe</option>
                  {vehicleTypes.map((item) => (
                    <option key={item.id ?? item.vehicleTypeId} value={item.id ?? item.vehicleTypeId}>{item.name}</option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Loại thời gian">
                  <ManagerSelect name="timeType" value={form.timeType} onChange={handleChange}>
                    <option value="HOURLY">Theo giờ</option>
                    <option value="DAILY">Theo ngày</option>
                    <option value="WEEKLY">Theo tuần</option>
                    <option value="MONTHLY">Theo tháng</option>
                  </ManagerSelect>
                </ManagerField>
                <ManagerField label="Loại ngày">
                  <ManagerSelect name="dayType" value={form.dayType} onChange={handleChange}>
                    <option value="WEEKDAY">Ngày thường</option>
                    <option value="WEEKEND">Cuối tuần</option>
                    <option value="HOLIDAY">Ngày lễ</option>
                  </ManagerSelect>
                </ManagerField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Giờ bắt đầu">
                  <ManagerInput type="number" name="startHour" value={form.startHour} onChange={handleChange} placeholder="7" />
                </ManagerField>
                <ManagerField label="Giờ kết thúc">
                  <ManagerInput type="number" name="endHour" value={form.endHour} onChange={handleChange} placeholder="22" />
                </ManagerField>
              </div>
              <ManagerField label="Giá theo giờ">
                <ManagerInput type="number" name="pricePerHour" value={form.pricePerHour} onChange={handleChange} placeholder="20000" />
              </ManagerField>
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-3 text-sm text-foreground">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                Đang áp dụng
              </label>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{editingId ? "Lưu thay đổi" : "Tạo bảng giá"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Hủy</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

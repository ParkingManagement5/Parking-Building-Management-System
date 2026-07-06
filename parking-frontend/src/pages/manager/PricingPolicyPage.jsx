import { useEffect, useMemo, useState } from "react";
import { Banknote, CalendarDays, Car, Clock3, Plus, X } from "lucide-react";
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
  ManagerStatCard,
  ManagerStatsRow,
  ManagerStatusBadge,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";

const TIME_TYPE_LABELS = { HOURLY: "Theo giờ", DAILY: "Theo ngày", MONTHLY: "Theo tháng" };
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
      const [vehicleTypeRes, policyRes] = await Promise.all([
        vehicleTypeApi.getAll(),
        pricingPolicyApi.getAll(),
      ]);
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
      timeType: form.timeType,
      dayType: form.dayType,
      startHour: form.startHour ? Number(form.startHour) : null,
      endHour: form.endHour ? Number(form.endHour) : null,
      pricePerHour: Number(form.pricePerHour),
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await pricingPolicyApi.update(editingId, payload);
        if (payload.isActive) {
          await pricingPolicyApi.activate(editingId);
        }
      } else {
        const res = await pricingPolicyApi.create(payload);
        const created = unwrapApiData(res.data, null);
        const createdId = created?.policyId || created?.id;
        if (payload.isActive && createdId) {
          await pricingPolicyApi.activate(createdId);
        }
      }
      await loadInitialData();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save pricing policy", error);
      alert("Lưu bảng giá thất bại");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.policyId);
    setForm({
      vehicleTypeId: item.vehicleTypeId,
      timeType: item.timeType,
      dayType: item.dayType,
      startHour: item.startHour ?? "",
      endHour: item.endHour ?? "",
      pricePerHour: item.pricePerHour ?? "",
      isActive: item.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa bảng giá này?")) return;
    try {
      await pricingPolicyApi.delete(id);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to delete pricing policy", error);
      alert("Xóa bảng giá thất bại");
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
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={14} /> Thêm bảng giá
          </ManagerPrimaryButton>
        }
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={Banknote} label="Số bảng giá" value={policies.length} hint="Tổng số quy tắc giá đã cấu hình" tone="violet" />
        <ManagerStatCard icon={Car} label="Loại xe được áp dụng" value={new Set(policies.map((item) => item.vehicleTypeId)).size} hint="Loại xe đã có quy tắc giá" tone="blue" />
        <ManagerStatCard icon={Clock3} label="Bảng giá theo giờ" value={policies.filter((item) => item.timeType === "HOURLY").length} hint="Tính phí theo giờ" tone="emerald" />
        <ManagerStatCard icon={CalendarDays} label="Bảng giá đang bật" value={policies.filter((item) => item.isActive).length} hint="Đang được áp dụng" tone="amber" />
      </ManagerStatsRow>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
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
        <span className="ml-auto text-xs text-muted-foreground">{filteredPolicies.length} / {policies.length} chính sách</span>
      </div>

      <ManagerPanel title="Danh sách bảng giá" subtitle={`${filteredPolicies.length} bảng giá`}>
        {filteredPolicies.length === 0 ? (
          <ManagerEmptyState title="Chưa có bảng giá nào" description="Tạo bảng giá để hệ thống tính phí đặt chỗ và thanh toán." />
        ) : (
          <ManagerDataTable columns={["Loại xe", "Loại thời gian", "Loại ngày", "Khung giờ", "Giá", "Trạng thái", "Thao tác"]} minRows={PAGE_SIZE}>
            {pagedPolicies.map((item) => (
              <ManagerRow key={item.policyId}>
                <ManagerCell>{vehicleTypeMap[item.vehicleTypeId] || item.vehicleTypeId}</ManagerCell>
                <ManagerCell><ManagerStatusBadge tone="blue">{TIME_TYPE_LABELS[item.timeType] || item.timeType}</ManagerStatusBadge></ManagerCell>
                <ManagerCell>{DAY_TYPE_LABELS[item.dayType] || item.dayType}</ManagerCell>
                <ManagerCell>{item.startHour ?? "-"} - {item.endHour ?? "-"}</ManagerCell>
                <ManagerCell className="font-medium">{formatCurrency(item.pricePerHour)}</ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={item.isActive ? "emerald" : "amber"}>{item.isActive ? "Đang bật" : "Đã tắt"}</ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>
                  <div className="flex gap-2">
                    <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Sửa</ManagerSecondaryButton>
                    <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.policyId)}>Xóa</ManagerSecondaryButton>
                  </div>
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

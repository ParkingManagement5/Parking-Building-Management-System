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

export default function PricingPolicyPage() {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
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
      alert("Cannot load pricing policies");
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
      alert("Vehicle type and price are required");
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
      alert("Save pricing policy failed");
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
    if (!window.confirm("Are you sure you want to delete this pricing policy?")) return;
    try {
      await pricingPolicyApi.delete(id);
      await loadInitialData();
    } catch (error) {
      console.error("Failed to delete pricing policy", error);
      alert("Delete pricing policy failed");
    }
  };

  const PAGE_SIZE = 10;
  const pagedPolicies = useMemo(() => policies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [policies, page]);
  const totalPages = Math.max(1, Math.ceil(policies.length / PAGE_SIZE));

  const formatCurrency = (value) => `${Number(value || 0).toLocaleString("vi-VN")}d`;

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Pricing Policy Management"
        description="Define rate rules by vehicle type, day type, and hourly windows."
        action={
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={14} /> Add Policy
          </ManagerPrimaryButton>
        }
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={Banknote} label="Pricing Policies" value={policies.length} hint="Total pricing rules configured" tone="violet" />
        <ManagerStatCard icon={Car} label="Covered Vehicle Types" value={new Set(policies.map((item) => item.vehicleTypeId)).size} hint="Vehicle categories with rate rules" tone="blue" />
        <ManagerStatCard icon={Clock3} label="Hourly Policies" value={policies.filter((item) => item.timeType === "HOURLY").length} hint="Policies billed by hour" tone="emerald" />
        <ManagerStatCard icon={CalendarDays} label="Active Policies" value={policies.filter((item) => item.isActive).length} hint="Rules currently available for use" tone="amber" />
      </ManagerStatsRow>

      <ManagerPanel title="Pricing Directory" subtitle={`${policies.length} pricing records available`}>
        {policies.length === 0 ? (
          <ManagerEmptyState title="No pricing policies yet" description="Create a policy to prepare the pricing engine for bookings and payments." />
        ) : (
          <ManagerDataTable columns={["Vehicle Type", "Time Type", "Day Type", "Hour Range", "Price", "Status", "Actions"]}>
            {pagedPolicies.map((item) => (
              <ManagerRow key={item.policyId}>
                <ManagerCell>{vehicleTypeMap[item.vehicleTypeId] || item.vehicleTypeId}</ManagerCell>
                <ManagerCell><ManagerStatusBadge tone="blue">{item.timeType}</ManagerStatusBadge></ManagerCell>
                <ManagerCell>{item.dayType}</ManagerCell>
                <ManagerCell>{item.startHour ?? "-"} - {item.endHour ?? "-"}</ManagerCell>
                <ManagerCell className="font-medium">{formatCurrency(item.pricePerHour)}</ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={item.isActive ? "emerald" : "amber"}>{item.isActive ? "Active" : "Inactive"}</ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>
                  <div className="flex gap-2">
                    <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Edit</ManagerSecondaryButton>
                    <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.policyId)}>Delete</ManagerSecondaryButton>
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
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Update Pricing Policy" : "Add Pricing Policy"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Set billing logic clearly so bookings and reports stay consistent.</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={handleSubmit}>
              <ManagerField label="Vehicle Type">
                <ManagerSelect name="vehicleTypeId" value={form.vehicleTypeId} onChange={handleChange}>
                  <option value="">Select vehicle type</option>
                  {vehicleTypes.map((item) => (
                    <option key={item.id ?? item.vehicleTypeId} value={item.id ?? item.vehicleTypeId}>{item.name}</option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Time Type">
                  <ManagerSelect name="timeType" value={form.timeType} onChange={handleChange}>
                    <option value="HOURLY">HOURLY</option>
                    <option value="DAILY">DAILY</option>
                    <option value="MONTHLY">MONTHLY</option>
                  </ManagerSelect>
                </ManagerField>
                <ManagerField label="Day Type">
                  <ManagerSelect name="dayType" value={form.dayType} onChange={handleChange}>
                    <option value="WEEKDAY">WEEKDAY</option>
                    <option value="WEEKEND">WEEKEND</option>
                    <option value="HOLIDAY">HOLIDAY</option>
                  </ManagerSelect>
                </ManagerField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Start Hour">
                  <ManagerInput type="number" name="startHour" value={form.startHour} onChange={handleChange} placeholder="7" />
                </ManagerField>
                <ManagerField label="End Hour">
                  <ManagerInput type="number" name="endHour" value={form.endHour} onChange={handleChange} placeholder="22" />
                </ManagerField>
              </div>
              <ManagerField label="Price Per Hour">
                <ManagerInput type="number" name="pricePerHour" value={form.pricePerHour} onChange={handleChange} placeholder="20000" />
              </ManagerField>
              <label className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-3 text-sm text-foreground">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                Active policy
              </label>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Create Policy"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Cancel</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

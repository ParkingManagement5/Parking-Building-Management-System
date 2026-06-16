import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Building2, DoorOpen, Plus, ShieldCheck, X } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { gateApi } from "../../api/manager/gateApi";
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

function normalizeGate(item) {
  return {
    id: item.gateId ?? item.id,
    buildingId: item.building?.buildingId ?? item.building?.id,
    buildingName: item.building?.name || "Unknown building",
    gateCode: item.gateCode,
    gateType: item.gateType,
    isActive: item.isActive !== false,
  };
}

export default function GatePage() {
  const [buildings, setBuildings] = useState([]);
  const [gates, setGates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    buildingId: "",
    gateCode: "",
    gateType: "ENTRY",
  });

  const refreshGates = useCallback(async (buildingList) => {
    try {
      const responses = await Promise.all(
        buildingList.map((building) => gateApi.getByBuilding(building.buildingId ?? building.id))
      );
      setGates(responses.flatMap((res) => (res.data?.data || []).map(normalizeGate)));
    } catch (error) {
      console.error("Failed to fetch gates", error);
      alert("Cannot load gates");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const buildingRes = await buildingApi.getAll();
        const buildingList = buildingRes.data?.data || [];
        if (cancelled) {
          return;
        }
        setBuildings(buildingList);
        await refreshGates(buildingList);
      } catch (error) {
        console.error("Failed to load gate dependencies", error);
        alert("Cannot load buildings");
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [refreshGates]);

  const stats = useMemo(
    () => ({
      entry: gates.filter((item) => item.gateType === "ENTRY").length,
      exit: gates.filter((item) => item.gateType === "EXIT").length,
      both: gates.filter((item) => item.gateType === "BOTH").length,
    }),
    [gates]
  );

  const gateTone = (type) => (type === "ENTRY" ? "emerald" : type === "EXIT" ? "amber" : "blue");

  const resetForm = () => {
    setEditingId(null);
    setForm({ buildingId: "", gateCode: "", gateType: "ENTRY" });
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
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.buildingId || !form.gateCode.trim()) {
      alert("Building and gate code are required");
      return;
    }
    const payload = {
      buildingId: Number(form.buildingId),
      gateCode: form.gateCode.trim(),
      gateType: form.gateType,
    };
    try {
      if (editingId) {
        await gateApi.update(editingId, payload);
      } else {
        await gateApi.create(payload);
      }
      await refreshGates(buildings);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save gate", error);
      alert(error.response?.data?.message || "Save gate failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      buildingId: item.buildingId || "",
      gateCode: item.gateCode || "",
      gateType: item.gateType || "ENTRY",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this gate?")) return;
    try {
      await gateApi.delete(id);
      await refreshGates(buildings);
    } catch (error) {
      console.error("Failed to delete gate", error);
      alert(error.response?.data?.message || "Delete gate failed");
    }
  };

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Gate Management"
        description="Control entry and exit points across buildings and keep access labels consistent."
        action={
          <ManagerPrimaryButton type="button" onClick={openCreateModal} className="flex items-center gap-2">
            <Plus size={14} /> Add Gate
          </ManagerPrimaryButton>
        }
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={DoorOpen} label="Total Gates" value={gates.length} hint="Gate records across all buildings" tone="violet" />
        <ManagerStatCard icon={ShieldCheck} label="Entry Gates" value={stats.entry} hint="Dedicated inbound access points" tone="emerald" />
        <ManagerStatCard icon={ArrowLeftRight} label="Exit Gates" value={stats.exit} hint="Dedicated outbound access points" tone="amber" />
        <ManagerStatCard icon={Building2} label="Dual Use Gates" value={stats.both} hint="Gates configured for both directions" tone="blue" />
      </ManagerStatsRow>

      <ManagerPanel title="Gate Directory" subtitle={`${gates.length} gate records available`}>
        {gates.length === 0 ? (
          <ManagerEmptyState title="No gates yet" description="Create building gates to support staff entry and exit workflows." />
        ) : (
          <ManagerDataTable columns={["Building", "Gate Code", "Gate Type", "Status", "Actions"]}>
            {gates.map((item) => (
              <ManagerRow key={item.id}>
                <ManagerCell>{item.buildingName}</ManagerCell>
                <ManagerCell className="font-medium">{item.gateCode}</ManagerCell>
                <ManagerCell><ManagerStatusBadge tone={gateTone(item.gateType)}>{item.gateType}</ManagerStatusBadge></ManagerCell>
                <ManagerCell>
                  <ManagerStatusBadge tone={item.isActive ? "emerald" : "amber"}>
                    {item.isActive ? "Active" : "Inactive"}
                  </ManagerStatusBadge>
                </ManagerCell>
                <ManagerCell>
                  <div className="flex gap-2">
                    <ManagerSecondaryButton type="button" onClick={() => handleEdit(item)}>Edit</ManagerSecondaryButton>
                    <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(item.id)}>Delete</ManagerSecondaryButton>
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
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Update Gate" : "Add Gate"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Attach each gate to the correct building and access type.</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={handleSubmit}>
              <ManagerField label="Building">
                <ManagerSelect name="buildingId" value={form.buildingId} onChange={handleChange}>
                  <option value="">Select building</option>
                  {buildings.map((item) => (
                    <option key={item.buildingId ?? item.id} value={item.buildingId ?? item.id}>{item.name}</option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <ManagerField label="Gate Code">
                <ManagerInput name="gateCode" value={form.gateCode} onChange={handleChange} placeholder="GATE-IN-01" />
              </ManagerField>
              <ManagerField label="Gate Type">
                <ManagerSelect name="gateType" value={form.gateType} onChange={handleChange}>
                  <option value="ENTRY">ENTRY</option>
                  <option value="EXIT">EXIT</option>
                  <option value="BOTH">BOTH</option>
                </ManagerSelect>
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Create Gate"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Cancel</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

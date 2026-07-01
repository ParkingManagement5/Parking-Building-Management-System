import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Layers, Plus, Rows3, Search, ShieldCheck, X } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
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

function normalizeFloor(item) {
  return {
    id: item.floorId ?? item.id,
    buildingId: item.building?.buildingId ?? item.building?.id,
    buildingName: item.building?.name || "Unknown building",
    floorNumber: item.floorNumber,
    floorName: item.name,
    capacity: item.capacity ?? 0,
    isActive: item.isActive !== false,
  };
}

export default function FloorPage() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [collapsedBuildings, setCollapsedBuildings] = useState({});
  const [filterSearch, setFilterSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    buildingId: "",
    floorNumber: "",
    floorName: "",
    capacity: "",
  });

  const refreshFloors = useCallback(async () => {
    try {
      const res = await floorApi.getAll();
      setFloors(unwrapApiData(res.data, []).map(normalizeFloor));
    } catch (error) {
      console.error("Failed to fetch floors", error);
      alert("Cannot load floors");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [buildingRes, floorRes] = await Promise.all([
          buildingApi.getAll(),
          floorApi.getAll(),
        ]);
        if (cancelled) return;
        setBuildings(unwrapApiData(buildingRes.data, []));
        setFloors(unwrapApiData(floorRes.data, []).map(normalizeFloor));
      } catch (error) {
        console.error("Failed to load buildings", error);
        alert("Cannot load buildings");
      }
    }

    void loadInitialData();
    return () => { cancelled = true; };
  }, []);

  // Apply filters then group by building
  const filteredFloors = useMemo(() => {
    const q = filterSearch.toLowerCase();
    return floors.filter((f) => {
      if (q && !f.floorName.toLowerCase().includes(q) && !String(f.floorNumber).includes(q)) return false;
      if (filterBuilding && String(f.buildingId) !== String(filterBuilding)) return false;
      if (filterStatus === "active" && !f.isActive) return false;
      if (filterStatus === "inactive" && f.isActive) return false;
      return true;
    });
  }, [floors, filterSearch, filterBuilding, filterStatus]);

  const floorsByBuilding = useMemo(() => {
    const map = {};
    filteredFloors.forEach((floor) => {
      const bid = String(floor.buildingId);
      if (!map[bid]) map[bid] = { buildingName: floor.buildingName, floors: [] };
      map[bid].floors.push(floor);
    });
    Object.values(map).forEach((group) => {
      group.floors.sort((a, b) => (a.floorNumber ?? 0) - (b.floorNumber ?? 0));
    });
    return map;
  }, [filteredFloors]);

  const stats = useMemo(() => {
    const active = floors.filter((item) => item.isActive).length;
    const capacity = floors.reduce((sum, item) => sum + Number(item.capacity || 0), 0);
    return { active, capacity };
  }, [floors]);

  const toggleBuilding = (bid) => {
    setCollapsedBuildings((prev) => ({ ...prev, [bid]: !prev[bid] }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ buildingId: "", floorNumber: "", floorName: "", capacity: "" });
  };

  const openCreateModal = (buildingId = "") => {
    resetForm();
    setForm({ buildingId, floorNumber: "", floorName: "", capacity: "" });
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
    if (!form.buildingId || !form.floorNumber || !form.floorName.trim()) {
      alert("Building, floor number and floor name are required");
      return;
    }

    const payload = {
      buildingId: Number(form.buildingId),
      floorNumber: Number(form.floorNumber),
      name: form.floorName.trim(),
      capacity: form.capacity ? Number(form.capacity) : 0,
    };

    try {
      if (editingId) {
        await floorApi.update(editingId, payload);
      } else {
        await floorApi.create(payload);
      }
      await refreshFloors();
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save floor", error);
      alert(error.response?.data?.message || "Save floor failed");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      buildingId: item.buildingId || "",
      floorNumber: item.floorNumber ?? "",
      floorName: item.floorName || "",
      capacity: item.capacity ?? "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this floor?")) return;
    try {
      await floorApi.delete(id);
      await refreshFloors();
    } catch (error) {
      console.error("Failed to delete floor", error);
      alert(error.response?.data?.message || "Delete floor failed");
    }
  };

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Floor Management"
        description="Configure floor structure under each building and keep capacity planning visible."
        action={
          <ManagerPrimaryButton type="button" onClick={() => openCreateModal()} className="flex items-center gap-2">
            <Plus size={14} /> Add Floor
          </ManagerPrimaryButton>
        }
      />
      <ManagerStatsRow>
        <ManagerStatCard icon={Layers} label="Total Floors" value={floors.length} hint="Configured across all buildings" tone="violet" />
        <ManagerStatCard icon={Building2} label="Buildings Covered" value={Object.keys(floorsByBuilding).length} hint="Buildings with at least one floor" tone="blue" />
        <ManagerStatCard icon={ShieldCheck} label="Active Floors" value={stats.active} hint="Ready for zone assignment" tone="emerald" />
        <ManagerStatCard icon={Rows3} label="Combined Capacity" value={stats.capacity} hint="Reported floor capacity total" tone="amber" />
      </ManagerStatsRow>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Tìm tên tầng..."
            className="w-full rounded-xl border border-border bg-muted py-2 pl-8 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterBuilding}
          onChange={(e) => setFilterBuilding(e.target.value)}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
        >
          <option value="">Tất cả tòa nhà</option>
          {buildings.map((b) => (
            <option key={b.buildingId ?? b.id} value={b.buildingId ?? b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {(filterSearch || filterBuilding || filterStatus !== "all") && (
          <button
            onClick={() => { setFilterSearch(""); setFilterBuilding(""); setFilterStatus("all"); }}
            className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={12} /> Xóa lọc
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filteredFloors.length} / {floors.length} tầng</span>
      </div>

      {/* Grouped by building */}
      <div className="space-y-3">
        {Object.entries(floorsByBuilding).length === 0 ? (
          <ManagerPanel title="Floor Directory" subtitle="0 floor records available">
            <ManagerEmptyState title="No floors yet" description="Create a floor after adding buildings to organize parking zones properly." />
          </ManagerPanel>
        ) : (
          Object.entries(floorsByBuilding).map(([bid, group]) => {
            const isCollapsed = collapsedBuildings[bid];
            return (
              <div key={bid} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Building header */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors border-b border-border"
                  onClick={() => toggleBuilding(bid)}
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronRight size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                    <Building2 size={15} className="text-primary" />
                    <span className="text-sm font-semibold text-foreground">{group.buildingName}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {group.floors.length} tầng
                    </span>
                  </div>
                  <ManagerPrimaryButton
                    type="button"
                    className="flex items-center gap-1.5 !py-1.5 !px-3 !text-xs"
                    onClick={(e) => { e.stopPropagation(); openCreateModal(bid); }}
                  >
                    <Plus size={12} /> Thêm tầng
                  </ManagerPrimaryButton>
                </div>

                {/* Floors table */}
                {!isCollapsed && (
                  <div className="px-0">
                    <ManagerDataTable columns={["Floor #", "Tên tầng", "Sức chứa", "Trạng thái", "Hành động"]}>
                      {group.floors.map((item) => (
                        <ManagerRow key={item.id}>
                          <ManagerCell className="font-bold text-primary">{item.floorNumber}</ManagerCell>
                          <ManagerCell className="font-medium">{item.floorName}</ManagerCell>
                          <ManagerCell>{item.capacity}</ManagerCell>
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
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{editingId ? "Update Floor" : "Add Floor"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Attach each floor to the right building and capacity band.</p>
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
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Floor Number">
                  <ManagerInput type="number" name="floorNumber" value={form.floorNumber} onChange={handleChange} placeholder="1" />
                </ManagerField>
                <ManagerField label="Capacity">
                  <ManagerInput type="number" name="capacity" value={form.capacity} onChange={handleChange} placeholder="50" />
                </ManagerField>
              </div>
              <ManagerField label="Floor Name">
                <ManagerInput name="floorName" value={form.floorName} onChange={handleChange} placeholder="Ground Floor" />
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{editingId ? "Save Changes" : "Create Floor"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={handleCloseModal}>Cancel</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      ) : null}
    </div>
  );
}

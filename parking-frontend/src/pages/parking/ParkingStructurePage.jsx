import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight, Edit2, Plus,
  Search, Trash2, X,
} from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { floorApi } from "../../api/manager/floorApi";
import { zoneApi } from "../../api/manager/zoneApi";
import { parkingSlotApi } from "../../api/manager/parkingSlotApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { gateApi } from "../../api/manager/gateApi";
import {
  ManagerCell, ManagerDataTable, ManagerEmptyState, ManagerField, ManagerForm, ManagerInput,
  ManagerPageHeader, ManagerPrimaryButton, ManagerRow, ManagerSecondaryButton,
  ManagerSelect, ManagerStatBar,
} from "../../ui/components/manager/ManagerUi";
import { unwrapApiData } from "../../utils/api";
import { getAssignedBuildingId, getRole } from "../../utils/auth";

function getBuildingId(item) { return item?.buildingId ?? item?.id; }
function getFloorId(item) { return item?.floorId ?? item?.id; }
function getZoneId(item) { return item?.zoneId ?? item?.id; }
function normalizeTime(value) { return value?.slice(0, 5) || ""; }

const FLOOR_ORDER = ["B3", "B2", "B1", "G", "1F", "2F", "3F", "4F", "5F"];

function mapFloorLabel(floor) {
  const floorNumber = Number(floor.floorNumber);
  if (Number.isNaN(floorNumber)) return floor.name || `Tầng ${getFloorId(floor)}`;
  if (floorNumber < 0) return `B${Math.abs(floorNumber)}`;
  if (floorNumber === 0) return "G";
  return `${floorNumber}F`;
}

function statusColor(status) {
  if (status === "AVAILABLE") return "bg-emerald-400/90 hover:bg-emerald-500";
  if (status === "OCCUPIED") return "bg-rose-400/90";
  if (status === "RESERVED") return "bg-amber-400/90";
  return "bg-slate-400/90";
}

const TONE_TEXT = {
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  rose: "text-rose-600 dark:text-rose-300",
  blue: "text-blue-600 dark:text-blue-300",
  violet: "text-violet-600 dark:text-violet-300",
  slate: "text-muted-foreground",
};
function toneText(tone) { return TONE_TEXT[tone] || TONE_TEXT.slate; }

const SLOT_STATUS_LABELS = { AVAILABLE: "Còn trống", OCCUPIED: "Đang có xe", RESERVED: "Đã đặt trước", MAINTENANCE: "Bảo trì" };
const GATE_TYPE_LABELS = { ENTRY: "Cổng vào", EXIT: "Cổng ra", BOTH: "Cả hai" };
const SLOT_SIZE_LABELS = { SMALL: "Nhỏ", MEDIUM: "Vừa", LARGE: "Lớn" };

const SLOT_PAGE_SIZE = 10;

export default function ParkingStructurePage() {
  const isManager = getRole() === "MANAGER";
  const assignedBuildingId = getAssignedBuildingId();
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [zones, setZones] = useState([]);
  const [slots, setSlots] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [gates, setGates] = useState([]);

  // Drill-down selection — day la phan thay the cho 4 route rieng biet truoc day
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [slotPage, setSlotPage] = useState(1);
  const [filterSlotSearch, setFilterSlotSearch] = useState("");
  const [filterSlotStatus, setFilterSlotStatus] = useState("all");
  const slotListRef = useRef(null);

  // Modals: 1 bo state rieng cho tung cap, nhung field cha luon duoc dien san
  // theo ngu canh dang xem thay vi de trong nhu 4 trang cu.
  const [buildingModal, setBuildingModal] = useState(null); // { editingId, form } | null
  const [floorModal, setFloorModal] = useState(null);
  const [zoneModal, setZoneModal] = useState(null);
  const [slotModal, setSlotModal] = useState(null);
  const [gateModal, setGateModal] = useState(null);

  useEffect(() => {
    void loadAll();
  }, []);

  // Manager chỉ quản lý đúng 1 toà — tự động vào thẳng thay vì bắt chọn giữa
  // danh sách chỉ có 1 item.
  useEffect(() => {
    if (isManager && assignedBuildingId && !selectedBuildingId && buildings.length > 0) {
      selectBuilding(assignedBuildingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, assignedBuildingId, buildings]);

  async function loadAll() {
    try {
      const [buildingRes, floorRes, zoneRes, slotRes, vehicleTypeRes, gateRes] = await Promise.all([
        buildingApi.getAll(),
        floorApi.getAll(),
        zoneApi.getAll(),
        parkingSlotApi.getAll(),
        vehicleTypeApi.getAll(),
        gateApi.getAll(),
      ]);
      setBuildings(unwrapApiData(buildingRes.data, []));
      setFloors(unwrapApiData(floorRes.data, []));
      setZones(unwrapApiData(zoneRes.data, []));
      setSlots(unwrapApiData(slotRes.data, []));
      setVehicleTypes(unwrapApiData(vehicleTypeRes.data, []));
      setGates(unwrapApiData(gateRes.data, []));
    } catch (error) {
      console.error("Failed to load parking structure data", error);
      alert("Không tải được dữ liệu cấu trúc bãi xe");
    }
  }

  // ── Derived: building summaries (tinh tai cho, khong goi API rieng cho tung building) ──
  const buildingSummaries = useMemo(() => {
    const scoped = isManager
      ? buildings.filter((b) => String(getBuildingId(b)) === String(assignedBuildingId))
      : buildings;
    return scoped.map((b) => {
      const bid = getBuildingId(b);
      const bFloorIds = floors
        .filter((f) => String(f.building?.buildingId ?? f.building?.id) === String(bid))
        .map(getFloorId);
      const bZoneIds = zones
        .filter((z) => bFloorIds.some((fid) => String(fid) === String(z.floor?.floorId ?? z.floor?.id)))
        .map(getZoneId);
      const bSlots = slots.filter((s) => bZoneIds.some((zid) => String(zid) === String(s.zone?.zoneId ?? s.zone?.id)));
      const available = bSlots.filter((s) => String(s.status || "").toUpperCase() === "AVAILABLE").length;
      const totalSlots = bSlots.length;
      const occupancy = totalSlots ? Math.round(((totalSlots - available) / totalSlots) * 100) : 0;
      return {
        ...b,
        id: bid,
        floorsCount: bFloorIds.length,
        totalSlots,
        available,
        occupancy,
      };
    });
  }, [buildings, floors, zones, slots]);

  const selectedBuilding = buildingSummaries.find((b) => String(b.id) === String(selectedBuildingId));

  const buildingFloors = useMemo(() => {
    const items = floors
      .filter((f) => String(f.building?.buildingId ?? f.building?.id) === String(selectedBuildingId))
      .map((f) => ({ ...f, id: getFloorId(f), label: mapFloorLabel(f) }));
    return items.sort((a, b) => {
      const aIndex = FLOOR_ORDER.indexOf(a.label);
      const bIndex = FLOOR_ORDER.indexOf(b.label);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return String(a.label).localeCompare(String(b.label));
    });
  }, [floors, selectedBuildingId]);

  const resolvedFloorId = useMemo(() => {
    if (!buildingFloors.length) return "";
    if (buildingFloors.some((f) => String(f.id) === String(selectedFloorId))) return String(selectedFloorId);
    return String(buildingFloors[0].id);
  }, [buildingFloors, selectedFloorId]);

  const selectedFloor = buildingFloors.find((f) => String(f.id) === String(resolvedFloorId));

  const buildingGates = useMemo(
    () => gates
      .filter((g) => String(g.building?.buildingId ?? g.building?.id) === String(selectedBuildingId))
      .map((g) => ({ ...g, id: g.gateId ?? g.id }))
      .sort((a, b) => (a.gateCode || "").localeCompare(b.gateCode || "")),
    [gates, selectedBuildingId]
  );

  const floorZones = useMemo(
    () => zones
      .filter((z) => String(z.floor?.floorId ?? z.floor?.id) === String(resolvedFloorId))
      .map((z) => ({ ...z, id: getZoneId(z) }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [zones, resolvedFloorId]
  );

  const selectedZone = floorZones.find((z) => String(z.id) === String(selectedZoneId));

  const zoneSlots = useMemo(() => {
    const q = filterSlotSearch.toLowerCase();
    return slots
      .filter((s) => String(s.zone?.zoneId ?? s.zone?.id) === String(selectedZoneId))
      .filter((s) => {
        if (filterSlotStatus !== "all" && String(s.status || "").toLowerCase() !== filterSlotStatus) return false;
        if (q && !String(s.slotCode || "").toLowerCase().includes(q)) return false;
        return true;
      })
      .map((s) => ({ ...s, id: s.slotId ?? s.id }))
      .sort((a, b) => (a.slotCode || "").localeCompare(b.slotCode || ""));
  }, [slots, selectedZoneId, filterSlotSearch, filterSlotStatus]);

  const zoneSlotCounts = useMemo(() => {
    const all = slots.filter((s) => String(s.zone?.zoneId ?? s.zone?.id) === String(selectedZoneId));
    return {
      available: all.filter((s) => String(s.status || "").toUpperCase() === "AVAILABLE").length,
      occupied: all.filter((s) => String(s.status || "").toUpperCase() === "OCCUPIED").length,
      reserved: all.filter((s) => String(s.status || "").toUpperCase() === "RESERVED").length,
      total: all.length,
    };
  }, [slots, selectedZoneId]);

  const pagedZoneSlots = useMemo(
    () => zoneSlots.slice((slotPage - 1) * SLOT_PAGE_SIZE, slotPage * SLOT_PAGE_SIZE),
    [zoneSlots, slotPage]
  );
  const totalSlotPages = Math.max(1, Math.ceil(zoneSlots.length / SLOT_PAGE_SIZE));

  function handleSlotPage(page) {
    setSlotPage(page);
    slotListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Navigation ──
  function selectBuilding(id) {
    setSelectedBuildingId(String(id));
    setSelectedFloorId("");
    setSelectedZoneId("");
  }
  function backToBuildings() {
    setSelectedBuildingId("");
    setSelectedFloorId("");
    setSelectedZoneId("");
  }
  function selectFloor(id) {
    setSelectedFloorId(String(id));
    setSelectedZoneId("");
  }
  function backToFloor() {
    setSelectedZoneId("");
  }
  function selectZone(id) {
    setSelectedZoneId(String(id));
    setSlotPage(1);
  }

  // ── Building CRUD ──
  function openBuildingModal(item = null) {
    setBuildingModal({
      editingId: item?.id ?? null,
      form: {
        name: item?.name || "",
        address: item?.address || "",
        phone: item?.phone || "",
        email: item?.email || "",
        description: item?.description || "",
        openTime: normalizeTime(item?.openTime) || "06:00",
        closeTime: normalizeTime(item?.closeTime) || "22:00",
        latitude: item?.latitude != null ? String(item.latitude) : "",
        longitude: item?.longitude != null ? String(item.longitude) : "",
      },
    });
  }

  async function submitBuildingModal(event) {
    event.preventDefault();
    const { editingId, form } = buildingModal;
    if (!form.name.trim() || !form.address.trim()) {
      alert("Tên tòa nhà và địa chỉ là bắt buộc");
      return;
    }
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone || null,
      email: form.email || null,
      description: form.description || null,
      openTime: `${form.openTime}:00`,
      closeTime: `${form.closeTime}:00`,
      latitude: form.latitude !== "" ? parseFloat(form.latitude) : null,
      longitude: form.longitude !== "" ? parseFloat(form.longitude) : null,
    };
    try {
      if (editingId) await buildingApi.update(editingId, payload);
      else await buildingApi.create(payload);
      setBuildingModal(null);
      await loadAll();
    } catch (error) {
      console.error("Failed to save building", error);
      alert(error.response?.data?.message || "Lưu tòa nhà thất bại");
    }
  }

  async function deleteBuilding(id) {
    if (!window.confirm("Xóa tòa nhà này?")) return;
    try {
      await buildingApi.delete(id);
      if (String(selectedBuildingId) === String(id)) backToBuildings();
      await loadAll();
    } catch (error) {
      console.error("Failed to delete building", error);
      alert(error.response?.data?.message || "Xóa tòa nhà thất bại");
    }
  }

  // ── Floor CRUD ──
  function openFloorModal(item = null) {
    setFloorModal({
      editingId: item?.id ?? null,
      form: {
        floorNumber: item?.floorNumber ?? "",
        floorName: item?.name || "",
        capacity: item?.capacity ?? "",
      },
    });
  }

  async function submitFloorModal(event) {
    event.preventDefault();
    const { editingId, form } = floorModal;
    if (!form.floorNumber || !form.floorName.trim()) {
      alert("Số tầng và tên tầng là bắt buộc");
      return;
    }
    const payload = {
      buildingId: Number(selectedBuildingId),
      floorNumber: Number(form.floorNumber),
      name: form.floorName.trim(),
      capacity: form.capacity ? Number(form.capacity) : 0,
    };
    try {
      if (editingId) await floorApi.update(editingId, payload);
      else await floorApi.create(payload);
      setFloorModal(null);
      await loadAll();
    } catch (error) {
      console.error("Failed to save floor", error);
      alert(error.response?.data?.message || "Lưu tầng thất bại");
    }
  }

  async function deleteFloor(id) {
    if (!window.confirm("Xóa tầng này?")) return;
    try {
      await floorApi.delete(id);
      if (String(resolvedFloorId) === String(id)) setSelectedFloorId("");
      await loadAll();
    } catch (error) {
      console.error("Failed to delete floor", error);
      alert(error.response?.data?.message || "Xóa tầng thất bại");
    }
  }

  // ── Gate CRUD ──
  function openGateModal(item = null) {
    setGateModal({
      editingId: item?.id ?? null,
      form: {
        gateCode: item?.gateCode || "",
        gateType: item?.gateType || "ENTRY",
      },
    });
  }

  async function submitGateModal(event) {
    event.preventDefault();
    const { editingId, form } = gateModal;
    if (!form.gateCode.trim()) {
      alert("Mã cổng là bắt buộc");
      return;
    }
    const payload = {
      buildingId: Number(selectedBuildingId),
      gateCode: form.gateCode.trim(),
      gateType: form.gateType,
    };
    try {
      if (editingId) await gateApi.update(editingId, payload);
      else await gateApi.create(payload);
      setGateModal(null);
      await loadAll();
    } catch (error) {
      console.error("Failed to save gate", error);
      alert(error.response?.data?.message || "Lưu cổng thất bại");
    }
  }

  async function deleteGate(id) {
    if (!window.confirm("Xóa cổng này?")) return;
    try {
      await gateApi.delete(id);
      await loadAll();
    } catch (error) {
      console.error("Failed to delete gate", error);
      alert(error.response?.data?.message || "Xóa cổng thất bại");
    }
  }

  // ── Zone CRUD ──
  function openZoneModal(item = null) {
    setZoneModal({
      editingId: item?.id ?? null,
      form: {
        vehicleTypeId: item?.vehicleType?.vehicleTypeId ?? item?.vehicleType?.id ?? "",
        zoneName: item?.name || "",
        description: item?.description || "",
      },
    });
  }

  async function submitZoneModal(event) {
    event.preventDefault();
    const { editingId, form } = zoneModal;
    if (!form.vehicleTypeId || !form.zoneName.trim()) {
      alert("Loại xe và tên zone là bắt buộc");
      return;
    }
    const payload = {
      floorId: Number(resolvedFloorId),
      vehicleTypeId: Number(form.vehicleTypeId),
      name: form.zoneName.trim(),
      description: form.description || null,
    };
    try {
      if (editingId) await zoneApi.update(editingId, payload);
      else await zoneApi.create(payload);
      setZoneModal(null);
      await loadAll();
    } catch (error) {
      console.error("Failed to save zone", error);
      alert(error.response?.data?.message || "Lưu zone thất bại");
    }
  }

  async function deleteZone(id) {
    if (!window.confirm("Xóa zone này?")) return;
    try {
      await zoneApi.delete(id);
      if (String(selectedZoneId) === String(id)) setSelectedZoneId("");
      await loadAll();
    } catch (error) {
      console.error("Failed to delete zone", error);
      alert(error.response?.data?.message || "Xóa zone thất bại");
    }
  }

  // ── Slot CRUD ──
  function openSlotModal(item = null) {
    setSlotModal({
      editingId: item?.id ?? null,
      form: {
        slotCode: item?.slotCode || "",
        status: item?.status || "AVAILABLE",
      },
    });
  }

  async function submitSlotModal(event) {
    event.preventDefault();
    const { editingId, form } = slotModal;
    if (!form.slotCode.trim()) {
      alert("Mã slot là bắt buộc");
      return;
    }
    const slotSize = selectedZone?.vehicleType?.slotSize;
    if (!slotSize) {
      alert("Không xác định được kích cỡ slot từ zone đang chọn");
      return;
    }
    const payload = {
      zoneId: Number(selectedZoneId),
      slotCode: form.slotCode.trim(),
      slotSize,
      status: form.status,
    };
    try {
      if (editingId) await parkingSlotApi.update(editingId, payload);
      else await parkingSlotApi.create(payload);
      setSlotModal(null);
      await loadAll();
    } catch (error) {
      console.error("Failed to save slot", error);
      alert(error.response?.data?.message || "Lưu slot thất bại");
    }
  }

  async function deleteSlot(id) {
    if (!window.confirm("Xóa slot này?")) return;
    try {
      await parkingSlotApi.delete(id);
      await loadAll();
    } catch (error) {
      console.error("Failed to delete slot", error);
      alert(error.response?.data?.message || "Xóa slot thất bại");
    }
  }

  return (
    <div className="space-y-5">
      <ManagerPageHeader
        title="Cấu trúc bãi xe"
        description="Quản lý Tòa nhà → Tầng → Zone → Slot và Cổng ra vào trong một nơi duy nhất"
        action={
          !selectedBuildingId && !isManager ? (
            <ManagerPrimaryButton type="button" onClick={() => openBuildingModal()} className="flex items-center gap-2">
              <Plus size={14} /> Thêm tòa nhà
            </ManagerPrimaryButton>
          ) : null
        }
      />

      {/* Breadcrumb */}
      {selectedBuildingId && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <button type="button" onClick={backToBuildings} className="text-muted-foreground hover:text-foreground transition-colors">
            Tất cả tòa nhà
          </button>
          <ChevronRight size={14} className="text-muted-foreground" />
          <button
            type="button"
            onClick={backToFloor}
            className={selectedZoneId ? "text-muted-foreground hover:text-foreground transition-colors" : "font-semibold text-foreground"}
          >
            {selectedBuilding?.name}
            {selectedFloor ? ` — ${selectedFloor.label}` : ""}
          </button>
          {selectedZone && (
            <>
              <ChevronRight size={14} className="text-muted-foreground" />
              <span className="font-semibold text-foreground">{selectedZone.name}</span>
            </>
          )}
        </div>
      )}

      {/* ══════════ CẤP 0 — DANH SÁCH TÒA NHÀ ══════════ */}
      {!selectedBuildingId ? (
        buildingSummaries.length === 0 ? (
          <ManagerEmptyState title="Chưa có tòa nhà" description="Thêm tòa nhà đầu tiên để bắt đầu cấu hình bãi xe." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {buildingSummaries.map((item) => (
              <div key={item.id} className="rounded-3xl border border-border bg-card p-5 transition-all hover:shadow-md">
                <div
                  className="cursor-pointer"
                  onClick={() => selectBuilding(item.id)}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                    <span className={`shrink-0 text-xs font-semibold ${item.occupancy >= 85 ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"}`}>
                      {item.occupancy >= 85 ? "Gần đầy" : "Bình thường"}
                    </span>
                  </div>
                  <p className="mb-4 text-sm text-muted-foreground">{item.address}</p>
                  <div className="mb-4 flex items-center gap-5 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tầng </span>
                      <span className="font-semibold text-foreground">{item.floorsCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tổng slot </span>
                      <span className="font-semibold text-foreground">{item.totalSlots}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Còn trống </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-300">{item.available}</span>
                    </div>
                  </div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Tỷ lệ lấp đầy</span>
                    <span>{item.occupancy}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.occupancy}%` }} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openBuildingModal(item)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Edit2 size={13} /> Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBuilding(item.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <Trash2 size={13} /> Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <ManagerStatBar
            items={[
              { label: "Số tầng", value: buildingFloors.length, hint: "Của tòa nhà này", tone: "violet" },
              { label: "Số zone", value: floorZones.length, hint: selectedFloor ? selectedFloor.label : "—", tone: "blue" },
              { label: "Slot còn trống", value: selectedBuilding?.available ?? 0, hint: "Toàn bộ tòa nhà", tone: "emerald" },
              { label: "Tổng slot", value: selectedBuilding?.totalSlots ?? 0, hint: "Toàn bộ tòa nhà", tone: "amber" },
            ]}
          />

          {/* ══════════ TẦNG / CỔNG / ZONE / SLOT — gộp 1 khối ══════════ */}
          <div className="rounded-3xl border border-border bg-card">
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Tầng</h3>
              <ManagerSecondaryButton type="button" className="flex items-center gap-1.5 !py-1.5 !px-3 !text-xs" onClick={() => openFloorModal()}>
                <Plus size={12} /> Thêm tầng
              </ManagerSecondaryButton>
            </div>
            {buildingFloors.length === 0 ? (
              <ManagerEmptyState title="Chưa có tầng" description="Thêm tầng đầu tiên cho tòa nhà này." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {buildingFloors.map((floor) => {
                  const isActive = String(resolvedFloorId) === String(floor.id);
                  return (
                    <div
                      key={floor.id}
                      className={`flex items-center gap-1.5 rounded-xl border px-1.5 py-1 transition-all ${
                        isActive ? "border-primary bg-primary/5" : "border-border bg-muted/30"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectFloor(floor.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {floor.label} — {floor.name}
                      </button>
                      {isActive && (
                        <>
                          <button type="button" onClick={() => openFloorModal(floor)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Edit2 size={12} />
                          </button>
                          <button type="button" onClick={() => deleteFloor(floor.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══════════ CỔNG (thuộc building, ngang cap voi Tang) ══════════ */}
          <div className="border-t border-border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Cổng ra vào</h3>
              <ManagerSecondaryButton type="button" className="flex items-center gap-1.5 !py-1.5 !px-3 !text-xs" onClick={() => openGateModal()}>
                <Plus size={12} /> Thêm cổng
              </ManagerSecondaryButton>
            </div>
            {buildingGates.length === 0 ? (
              <ManagerEmptyState title="Chưa có cổng" description="Thêm cổng vào/ra cho tòa nhà này." />
            ) : (
              <ManagerDataTable columns={["Cổng", "Loại", "Trạng thái", "Thao tác"]}>
                {buildingGates.map((gate) => (
                  <ManagerRow key={gate.id}>
                    <ManagerCell className="font-medium">{gate.gateCode}</ManagerCell>
                    <ManagerCell>
                      <span className={`font-medium ${toneText(gate.gateType === "ENTRY" ? "emerald" : gate.gateType === "EXIT" ? "amber" : "blue")}`}>
                        {GATE_TYPE_LABELS[gate.gateType] || gate.gateType}
                      </span>
                    </ManagerCell>
                    <ManagerCell>
                      <span className={toneText(gate.isActive !== false ? "emerald" : "slate")}>
                        {gate.isActive !== false ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </ManagerCell>
                    <ManagerCell>
                      <div className="flex gap-2">
                        <ManagerSecondaryButton type="button" onClick={() => openGateModal(gate)}>Sửa</ManagerSecondaryButton>
                        <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => deleteGate(gate.id)}>Xóa</ManagerSecondaryButton>
                      </div>
                    </ManagerCell>
                  </ManagerRow>
                ))}
              </ManagerDataTable>
            )}
          </div>

          {/* ══════════ CẤP 2 — ZONE ══════════ */}
          {resolvedFloorId && (
            <div className="border-t border-border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Zone — {selectedFloor?.label} {selectedFloor?.name}</h3>
                <ManagerSecondaryButton type="button" className="flex items-center gap-1.5 !py-1.5 !px-3 !text-xs" onClick={() => openZoneModal()}>
                  <Plus size={12} /> Thêm zone
                </ManagerSecondaryButton>
              </div>
              {floorZones.length === 0 ? (
                <ManagerEmptyState title="Chưa có zone" description="Thêm zone để bắt đầu khai báo slot cho tầng này." />
              ) : (
                <ManagerDataTable columns={["Zone", "Loại xe", "Mô tả", "Trạng thái", "Thao tác"]}>
                  {floorZones.map((zone) => {
                    const isActive = String(selectedZoneId) === String(zone.id);
                    return (
                      <ManagerRow key={zone.id} onClick={() => selectZone(zone.id)} active={isActive}>
                        <ManagerCell className="font-medium">{zone.name}</ManagerCell>
                        <ManagerCell className="text-muted-foreground">{zone.vehicleType?.name || "Không xác định"}</ManagerCell>
                        <ManagerCell className="text-muted-foreground">{zone.description || "—"}</ManagerCell>
                        <ManagerCell>
                          <span className={toneText(zone.isActive !== false ? "emerald" : "amber")}>
                            {zone.isActive !== false ? "Đang hoạt động" : "Ngừng hoạt động"}
                          </span>
                        </ManagerCell>
                        <ManagerCell>
                          <div className="flex gap-2">
                            <ManagerSecondaryButton type="button" onClick={(e) => { e.stopPropagation(); openZoneModal(zone); }}>Sửa</ManagerSecondaryButton>
                            <ManagerSecondaryButton type="button" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}>Xóa</ManagerSecondaryButton>
                          </div>
                        </ManagerCell>
                      </ManagerRow>
                    );
                  })}
                </ManagerDataTable>
              )}
            </div>
          )}

          {/* ══════════ CẤP 3 — SLOT ══════════ */}
          {selectedZone && (
            <div className="border-t border-border p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Slot — {selectedZone.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedZone.vehicleType?.name} · slot size {selectedZone.vehicleType?.slotSize}</p>
                </div>
                <ManagerPrimaryButton type="button" className="flex items-center gap-1.5" onClick={() => openSlotModal()}>
                  <Plus size={14} /> Thêm slot
                </ManagerPrimaryButton>
              </div>

              <div className="mb-4">
                <ManagerStatBar
                  items={[
                    { label: "Còn trống", value: zoneSlotCounts.available, tone: "emerald" },
                    { label: "Đang có xe", value: zoneSlotCounts.occupied, tone: "rose" },
                    { label: "Đã đặt trước", value: zoneSlotCounts.reserved, tone: "amber" },
                  ]}
                />
              </div>

              {zoneSlotCounts.total > 0 && (
                <div className="mb-5 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                  {slots
                    .filter((s) => String(s.zone?.zoneId ?? s.zone?.id) === String(selectedZoneId))
                    .map((s) => ({ ...s, id: s.slotId ?? s.id }))
                    .sort((a, b) => (a.slotCode || "").localeCompare(b.slotCode || ""))
                    .map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        title={`${slot.slotCode} — ${SLOT_STATUS_LABELS[slot.status] || slot.status}`}
                        onClick={() => openSlotModal(slot)}
                        className={`${statusColor(String(slot.status || "").toUpperCase())} rounded-lg py-3 text-[11px] font-bold text-white transition hover:scale-105`}
                      >
                        {(slot.slotCode || "").split("-").pop()}
                      </button>
                    ))}
                </div>
              )}

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={filterSlotSearch}
                    onChange={(e) => { setFilterSlotSearch(e.target.value); setSlotPage(1); }}
                    placeholder="Tìm mã slot..."
                    className="w-full rounded-xl border border-border bg-muted py-2 pl-8 pr-3 text-xs outline-none focus:border-primary"
                  />
                </div>
                <select
                  value={filterSlotStatus}
                  onChange={(e) => { setFilterSlotStatus(e.target.value); setSlotPage(1); }}
                  className="rounded-xl border border-border bg-muted px-3 py-2 text-xs outline-none focus:border-primary"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="available">Còn trống</option>
                  <option value="occupied">Đang có xe</option>
                  <option value="reserved">Đã đặt trước</option>
                </select>
                <span className="ml-auto text-xs text-muted-foreground">{zoneSlots.length} slot</span>
              </div>

              <div className="space-y-2" ref={slotListRef}>
                {pagedZoneSlots.length === 0 ? (
                  <ManagerEmptyState title="Không có slot" description="Thêm slot đầu tiên cho zone này." />
                ) : (
                  pagedZoneSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{slot.slotCode}</p>
                        <p className="text-xs text-muted-foreground">{SLOT_SIZE_LABELS[slot.slotSize] || slot.slotSize}</p>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          slot.status === "AVAILABLE"
                            ? "text-emerald-600 dark:text-emerald-300"
                            : slot.status === "OCCUPIED"
                              ? "text-rose-600 dark:text-rose-300"
                              : slot.status === "RESERVED"
                                ? "text-amber-600 dark:text-amber-300"
                                : "text-muted-foreground"
                        }`}
                      >
                        {SLOT_STATUS_LABELS[slot.status] || slot.status}
                      </span>
                      <button type="button" onClick={() => openSlotModal(slot)} className="rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-muted">
                        <Edit2 size={14} />
                      </button>
                      <button type="button" onClick={() => deleteSlot(slot.id)} className="rounded-xl border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {totalSlotPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button onClick={() => handleSlotPage(Math.max(1, slotPage - 1))} disabled={slotPage === 1}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
                    ← Trước
                  </button>
                  {Array.from({ length: totalSlotPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => handleSlotPage(p)}
                      className={`size-8 rounded-lg text-xs font-bold transition ${p === slotPage ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => handleSlotPage(Math.min(totalSlotPages, slotPage + 1))} disabled={slotPage === totalSlotPages}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed">
                    Sau →
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </>
      )}

      {/* ══════════ MODAL: BUILDING ══════════ */}
      {buildingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">{buildingModal.editingId ? "Cập nhật tòa nhà" : "Thêm tòa nhà"}</h3>
              <button type="button" onClick={() => setBuildingModal(null)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={submitBuildingModal} className="space-y-4">
              <ManagerField label="Tên tòa nhà">
                <ManagerInput required value={buildingModal.form.name}
                  onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                  placeholder="Bãi xe Quận 1" />
              </ManagerField>
              <ManagerField label="Địa chỉ">
                <ManagerInput required value={buildingModal.form.address}
                  onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, address: e.target.value } }))}
                  placeholder="123 Đường ABC, Quận 1, TP.HCM" />
              </ManagerField>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Điện thoại">
                  <ManagerInput value={buildingModal.form.phone}
                    onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, phone: e.target.value } }))} placeholder="090..." />
                </ManagerField>
                <ManagerField label="Email">
                  <ManagerInput type="email" value={buildingModal.form.email}
                    onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, email: e.target.value } }))} placeholder="ops@building.com" />
                </ManagerField>
              </div>
              <ManagerField label="Mô tả">
                <ManagerInput value={buildingModal.form.description}
                  onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))} placeholder="Ghi chú ngắn" />
              </ManagerField>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Giờ mở cửa">
                  <input type="time" value={buildingModal.form.openTime}
                    onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, openTime: e.target.value } }))}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </ManagerField>
                <ManagerField label="Giờ đóng cửa">
                  <input type="time" value={buildingModal.form.closeTime}
                    onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, closeTime: e.target.value } }))}
                    className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </ManagerField>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Vĩ độ (tuỳ chọn)">
                  <input type="number" step="any" value={buildingModal.form.latitude}
                    onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, latitude: e.target.value } }))}
                    placeholder="VD: 10.7769" className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </ManagerField>
                <ManagerField label="Kinh độ (tuỳ chọn)">
                  <input type="number" step="any" value={buildingModal.form.longitude}
                    onChange={(e) => setBuildingModal((m) => ({ ...m, form: { ...m.form, longitude: e.target.value } }))}
                    placeholder="VD: 106.7009" className="w-full rounded-2xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:border-primary" />
                </ManagerField>
              </div>
              <div className="flex gap-3 pt-2">
                <ManagerSecondaryButton type="button" className="flex-1" onClick={() => setBuildingModal(null)}>Hủy</ManagerSecondaryButton>
                <ManagerPrimaryButton type="submit" className="flex-1">{buildingModal.editingId ? "Lưu thay đổi" : "Tạo tòa nhà"}</ManagerPrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: FLOOR ══════════ */}
      {floorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{floorModal.editingId ? "Cập nhật tầng" : "Thêm tầng"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Thuộc tòa nhà: {selectedBuilding?.name}</p>
              </div>
              <button type="button" onClick={() => setFloorModal(null)} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={submitFloorModal}>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Số tầng">
                  <ManagerInput type="number" value={floorModal.form.floorNumber}
                    onChange={(e) => setFloorModal((m) => ({ ...m, form: { ...m.form, floorNumber: e.target.value } }))} placeholder="1" />
                </ManagerField>
                <ManagerField label="Sức chứa">
                  <ManagerInput type="number" value={floorModal.form.capacity}
                    onChange={(e) => setFloorModal((m) => ({ ...m, form: { ...m.form, capacity: e.target.value } }))} placeholder="50" />
                </ManagerField>
              </div>
              <ManagerField label="Tên tầng">
                <ManagerInput value={floorModal.form.floorName}
                  onChange={(e) => setFloorModal((m) => ({ ...m, form: { ...m.form, floorName: e.target.value } }))} placeholder="Tầng trệt" />
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{floorModal.editingId ? "Lưu thay đổi" : "Tạo tầng"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={() => setFloorModal(null)}>Hủy</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: GATE ══════════ */}
      {gateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{gateModal.editingId ? "Cập nhật cổng" : "Thêm cổng"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Thuộc tòa nhà: {selectedBuilding?.name}</p>
              </div>
              <button type="button" onClick={() => setGateModal(null)} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={submitGateModal}>
              <ManagerField label="Mã cổng">
                <ManagerInput value={gateModal.form.gateCode}
                  onChange={(e) => setGateModal((m) => ({ ...m, form: { ...m.form, gateCode: e.target.value } }))} placeholder="GATE-IN-01" />
              </ManagerField>
              <ManagerField label="Loại cổng">
                <ManagerSelect value={gateModal.form.gateType}
                  onChange={(e) => setGateModal((m) => ({ ...m, form: { ...m.form, gateType: e.target.value } }))}>
                  <option value="ENTRY">Cổng vào</option>
                  <option value="EXIT">Cổng ra</option>
                  <option value="BOTH">Cả hai</option>
                </ManagerSelect>
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{gateModal.editingId ? "Lưu thay đổi" : "Tạo cổng"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={() => setGateModal(null)}>Hủy</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: ZONE ══════════ */}
      {zoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{zoneModal.editingId ? "Cập nhật zone" : "Thêm zone"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Thuộc tầng: {selectedFloor?.label} — {selectedFloor?.name}</p>
              </div>
              <button type="button" onClick={() => setZoneModal(null)} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={submitZoneModal}>
              <ManagerField label="Loại xe">
                <ManagerSelect value={zoneModal.form.vehicleTypeId}
                  onChange={(e) => setZoneModal((m) => ({ ...m, form: { ...m.form, vehicleTypeId: e.target.value } }))}>
                  <option value="">Chọn loại xe</option>
                  {vehicleTypes.map((item) => (
                    <option key={item.vehicleTypeId ?? item.id} value={item.vehicleTypeId ?? item.id}>{item.name}</option>
                  ))}
                </ManagerSelect>
              </ManagerField>
              <ManagerField label="Tên zone">
                <ManagerInput value={zoneModal.form.zoneName}
                  onChange={(e) => setZoneModal((m) => ({ ...m, form: { ...m.form, zoneName: e.target.value } }))} placeholder="Zone A" />
              </ManagerField>
              <ManagerField label="Mô tả">
                <ManagerInput value={zoneModal.form.description}
                  onChange={(e) => setZoneModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))} placeholder="Dành cho ô tô con" />
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{zoneModal.editingId ? "Lưu thay đổi" : "Tạo zone"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={() => setZoneModal(null)}>Hủy</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: SLOT ══════════ */}
      {slotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{slotModal.editingId ? "Cập nhật slot" : "Thêm slot"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Thuộc zone: {selectedZone?.name}</p>
              </div>
              <button type="button" onClick={() => setSlotModal(null)} className="rounded-full p-2 text-muted-foreground hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ManagerForm onSubmit={submitSlotModal}>
              <div className="grid gap-4 md:grid-cols-2">
                <ManagerField label="Mã slot">
                  <ManagerInput value={slotModal.form.slotCode}
                    onChange={(e) => setSlotModal((m) => ({ ...m, form: { ...m.form, slotCode: e.target.value } }))} placeholder="A01" />
                </ManagerField>
                <ManagerField label="Trạng thái">
                  <ManagerSelect value={slotModal.form.status}
                    onChange={(e) => setSlotModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))}>
                    <option value="AVAILABLE">Còn trống</option>
                    <option value="OCCUPIED">Đang có xe</option>
                    <option value="RESERVED">Đã đặt trước</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                  </ManagerSelect>
                </ManagerField>
              </div>
              <ManagerField label="Slot size (tự động theo zone)">
                <ManagerInput value={selectedZone?.vehicleType?.slotSize || ""} readOnly placeholder="Auto từ zone" />
              </ManagerField>
              <div className="flex gap-3">
                <ManagerPrimaryButton type="submit" className="flex-1">{slotModal.editingId ? "Lưu thay đổi" : "Tạo slot"}</ManagerPrimaryButton>
                <ManagerSecondaryButton type="button" className="flex-1" onClick={() => setSlotModal(null)}>Hủy</ManagerSecondaryButton>
              </div>
            </ManagerForm>
          </div>
        </div>
      )}
    </div>
  );
}

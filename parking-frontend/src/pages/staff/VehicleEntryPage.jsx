import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Camera, CheckCircle2, ImageUp, RefreshCw, Search, ShieldAlert, Video, VideoOff } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { exceptionApi } from "../../api/staff/exceptionApi";
import { vehicleTypeApi } from "../../api/manager/vehicleTypeApi";
import { buildingApi } from "../../api/manager/buildingApi";
import { gateApi } from "../../api/manager/gateApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import {
  createPortalId,
  formatStaffCurrency,
  formatStaffDateTime,
  getStaffPortalState,
  updateStaffPortalState,
} from "./staffPortalState";
import {
  StaffEmptyState,
  StaffField,
  StaffInput,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffSelect,
  StaffStatusBadge,
} from "./StaffUi";

const ENTRY_FEES = {
  CAR: 20000,
  MOTORBIKE: 5000,
  SUV: 25000,
};

function normalizeVehicleType(vehicle) {
  return String(vehicle?.vehicleType?.typeName || vehicle?.vehicleTypeName || "CAR").toUpperCase();
}

function getBuildingId(building) {
  return building?.buildingId || building?.id || "";
}

function getVehicleTypeId(item) {
  return item?.vehicleTypeId ?? item?.id ?? "";
}

function plateKey(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, "").replace(".", "");
}

function mapEntrySession(item) {
  return {
    sessionId: item.sessionId,
    licensePlate: item.licensePlate || "Unknown plate",
    driverName: item.driverName || "Gate entry",
    slotCode: item.slotCode || "Assigned by backend",
    gateName: item.gateName || item.entryGateCode || (item.entryGateId ? `Gate #${item.entryGateId}` : "Entry gate"),
    buildingName: item.buildingName || "Selected building",
    entryTime: item.entryTime || item.createdAt || new Date().toISOString(),
    status: item.status || "ACTIVE",
    feeAmount: item.feeAmount || 0,
    paymentStatus: item.paymentStatus || "UNPAID",
    source: item.source || "backend-session",
  };
}

export default function VehicleEntryPage() {
  const initialStaffState = getStaffPortalState();
  const initialOcrPlate =
    initialStaffState.latestOcrPlate ||
    initialStaffState.ocrRecords[0]?.correctedPlate ||
    initialStaffState.ocrRecords[0]?.detectedPlate ||
    "";
  const [step, setStep] = useState(1);
  const [buildings, setBuildings] = useState([]);
  const [gates, setGates] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [recentEntries, setRecentEntries] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [latestOcrPlate, setLatestOcrPlate] = useState(initialOcrPlate);
  const [ocrState, setOcrState] = useState({ loading: false, error: "", notice: "", result: null });
  const [cameraOn, setCameraOn] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [form, setForm] = useState({
    licensePlate: initialOcrPlate,
    buildingId: "",
    gateId: "",
    vehicleTypeId: "",
    qrCode: "",
  });
  const [lookup, setLookup] = useState({ loading: false, error: "", notice: "", vehicle: null });
  const [confirmedSession, setConfirmedSession] = useState(null);
  const normalizedPlate = form.licensePlate.trim().toUpperCase();

  async function loadRecentEntries() {
    try {
      const res = await sessionApi.getSessions({ status: "ACTIVE" });
      const backendEntries = unwrapApiData(res.data, []).map(mapEntrySession).slice(0, 5);
      const localEntries = getStaffPortalState().sessions
        .filter((item) => String(item.status || "").toUpperCase() === "ACTIVE")
        .map(mapEntrySession);
      const merged = [...backendEntries, ...localEntries]
        .filter((item, index, items) => items.findIndex((candidate) => String(candidate.sessionId) === String(item.sessionId)) === index)
        .slice(0, 5);
      setRecentEntries(merged);
    } catch (error) {
      console.error("Failed to load active backend sessions", error);
      setRecentEntries(
        getStaffPortalState().sessions
          .filter((item) => String(item.status || "").toUpperCase() === "ACTIVE")
          .map(mapEntrySession)
          .slice(0, 5)
      );
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRecentEntries();
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return "";
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBuildings() {
      try {
        const [buildingRes, vehicleTypeRes] = await Promise.all([
          buildingApi.getAll(),
          vehicleTypeApi.getAll(),
        ]);
        if (!cancelled) {
          const items = unwrapApiData(buildingRes.data, []);
          const types = unwrapApiData(vehicleTypeRes.data, []);
          setBuildings(items);
          setVehicleTypes(types);
          setForm((prev) => ({
            ...prev,
            buildingId: prev.buildingId || String(getBuildingId(items[0])),
            vehicleTypeId: prev.vehicleTypeId || String(getVehicleTypeId(types[0])),
          }));
        }
      } catch (error) {
        console.error("Failed to load buildings or vehicle types", error);
        if (!cancelled) {
          setBuildings([]);
          setVehicleTypes([]);
        }
      }
    }

    void loadBuildings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGates() {
      if (!form.buildingId) {
        setGates([]);
        return;
      }

      try {
        const res = await gateApi.getActiveByBuilding(form.buildingId);
        if (!cancelled) {
          const items = unwrapApiData(res.data, []).filter((item) =>
            ["ENTRY", "BOTH"].includes(String(item.gateType || "").toUpperCase())
          );
          setGates(items);
          setForm((prev) => ({
            ...prev,
            gateId: prev.gateId || String(items[0]?.gateId || items[0]?.id || ""),
          }));
        }
      } catch (error) {
        console.error("Failed to load gates", error);
        if (!cancelled) {
          setGates([]);
        }
      }
    }

    void loadGates();
    return () => {
      cancelled = true;
    };
  }, [form.buildingId]);

  const selectedBuilding = useMemo(
    () => buildings.find((item) => String(getBuildingId(item)) === String(form.buildingId)),
    [buildings, form.buildingId]
  );
  const selectedGate = useMemo(
    () => gates.find((item) => String(item.gateId || item.id) === String(form.gateId)),
    [gates, form.gateId]
  );

  const handleOcrFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadForOcr(file, file.name);
    event.target.value = "";
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const startCamera = async () => {
    setOcrState((prev) => ({ ...prev, error: "", notice: "" }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch {
      setOcrState({
        loading: false,
        error: "Khong mo duoc camera. Hay kiem tra quyen camera hoac upload anh bien so.",
        notice: "",
        result: null,
      });
    }
  };

  const captureBlob = () =>
    new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        reject(new Error("Camera chua san sang"));
        return;
      }

      const sourceWidth = video.videoWidth || 1280;
      const sourceHeight = video.videoHeight || 720;
      const cropWidth = Math.round(sourceWidth * 0.68);
      const cropHeight = Math.round(sourceHeight * 0.36);
      const cropX = Math.round((sourceWidth - cropWidth) / 2);
      const cropY = Math.round((sourceHeight - cropHeight) / 2);
      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Khong chup duoc anh tu camera"));
      }, "image/jpeg", 0.92);
    });

  const handleCameraScan = async () => {
    try {
      const blob = await captureBlob();
      await uploadForOcr(blob, "camera-capture.jpg");
    } catch (error) {
      setOcrState({
        loading: false,
        error: error.message || "Khong chup duoc anh tu camera.",
        notice: "",
        result: null,
      });
    }
  };

  const resetPlateScan = () => {
    stopCamera();
    setLatestOcrPlate("");
    setOcrState({ loading: false, error: "", notice: "", result: null });
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    updateStaffPortalState((current) => ({
      ...current,
      latestOcrPlate: "",
      latestOcrRecord: null,
    }));
  };

  const uploadForOcr = async (file, filename = "entry-plate.jpg") => {
    if (!form.gateId) {
      setOcrState({ loading: false, error: "Chon entry gate truoc khi scan OCR.", notice: "", result: null });
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextPreviewUrl;
    });
    setOcrState({ loading: true, error: "", notice: "", result: null });
    try {
      const formData = new FormData();
      formData.append("image", file, filename);
      formData.append("gateId", form.gateId);
      formData.append("triggerType", "ENTRY");

      const response = await axiosClient.post("/ocr/scan-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = response.data?.data || {};
      const detectedPlate = data.effectivePlate || data.detectedPlate || "";
      if (!detectedPlate || detectedPlate === "UNKNOWN") {
        setOcrState({
          loading: false,
          error: "OCR khong doc duoc bien so hop le. Hay thu anh ro hon hoac nhap tay.",
          notice: "",
          result: data,
        });
        return;
      }

      const confidence = Math.round((data.plateConfidenceScore || 0) * 100);
      const record = {
        id: data.scanId ? `OCR-${data.scanId}` : createPortalId("OCR"),
        scanId: data.scanId,
        detectedPlate,
        correctedPlate: data.correctedPlate || "",
        confidence,
        status: data.processStatus || "PENDING",
        scanTime: data.scannedAt || new Date().toISOString(),
        imagePath: data.imagePath || filename,
      };

      updateStaffPortalState((current) => ({
        ...current,
        latestOcrPlate: detectedPlate,
        latestOcrRecord: record,
        ocrRecords: [record, ...current.ocrRecords],
        activity: [
          {
            id: createPortalId("ACT"),
            plate: detectedPlate,
            action: `OCR scan completed with ${confidence}% confidence`,
            type: "update",
            time: record.scanTime,
          },
          ...current.activity,
        ],
      }));

      setLatestOcrPlate(detectedPlate);
      setForm((prev) => ({ ...prev, licensePlate: detectedPlate }));
      setOcrState({
        loading: false,
        error: "",
        notice: `Da scan bien ${detectedPlate} va dua vao form entry.`,
        result: record,
      });
    } catch (error) {
      console.error("Entry OCR scan failed", error);
      setOcrState({
        loading: false,
        error: error.response?.data?.message || "OCR scan failed.",
        notice: "",
        result: null,
      });
    }
  };

  const clearProcessedOcrPlate = () => {
    const processedPlate = latestOcrPlate;
    setLatestOcrPlate("");
    setOcrState({ loading: false, error: "", notice: "", result: null });
    setForm((prev) => ({
      ...prev,
      licensePlate: plateKey(prev.licensePlate) === plateKey(processedPlate) ? "" : prev.licensePlate,
    }));
    updateStaffPortalState((current) => ({
      ...current,
      latestOcrPlate: "",
      latestOcrRecord: null,
    }));
  };

  useEffect(() => {
    if (!latestOcrPlate) return;
    const alreadyEntered = recentEntries.some((item) => plateKey(item.licensePlate) === plateKey(latestOcrPlate));
    if (alreadyEntered) {
      clearProcessedOcrPlate();
    }
  }, [latestOcrPlate, recentEntries]);


  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "buildingId" ? { gateId: "" } : {}),
    }));
  };

  const handleLookup = async (event) => {
    event?.preventDefault?.();

    // Nếu có QR code → chuyển sang luồng booking entry thay vì lookup walk-in
    if (form.qrCode.trim()) {
      return handleQrEntry();
    }

    if (!form.licensePlate.trim()) {
      setLookup({ loading: false, error: "Enter a license plate to continue.", notice: "", vehicle: null });
      return;
    }

    setLookup({ loading: true, error: "", notice: "", vehicle: null });
    try {
      const res = await axiosClient.get(`/vehicles/plate/${encodeURIComponent(normalizedPlate)}`);
      const vehicle = unwrapApiData(res.data, null);
      setLookup({ loading: false, error: "", notice: "", vehicle });
      setStep(2);
    } catch (error) {
      console.error("Vehicle lookup failed", error);
      setLookup({
        loading: false,
        error: `Biển ${normalizedPlate} OCR đã đọc được, nhưng xe này chưa được đăng ký trong hệ thống. Hãy mở exception để lưu lại biển cho staff xử lý.`,
        notice: "",
        vehicle: null,
      });
      setStep(1);
    }
  };

  const handleConfirmEntry = async () => {
    if (!lookup.vehicle) {
      setLookup((prev) => ({
        ...prev,
        error: "Chua co thong tin xe de confirm entry.",
        notice: "",
      }));
      return;
    }
    if (!selectedGate || !selectedBuilding) {
      setLookup((prev) => ({
        ...prev,
        error: "Chon building va entry gate truoc khi confirm entry.",
        notice: "",
      }));
      return;
    }

    // Nếu có QR code → dùng BOOKING mode thay vì WALK_IN_AUTO
    if (form.qrCode.trim()) {
      return handleQrEntry();
    }

    setLookup((prev) => ({ ...prev, loading: true, error: "", notice: "" }));
    try {
      const res = await sessionApi.entry({
        gateId: Number(form.gateId),
        licensePlate: normalizedPlate,
        entryMode: "WALK_IN_AUTO",
        vehicleTypeId: form.vehicleTypeId ? Number(form.vehicleTypeId) : null,
        staffUserId: Number(localStorage.getItem("userId")) || null,
      });
      const payload = unwrapApiData(res.data, null);
      const session = {
        sessionId: payload?.sessionId || createPortalId("SES"),
        licensePlate: payload?.licensePlate || lookup.vehicle.licensePlate || normalizedPlate,
        driverName: lookup.vehicle.user?.fullName || lookup.vehicle.user?.username || "Registered Driver",
        slotCode: payload?.slotCode || "Assigned by backend",
        gateName: payload?.entryGateCode || selectedGate.gateName || selectedGate.gateCode || selectedGate.name || `Gate ${selectedGate.gateId || selectedGate.id}`,
        buildingName: selectedBuilding.name,
        entryTime: payload?.entryTime || new Date().toISOString(),
        status: payload?.status || "ACTIVE",
        feeAmount: ENTRY_FEES[normalizeVehicleType(lookup.vehicle)] || 20000,
        paymentStatus: "UNPAID",
        qrCode: form.qrCode.trim(),
        source: "backend-entry",
      };

      updateStaffPortalState((current) => ({
        ...current,
        sessions: [session, ...current.sessions.filter((item) => item.sessionId !== session.sessionId)],
        activity: [
          {
            id: createPortalId("ACT"),
            plate: session.licensePlate,
            action: `Entered via ${session.gateName}`,
            type: "entry",
            time: session.entryTime,
          },
          ...current.activity,
        ],
      }));

      setRecentEntries((prev) => [session, ...prev.filter((item) => item.sessionId !== session.sessionId)].slice(0, 5));
      setConfirmedSession(session);
      clearProcessedOcrPlate();
      setLookup({ loading: false, error: "", notice: "", vehicle: null });
      setStep(3);
    } catch (error) {
      console.error("Backend entry failed", error);
      setLookup({
        loading: false,
        error: error.response?.data?.message || "Khong tao duoc session backend cho xe vao.",
        notice: "",
        vehicle: lookup.vehicle,
      });
    }
  };

  const handleDirectWalkInEntry = async () => {
    if (!normalizedPlate) {
      setLookup({ loading: false, error: "Nhap bien so xe truoc khi cho xe vao bai.", notice: "", vehicle: null });
      return;
    }
    if (!selectedGate || !selectedBuilding) {
      setLookup({ loading: false, error: "Chon building va entry gate truoc khi cho xe vao bai.", notice: "", vehicle: null });
      return;
    }
    if (!form.vehicleTypeId) {
      setLookup({ loading: false, error: "Chon loai xe de he thong tim slot phu hop.", notice: "", vehicle: null });
      return;
    }

    setLookup((prev) => ({ ...prev, loading: true, error: "", notice: "" }));
    try {
      const res = await sessionApi.entry({
        gateId: Number(form.gateId),
        licensePlate: normalizedPlate,
        entryMode: "WALK_IN_AUTO",
        vehicleTypeId: Number(form.vehicleTypeId),
        staffUserId: Number(localStorage.getItem("userId")) || null,
      });
      const payload = unwrapApiData(res.data, null);
      const session = {
        sessionId: payload?.sessionId || createPortalId("SES"),
        licensePlate: payload?.licensePlate || normalizedPlate,
        driverName: "Walk-in Guest",
        slotCode: payload?.slotCode || "Assigned by backend",
        gateName: payload?.entryGateCode || selectedGate.gateName || selectedGate.gateCode || selectedGate.name || `Gate ${selectedGate.gateId || selectedGate.id}`,
        buildingName: selectedBuilding.name,
        entryTime: payload?.entryTime || new Date().toISOString(),
        status: payload?.status || "ACTIVE",
        feeAmount: 0,
        paymentStatus: "UNPAID",
        qrCode: "",
        source: "walk-in-direct",
      };

      updateStaffPortalState((current) => ({
        ...current,
        sessions: [session, ...current.sessions.filter((item) => item.sessionId !== session.sessionId)],
        activity: [
          {
            id: createPortalId("ACT"),
            plate: session.licensePlate,
            action: `Walk-in entered via ${session.gateName}`,
            type: "entry",
            time: session.entryTime,
          },
          ...current.activity,
        ],
      }));

      setRecentEntries((prev) => [session, ...prev.filter((item) => item.sessionId !== session.sessionId)].slice(0, 5));
      setConfirmedSession(session);
      clearProcessedOcrPlate();
      setLookup({ loading: false, error: "", notice: "", vehicle: null });
      setStep(3);
    } catch (error) {
      console.error("Direct walk-in entry failed", error);
      setLookup({
        loading: false,
        error: error.response?.data?.message || "Khong tao duoc walk-in entry cho xe chua dang ky.",
        notice: "",
        vehicle: null,
      });
    }
  };

  const handleQrEntry = async () => {
    if (!form.qrCode.trim()) {
      setLookup({ loading: false, error: "Enter a QR token to process booking entry.", notice: "", vehicle: null });
      return;
    }

    if (!selectedGate) {
      setLookup({ loading: false, error: "Select an entry gate before processing QR.", notice: "", vehicle: null });
      return;
    }

    setLookup((prev) => ({ ...prev, loading: true, error: "", notice: "" }));
    try {
      const res = await sessionApi.entry({
        gateId: Number(form.gateId),
        entryMode: "BOOKING",
        qrToken: form.qrCode.trim(),
        staffUserId: Number(localStorage.getItem("userId")) || null,
      });
      const payload = unwrapApiData(res.data, null);
      const session = {
        sessionId: payload?.sessionId || createPortalId("SES"),
        licensePlate: payload?.licensePlate || "QR booking",
        driverName: "Booking Driver",
        slotCode: payload?.slotCode || "Booked slot",
        gateName: payload?.entryGateCode || selectedGate.gateName || selectedGate.gateCode || selectedGate.name || `Gate ${selectedGate.gateId || selectedGate.id}`,
        buildingName: selectedBuilding?.name || "Selected building",
        entryTime: payload?.entryTime || new Date().toISOString(),
        status: payload?.status || "ACTIVE",
        feeAmount: 0,
        paymentStatus: "UNPAID",
        qrCode: form.qrCode.trim(),
        source: "booking-qr",
      };

      updateStaffPortalState((current) => ({
        ...current,
        sessions: [session, ...current.sessions],
        qrLogs: [
          {
            id: createPortalId("QR"),
            bookingCode: `Booking #${payload?.bookingId || session.sessionId}`,
            plate: session.licensePlate,
            status: "valid",
            checkedAt: session.entryTime,
          },
          ...current.qrLogs,
        ],
        activity: [
          {
            id: createPortalId("ACT"),
            plate: session.licensePlate,
            action: `Entered by booking QR via ${session.gateName}`,
            type: "entry",
            time: session.entryTime,
          },
          ...current.activity,
        ],
      }));

      setRecentEntries((prev) => [session, ...prev.filter((item) => item.sessionId !== session.sessionId)].slice(0, 5));
      setConfirmedSession(session);
      clearProcessedOcrPlate();
      setLookup({ loading: false, error: "", notice: "", vehicle: null });
      setStep(3);
    } catch (error) {
      console.error("QR booking entry failed", error);
      setLookup({
        loading: false,
        error: error.response?.data?.message || "QR khong hop le hoac booking khong con hieu luc.",
        notice: "",
        vehicle: null,
      });
    }
  };

  const handleCreateException = async () => {
    if (!normalizedPlate) return;

    setLookup((prev) => ({ ...prev, loading: true, error: "", notice: "" }));

    try {
      const description = [
        `License plate: ${normalizedPlate}`,
        "Reason: OCR plate was not found in backend vehicle registry.",
        selectedGate ? `Gate: ${selectedGate.gateName || selectedGate.gateCode || selectedGate.name || form.gateId}` : null,
        selectedBuilding ? `Building: ${selectedBuilding.name}` : null,
      ].filter(Boolean).join(" | ");
      const res = await exceptionApi.create({
        exceptionType: "CANNOT_FIND_CAR",
        description,
      });
      const payload = unwrapApiData(res.data, null);
      const createdAt = payload?.createdAt || new Date().toISOString();

      updateStaffPortalState((current) => ({
        ...current,
        latestOcrPlate: normalizedPlate,
        exceptions: [
          {
            caseId: payload?.exceptionId ? `EX-${payload.exceptionId}` : createPortalId("EX"),
            exceptionId: payload?.exceptionId,
            title: "Vehicle not found in backend registry",
            licensePlate: normalizedPlate,
            description,
            severity: "HIGH",
            status: payload?.status || "OPEN",
            createdAt,
            source: "backend-exception",
          },
          ...current.exceptions,
        ],
        activity: [
          {
            id: createPortalId("ACT"),
            plate: normalizedPlate,
            action: "Exception opened for unregistered vehicle",
            type: "exception",
            time: createdAt,
          },
          ...current.activity,
        ],
      }));
      setLookup({
        loading: false,
        error: "",
        notice: `Đã tạo exception cho biển ${normalizedPlate}. Biển vẫn được giữ tại form này, nhưng xe chưa được cho vào bãi vì chưa có đăng ký.`,
        vehicle: null,
      });
      setForm((prev) => ({ ...prev, licensePlate: normalizedPlate }));
    } catch (error) {
      console.error("Create exception failed", error);
      setLookup({
        loading: false,
        error: error.response?.data?.message || `Could not create exception for ${normalizedPlate}.`,
        notice: "",
        vehicle: null,
      });
    }
  };

  const resetFlow = () => {
    setStep(1);
    setLookup({ loading: false, error: "", notice: "", vehicle: null });
    setConfirmedSession(null);
    setForm((prev) => ({ ...prev, licensePlate: latestOcrPlate || prev.licensePlate, qrCode: "" }));
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <StaffPageSection
            title="Plate Scan"
            subtitle="Use camera or upload a plate image, then send it to OCR"
          >
            <div className="rounded-3xl bg-slate-950 p-4 text-white dark:bg-[#020617]">
              <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-slate-900 dark:bg-[#0f172a]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 size-full object-cover ${cameraOn ? "opacity-100" : "opacity-0"}`}
                />
                {cameraOn ? (
                  <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-20 -translate-y-1/2 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />
                ) : null}
                {previewUrl && !cameraOn ? (
                  <img src={previewUrl} alt="Plate preview" className="absolute inset-0 size-full object-contain opacity-65" />
                ) : null}
                {ocrState.loading ? (
                  <div className="relative z-10 space-y-3 text-center">
                    <div className="mx-auto size-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    <p className="text-sm text-emerald-300">Sending image to OCR engine...</p>
                  </div>
                ) : latestOcrPlate ? (
                  <div className="relative z-10 rounded-2xl border border-emerald-400/30 bg-slate-950/75 px-5 py-4 text-center shadow-xl">
                    <CheckCircle2 size={26} className="mx-auto text-emerald-300" />
                    <p className="mt-2 text-xs text-slate-300">Current OCR Plate</p>
                    <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-white">{latestOcrPlate}</p>
                    {ocrState.result?.confidence != null ? (
                      <p className="mt-1 text-xs text-slate-300">
                        {ocrState.result.confidence}% confidence - {String(ocrState.result.status || "pending").toLowerCase()}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="relative z-10 space-y-3 text-center">
                    <Camera size={38} className="mx-auto text-white/30" />
                    <p className="text-sm text-white/60">{cameraOn ? "Align plate inside the frame" : "Open camera or upload a plate image"}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <StaffSecondaryButton
                type="button"
                onClick={cameraOn ? stopCamera : startCamera}
                disabled={ocrState.loading}
                className="flex items-center justify-center gap-2"
              >
                {cameraOn ? <VideoOff size={15} /> : <Video size={15} />}
                {cameraOn ? "Stop" : "Camera"}
              </StaffSecondaryButton>
              <StaffPrimaryButton
                type="button"
                onClick={handleCameraScan}
                disabled={ocrState.loading || !cameraOn}
                className="flex items-center justify-center gap-2"
              >
                <Camera size={15} />
                Capture & Scan
              </StaffPrimaryButton>
              <label
                className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted ${
                  ocrState.loading ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <ImageUp size={15} />
                Upload
                <input type="file" accept="image/*" className="sr-only" onChange={handleOcrFileChange} />
              </label>
              <StaffSecondaryButton
                type="button"
                onClick={resetPlateScan}
                disabled={ocrState.loading}
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw size={15} />
                Reset
              </StaffSecondaryButton>
            </div>

            {ocrState.error ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {ocrState.error}
              </div>
            ) : null}
            {ocrState.notice ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                {ocrState.notice}
              </div>
            ) : null}
          </StaffPageSection>

        <StaffPageSection
          title="Entry Workflow"
          subtitle="Process QR bookings, registered vehicles, direct walk-ins, or exceptions"
        >
          <div className="mb-5 flex items-center gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    step >= item ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item}
                </div>
                {item < 3 ? <div className={`h-px w-10 ${step > item ? "bg-primary" : "bg-border"}`} /> : null}
              </div>
            ))}
          </div>

          {step === 1 ? (
            <form onSubmit={handleLookup} className="space-y-4">
              <StaffField label="License Plate" hint="This uses the real backend vehicle lookup API.">
                <StaffInput
                  name="licensePlate"
                  value={form.licensePlate}
                  onChange={handleChange}
                  placeholder="Nhap bien so xe"
                />
              </StaffField>
              {latestOcrPlate ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Latest OCR plate: <span className="font-semibold text-foreground">{latestOcrPlate}</span></span>
                  <div className="flex flex-wrap gap-2">
                    <StaffSecondaryButton
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, licensePlate: latestOcrPlate }))}
                    >
                      Use OCR Plate
                    </StaffSecondaryButton>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <StaffField label="Building">
                  <StaffSelect name="buildingId" value={form.buildingId} onChange={handleChange}>
                    <option value="">Select building</option>
                    {buildings.map((item) => (
                      <option key={getBuildingId(item)} value={getBuildingId(item)}>
                        {item.name}
                      </option>
                    ))}
                  </StaffSelect>
                </StaffField>

                <StaffField label="Entry Gate">
                  <StaffSelect name="gateId" value={form.gateId} onChange={handleChange}>
                    <option value="">Select gate</option>
                    {gates.map((item) => (
                      <option key={item.gateId || item.id} value={item.gateId || item.id}>
                        {item.gateName || item.gateCode || item.name || `Gate ${item.gateId || item.id}`}
                      </option>
                    ))}
                  </StaffSelect>
                </StaffField>
              </div>

              <StaffField label="Vehicle Type" hint="Required for unregistered walk-in so backend can assign a compatible slot.">
                <StaffSelect name="vehicleTypeId" value={form.vehicleTypeId} onChange={handleChange}>
                  <option value="">Select vehicle type</option>
                  {vehicleTypes.map((item) => (
                    <option key={getVehicleTypeId(item)} value={getVehicleTypeId(item)}>
                      {item.name}
                    </option>
                  ))}
                </StaffSelect>
              </StaffField>

              <StaffField label="QR / Booking Code" hint="Optional for now until booking backend is fully integrated.">
                <StaffInput
                  name="qrCode"
                  value={form.qrCode}
                  onChange={handleChange}
                  placeholder="Paste booking QR token"
                />
              </StaffField>

              {lookup.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {lookup.error}
                </div>
              ) : null}
              {lookup.notice ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  {lookup.notice}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                {form.qrCode.trim() ? (
                  <StaffPrimaryButton type="button" onClick={handleQrEntry} disabled={lookup.loading} className="flex items-center justify-center gap-2 sm:flex-1">
                    <CheckCircle2 size={15} />
                    {lookup.loading ? "Processing..." : "Process QR Entry"}
                  </StaffPrimaryButton>
                ) : (
                  <StaffPrimaryButton type="submit" disabled={lookup.loading} className="flex items-center justify-center gap-2 sm:flex-1">
                    <Search size={15} />
                    {lookup.loading ? "Checking..." : "Lookup Vehicle"}
                  </StaffPrimaryButton>
                )}
                <StaffSecondaryButton type="button" onClick={handleDirectWalkInEntry} disabled={lookup.loading} className="flex items-center justify-center gap-2 sm:flex-1">
                  <ArrowRight size={15} />
                  Direct Walk-in Entry
                </StaffSecondaryButton>
                <StaffSecondaryButton type="button" onClick={handleCreateException} className="flex items-center justify-center gap-2 sm:flex-1">
                  <ShieldAlert size={15} />
                  Open Exception
                </StaffSecondaryButton>
              </div>
            </form>
          ) : null}

          {step === 2 && lookup.vehicle ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Vehicle Found</p>
                    <p className="mt-1 text-xl font-bold text-foreground">{lookup.vehicle.licensePlate}</p>
                    <p className="text-sm text-muted-foreground">
                      {lookup.vehicle.user?.fullName || lookup.vehicle.user?.username || "Registered driver"}
                    </p>
                  </div>
                  <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-300" />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Vehicle Type</p>
                  <p className="mt-1 font-semibold text-foreground">{normalizeVehicleType(lookup.vehicle)}</p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Assigned Gate</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedGate?.gateName || selectedGate?.gateCode || selectedGate?.name || "--"}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Building</p>
                  <p className="mt-1 font-semibold text-foreground">{selectedBuilding?.name || "--"}</p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Start Fee</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {formatStaffCurrency(ENTRY_FEES[normalizeVehicleType(lookup.vehicle)] || 20000)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <StaffSecondaryButton type="button" onClick={() => setStep(1)} className="sm:flex-1">
                  Back
                </StaffSecondaryButton>
                <StaffPrimaryButton
                  type="button"
                  onClick={handleConfirmEntry}
                  disabled={lookup.loading || !selectedGate || !selectedBuilding}
                  className="flex items-center justify-center gap-2 sm:flex-1"
                >
                  {lookup.loading ? "Creating session..." : "Confirm Entry"}
                  <ArrowRight size={15} />
                </StaffPrimaryButton>
              </div>
              {lookup.error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {lookup.error}
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 && confirmedSession ? (
            <div className="mx-auto max-w-md rounded-3xl border border-border bg-background p-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-300" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Entry Confirmed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Vehicle {confirmedSession.licensePlate} has been recorded successfully.
              </p>
              <div className="mt-5 space-y-2 rounded-2xl bg-muted/30 p-4 text-left">
                {[
                  ["Session", confirmedSession.sessionId],
                  ["Gate", confirmedSession.gateName],
                  ["Building", confirmedSession.buildingName],
                  ["Time", formatStaffDateTime(confirmedSession.entryTime)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <StaffPrimaryButton type="button" onClick={resetFlow} className="mt-5 w-full">
                Process Next Vehicle
              </StaffPrimaryButton>
            </div>
          ) : null}
        </StaffPageSection>
        </div>

        <StaffPageSection
          title="Active Gate Entries"
          subtitle="Active sessions created from gate entry. OCR-only scans stay in the scan panel, not this queue."
        >
          {recentEntries.length === 0 ? (
            <StaffEmptyState
              title="No entry records yet"
              description="Confirmed vehicle entries will appear here."
            />
          ) : (
            <div className="space-y-3">
              {recentEntries.map((item) => (
                <div key={item.sessionId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Session #{item.sessionId}</p>
                      <p className="text-base font-semibold text-foreground">{item.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.gateName} • {item.slotCode}
                      </p>
                    </div>
                    <StaffStatusBadge tone="emerald">{String(item.status || "active").toLowerCase()}</StaffStatusBadge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatStaffDateTime(item.entryTime)}</span>
                    <span className="font-semibold text-foreground">
                      {formatStaffCurrency(item.feeAmount || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </StaffPageSection>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Camera, CheckCircle2, CreditCard, QrCode, Search, StopCircle } from "lucide-react";
import { buildingApi } from "../../api/manager/buildingApi";
import { gateApi } from "../../api/manager/gateApi";
import { sessionApi } from "../../api/staff/sessionApi";
import { unwrapApiData } from "../../utils/api";
import { computeSessionFee, formatStaffCurrency, formatStaffDateTime } from "./staffPortalState";
import {
  StaffEmptyState,
  StaffInput,
  StaffPageSection,
  StaffPrimaryButton,
  StaffSecondaryButton,
  StaffSelect,
  StaffStatusBadge,
} from "./StaffUi";

export default function VehicleExitPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const qrReaderRef = useRef(null);
  const qrControlsRef = useRef(null);
  const [query, setQuery] = useState("");
  const [exitQrToken, setExitQrToken] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanStatus, setScanStatus] = useState("Camera off");
  const [gateId, setGateId] = useState("");
  const [gates, setGates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [waitingPayments, setWaitingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    void loadInitialData();

    return () => {
      stopQrCamera();
    };
  }, []);

  function stopQrCamera() {
    qrControlsRef.current?.stop();
    qrControlsRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanStatus("Camera off");
  }

  async function startQrCamera() {
    setCameraError("");
    setScanStatus("Opening camera...");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Khong mo duoc camera tren thiet bi nay.");
      setScanStatus("Camera unavailable");
      return;
    }
    if (!videoRef.current) {
      setCameraError("Khung camera chua san sang. Reload trang roi thu lai.");
      setScanStatus("Camera unavailable");
      return;
    }

    try {
      if (!qrReaderRef.current) {
        qrReaderRef.current = new BrowserQRCodeReader();
      }
      setCameraActive(true);
      setScanStatus("Camera on - scanning QR...");
      qrControlsRef.current = await qrReaderRef.current.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result) => {
          const value = result?.getText();
          if (value) {
            setExitQrToken(value);
            stopQrCamera();
            setScanStatus("QR detected - token filled");
          }
        }
      );
    } catch (err) {
      console.error("Cannot start QR camera", err);
      setCameraError("Khong mo duoc camera. Kiem tra quyen camera roi thu lai.");
      setScanStatus("Camera failed");
      stopQrCamera();
    }
  }

  async function scanQrImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCameraError("");
    setScanStatus("Reading QR image...");
    try {
      if (!qrReaderRef.current) {
        qrReaderRef.current = new BrowserQRCodeReader();
      }
      const imageUrl = URL.createObjectURL(file);
      const result = await qrReaderRef.current.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);
      const value = result?.getText();
      if (value) {
        setExitQrToken(value);
        setScanStatus("QR detected - token filled");
      } else {
        setCameraError("Khong doc duoc QR tu anh nay.");
        setScanStatus("QR image not readable");
      }
    } catch (err) {
      console.error("QR image scan failed", err);
      setCameraError("Khong doc duoc QR tu anh. Thu anh ro hon hoac QR lon hon.");
      setScanStatus("QR image not readable");
    } finally {
      event.target.value = "";
    }
  }

  async function loadInitialData() {
    setLoading(true);
    setError("");
    try {
      const [sessionRes, buildingRes] = await Promise.all([
        sessionApi.getSessions({ status: "ACTIVE" }),
        buildingApi.getAll(),
      ]);
      setSessions(unwrapApiData(sessionRes.data, []));
      const waitingRes = await sessionApi.getSessions({ status: "WAITING_PAYMENT" });
      setWaitingPayments(unwrapApiData(waitingRes.data, []));

      const buildings = unwrapApiData(buildingRes.data, []);
      const firstBuildingId = buildings[0]?.buildingId || buildings[0]?.id;
      if (firstBuildingId) {
        const gateRes = await gateApi.getActiveByBuilding(firstBuildingId);
        const exitGates = unwrapApiData(gateRes.data, []).filter((gate) =>
          ["EXIT", "BOTH"].includes(String(gate.gateType || "").toUpperCase())
        );
        setGates(exitGates);
        setGateId(String(exitGates[0]?.gateId || exitGates[0]?.id || ""));
      }
    } catch (err) {
      console.error("Failed to load exit data", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Tai khoan staff khong co quyen hoac phien dang nhap da het han. Dang nhap lai roi thu tiep.");
      } else {
        setError(err.response?.data?.message || "Khong tai duoc danh sach session/cong ra.");
      }
    } finally {
      setLoading(false);
    }
  }

  const activeSessions = useMemo(
    () => sessions.filter((item) => item.status === "ACTIVE"),
    [sessions]
  );

  const foundSession = useMemo(() => {
    if (!query.trim()) return null;
    const keyword = query.trim().toLowerCase();
    return (
      activeSessions.find(
        (item) =>
          String(item.licensePlate || "").toLowerCase().includes(keyword) ||
          String(item.sessionId || "").toLowerCase().includes(keyword)
      ) || null
    );
  }, [activeSessions, query]);

  const totalFee = foundSession ? computeSessionFee(foundSession.entryTime) : 0;

  const handleConfirmExit = async () => {
    if (!foundSession || !gateId) return;
    setProcessing(true);
    setError("");
    try {
      const exitRes = await sessionApi.exit(foundSession.sessionId, {
        gateId: Number(gateId),
        staffUserId: Number(localStorage.getItem("userId")) || null,
      });
      const exitedSession = unwrapApiData(exitRes.data, foundSession);

      setConfirmed({
        ...exitedSession,
        amount: computeSessionFee(exitedSession.entryTime || foundSession.entryTime),
        exitTime: exitedSession.exitTime || new Date().toISOString(),
      });
      setQuery("");
      await loadInitialData();
    } catch (err) {
      console.error("Confirm exit failed", err);
      setError(err.response?.data?.message || "Khong ghi nhan duoc xe ra.");
    } finally {
      setProcessing(false);
    }
  };

  const handleQrExit = async () => {
    if (!exitQrToken.trim() || !gateId) return;
    setProcessing(true);
    setError("");
    try {
      const exitRes = await sessionApi.exitByQr({
        qrToken: exitQrToken.trim(),
        gateId: Number(gateId),
        staffUserId: Number(localStorage.getItem("userId")) || null,
      });
      const exitedSession = unwrapApiData(exitRes.data, null);
      setConfirmed({
        ...exitedSession,
        amount: computeSessionFee(exitedSession?.entryTime),
        exitTime: exitedSession?.exitTime || new Date().toISOString(),
      });
      setExitQrToken("");
      setQuery("");
      await loadInitialData();
    } catch (err) {
      console.error("Exit QR scan failed", err);
      setError(err.response?.data?.message || "Exit QR khong hop le hoac khong ghi nhan duoc xe ra.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <StaffPageSection
          title="Vehicle Exit Processing"
          subtitle="Search an active backend session, record gate exit, then send it to Payments"
        >
          {!confirmed ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <QrCode size={16} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Exit QR Scan</p>
                    <p className="text-xs text-muted-foreground">
                      Scan with a handheld QR reader or paste the driver Exit QR token here.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <StaffInput
                    value={exitQrToken}
                    onChange={(event) => setExitQrToken(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleQrExit();
                      }
                    }}
                    placeholder="Scan or paste Exit QR token"
                  />
                  <StaffPrimaryButton
                    type="button"
                    onClick={() => void handleQrExit()}
                    disabled={processing || !exitQrToken.trim() || !gateId}
                    className="flex items-center justify-center gap-2"
                  >
                    <QrCode size={15} />
                    Scan Exit QR
                  </StaffPrimaryButton>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="relative aspect-video min-h-56 overflow-hidden rounded-2xl border border-border bg-background">
                    <video
                      ref={videoRef}
                      className={`h-full w-full object-contain ${cameraActive ? "opacity-100" : "opacity-0"}`}
                      muted
                      playsInline
                    />
                    {!cameraActive ? (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                        Camera QR preview
                      </div>
                    ) : null}
                    <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                      {scanStatus}
                    </div>
                    {cameraActive ? (
                      <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(2,6,23,0.22)]" />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <StaffSecondaryButton
                      type="button"
                      onClick={() => void startQrCamera()}
                      disabled={cameraActive}
                      className="flex items-center justify-center gap-2"
                    >
                      <Camera size={14} />
                      Open Camera
                    </StaffSecondaryButton>
                    <StaffSecondaryButton
                      type="button"
                      onClick={stopQrCamera}
                      disabled={!cameraActive}
                      className="flex items-center justify-center gap-2"
                    >
                      <StopCircle size={14} />
                      Stop
                    </StaffSecondaryButton>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted">
                      <QrCode size={14} />
                      Upload QR
                      <input type="file" accept="image/*" onChange={scanQrImage} className="hidden" />
                    </label>
                  </div>
                </div>
                {cameraError ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    {cameraError}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <StaffInput
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by license plate or session ID"
                />
                <StaffSelect value={gateId} onChange={(event) => setGateId(event.target.value)}>
                  <option value="">Select exit gate</option>
                  {gates.map((gate) => (
                    <option key={gate.gateId || gate.id} value={gate.gateId || gate.id}>
                      {gate.gateName || gate.gateCode || gate.name || `Gate ${gate.gateId || gate.id}`}
                    </option>
                  ))}
                </StaffSelect>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <StaffPrimaryButton type="button" className="flex items-center justify-center gap-2 sm:w-44">
                  <Search size={15} />
                  Search
                </StaffPrimaryButton>
                <StaffSecondaryButton type="button" onClick={loadInitialData} disabled={loading}>
                  Refresh
                </StaffSecondaryButton>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </div>
              ) : null}

              {!foundSession && query.trim() ? (
                <StaffEmptyState
                  title="No active session found"
                  description="Xe phai duoc Confirm Entry truoc, sau do moi tim thay o man hinh Exit."
                />
              ) : null}

              {foundSession ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Session #{foundSession.sessionId}</p>
                        <p className="mt-1 text-xl font-bold text-foreground">{foundSession.licensePlate}</p>
                        <p className="text-sm text-muted-foreground">
                          Slot {foundSession.slotCode} - entered {formatStaffDateTime(foundSession.entryTime)}
                        </p>
                      </div>
                      <StaffStatusBadge tone="emerald">active</StaffStatusBadge>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Entry Time</p>
                      <p className="mt-1 font-semibold text-foreground">
                        {formatStaffDateTime(foundSession.entryTime)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Current Fee</p>
                      <p className="mt-1 font-semibold text-foreground">{formatStaffCurrency(totalFee)}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Payment is handled in the Payments screen after exit is recorded.
                    </div>
                    <StaffPrimaryButton type="button" onClick={handleConfirmExit} disabled={processing || !gateId}>
                      {processing ? "Recording..." : "Record Exit & Send to Payment"}
                    </StaffPrimaryButton>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mx-auto max-w-md rounded-3xl border border-border bg-background p-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Exit Completed</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Exit was recorded. This session is now waiting for payment.
              </p>
              <div className="mt-5 space-y-2 rounded-2xl bg-muted/30 p-4 text-left">
                {[
                  ["Session", confirmed.sessionId],
                  ["Plate", confirmed.licensePlate],
                  ["Status", "WAITING_PAYMENT"],
                  ["Estimated Fee", formatStaffCurrency(confirmed.amount)],
                  ["Exit Time", formatStaffDateTime(confirmed.exitTime)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-3">
                <StaffSecondaryButton type="button" className="flex-1" onClick={() => setConfirmed(null)}>
                  Back
                </StaffSecondaryButton>
                <StaffPrimaryButton type="button" className="flex-1" onClick={() => setConfirmed(null)}>
                  Next Exit
                </StaffPrimaryButton>
                <StaffPrimaryButton type="button" className="flex-1" onClick={() => navigate("/staff/payments")}>
                  Open Payments
                </StaffPrimaryButton>
              </div>
            </div>
          )}
        </StaffPageSection>

        <StaffPageSection title="Waiting Payment Queue" subtitle="Sessions that already exited and now need payment processing">
          {waitingPayments.length === 0 ? (
            <StaffEmptyState
              title="No sessions waiting for payment"
              description="After Gate Exit records a vehicle out, it will appear here."
              tone="success"
            />
          ) : (
            <div className="space-y-3">
              {waitingPayments.map((item) => (
                <div key={item.sessionId} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Session #{item.sessionId}</p>
                      <p className="text-base font-semibold text-foreground">{item.licensePlate}</p>
                      <p className="text-sm text-muted-foreground">
                        Slot {item.slotCode} - exited {formatStaffDateTime(item.exitTime)}
                      </p>
                    </div>
                    <StaffStatusBadge tone="amber">waiting payment</StaffStatusBadge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatStaffCurrency(computeSessionFee(item.entryTime))}</span>
                    <StaffSecondaryButton type="button" onClick={() => navigate("/staff/payments")} className="flex items-center gap-2">
                      <CreditCard size={14} />
                      Open Payments
                    </StaffSecondaryButton>
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

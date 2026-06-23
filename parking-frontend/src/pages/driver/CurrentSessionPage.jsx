import { useEffect, useState } from "react";
import { AlertCircle, CreditCard, LoaderCircle, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { driverSessionApi } from "../../api/driver/sessionApi";
import { unwrapApiData } from "../../utils/api";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  getBookingStatus,
} from "./driverPortalUtils";

function shortToken(value) {
  if (!value) return "";
  if (value.length <= 28) return value;
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function isOpenBooking(item) {
  const status = String(item?.status || item?.bookingStatus || "").toUpperCase();
  const qrUsed = item?.qrUsed === true || Boolean(item?.qrUsedAt);
  const expiryValue = item?.expiredAt || item?.bookingEndTime;
  const expiresAt = expiryValue ? new Date(expiryValue).getTime() : null;
  const isExpired = Number.isFinite(expiresAt) && expiresAt < Date.now();
  return status === "PENDING_PAYMENT" || (status === "CONFIRMED" && !qrUsed && !isExpired);
}

function resolveSessionStart(item) {
  return item?.entryTime || item?.startTime || item?.checkInTime || item?.createdAt || item?.bookingStartTime;
}

function resolveSessionEnd(item) {
  return item?.exitTime || item?.endTime || item?.checkOutTime || null;
}

export default function CurrentSessionPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingExitQr, setGeneratingExitQr] = useState(false);
  const [exitQr, setExitQr] = useState(null);
  const [error, setError] = useState("");

  async function loadSession() {
    setLoading(true);
    setError("");
    setExitQr(null);
    try {
      const [sessionRes, bookingRes] = await Promise.all([
        driverSessionApi.getMySessions(),
        bookingApi.getMyBookings(),
      ]);
      const mySessions = unwrapApiData(sessionRes.data, []);
      const myBookings = unwrapApiData(bookingRes.data, []);
      const activeSession = mySessions.find((item) => String(item.status || "").toUpperCase() === "ACTIVE");
      if (activeSession) {
        setSession({ ...activeSession, source: "parking-session" });
        return;
      }
      const waitingPaymentSession = mySessions.find((item) => String(item.status || "").toUpperCase() === "WAITING_PAYMENT");
      if (waitingPaymentSession) {
        setSession({ ...waitingPaymentSession, source: "parking-session" });
        return;
      }
      const activeBooking = myBookings.find(isOpenBooking);
      if (activeBooking) {
        setSession({ ...activeBooking, source: "booking" });
        return;
      }
      setSession(null);
    } catch (loadError) {
      console.error("Failed to load current session", loadError);
      setSession(null);
      setError(loadError.response?.data?.message || "Khong tai duoc parking session hien tai.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession();
  }, []);

  async function handleCreateExitQr() {
    if (!session?.sessionId) return;

    setGeneratingExitQr(true);
    setError("");
    try {
      const res = await driverSessionApi.createExitQr(session.sessionId);
      setExitQr(unwrapApiData(res.data, null));
    } catch (qrError) {
      console.error("Failed to create exit QR", qrError);
      setError(qrError.response?.data?.message || "Khong tao duoc Exit QR cho session nay.");
    } finally {
      setGeneratingExitQr(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        Dang tai booking hien tai...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        No active parking session was returned from the backend.
      </div>
    );
  }

  const status = getBookingStatus(session);
  const isParkingSession = session.source === "parking-session" || Boolean(session.sessionId);
  const sessionStatus = String(session.status || "").toUpperCase();
  const isWaitingPayment = sessionStatus === "WAITING_PAYMENT";
  const isBookingOnly = session.source === "booking" && !session.sessionId;
  const headerLabel = isWaitingPayment ? "WAITING PAYMENT" : isParkingSession ? "ACTIVE SESSION" : "BOOKING";
  const badgeLabel = isWaitingPayment ? "Waiting payment" : isParkingSession ? "Active" : status;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rounded-2xl bg-gradient-to-r from-primary to-[#4338CA] p-7 text-white dark:to-[#312E81]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/60 text-xs mb-1">{headerLabel}</p>
            <h2 className="font-bold mb-1 text-[1.375rem]">
              {session.buildingName || session.parkingBuildingName || "Parking Building"}
            </h2>
            <p className="text-white/70 text-sm">
              {session.zoneName || "Zone"} - {session.slotCode || session.parkingSlotCode || "Slot"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs text-white dark:bg-white/10">
            <span className="size-1.5 bg-emerald-400 rounded-full animate-pulse" />
            {badgeLabel}
          </span>
        </div>
        <div className="text-center mb-6">
          <div className="text-5xl font-bold font-mono mb-1">
            {formatDuration(
              resolveSessionStart(session),
              resolveSessionEnd(session) || new Date().toISOString()
            )}
          </div>
          <p className="text-white/60 text-sm">Duration</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">Entry Time</p>
            <p className="font-semibold mt-0.5">
              {formatDateTime(resolveSessionStart(session))}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">Estimated Fee</p>
            <p className="font-semibold mt-0.5">
              {formatCurrency(session.amount || session.estimatedFee || session.totalAmount || 0)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">Rate</p>
            <p className="font-semibold mt-0.5">
              {session.rateLabel || "Live from backend"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Vehicle Info</h3>
          <div className="space-y-2">
            {[
              ["Plate", session.licensePlate || session.vehiclePlate || "Vehicle linked"],
              ["Status", getBookingStatus(session)],
              ["Start", formatDateTime(resolveSessionStart(session))],
              ["End", formatDateTime(resolveSessionEnd(session))],
            ].map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Slot Info</h3>
          <div className="space-y-2">
            {[
              ["Building", session.buildingName || session.parkingBuildingName || "Parking Building"],
              ["Floor", session.floorName || "Floor pending"],
              ["Zone", session.zoneName || "Zone pending"],
              ["Slot", session.slotCode || session.parkingSlotCode || "Slot pending"],
            ].map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center">
        <button
          type="button"
          onClick={() => navigate("/driver/parking-map")}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,0.28)] transition hover:bg-blue-500"
        >
          <Navigation size={16} />
          Open Parking Map
        </button>

        {isWaitingPayment ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Waiting for Payment</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Gate Exit has already recorded this vehicle out. Staff must finish the parking-fee payment before this session disappears.
            </p>
            <button
              type="button"
              onClick={() => navigate("/driver/payment-history")}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CreditCard size={14} />
              View Payments
            </button>
          </>
        ) : isParkingSession ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-4">Your Exit QR Code</p>
            {exitQr?.qrToken ? (
              <>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <QRCodeSVG value={exitQr.qrToken} size={240} level="H" includeMargin />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(exitQr.qrToken);
                  }}
                  className="mt-3 w-full rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted transition-colors text-left break-all"
                  title="Click to copy full token"
                >
                  {exitQr.qrToken}
                </button>
                <p className="text-xs text-muted-foreground mt-1">Click token to copy</p>
                <p className="text-xs text-muted-foreground mt-3">
                  Show this QR at Gate Exit. It expires at {formatDateTime(exitQr.expiresAt)}.
                </p>
              </>
            ) : (
              <>
                <p className="max-w-sm text-center text-xs text-muted-foreground">
                  Generate this QR when you are at the exit gate. Staff scans it to find your session automatically.
                </p>
                <button
                  type="button"
                  onClick={() => void handleCreateExitQr()}
                  disabled={generatingExitQr}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {generatingExitQr ? (
                    <>
                      <LoaderCircle size={14} className="mr-2 animate-spin" />
                      Generating
                    </>
                  ) : (
                    "Generate Exit QR"
                  )}
                </button>
              </>
            )}
          </>
        ) : isBookingOnly ? (
          <>
            {session.qrToken ? (
              <>
                <p className="text-sm font-semibold text-foreground mb-4">Entry QR Code</p>
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <QRCodeSVG value={session.qrToken} size={240} level="H" includeMargin />
                </div>
                <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                  {shortToken(session.qrToken)}
                </div>
                <p className="max-w-sm text-center text-xs text-muted-foreground mt-3">
                  Show this QR at Gate Entry. Exit QR appears here after staff scans Entry and the session becomes ACTIVE.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground mb-2">Exit QR Not Ready</p>
                <p className="max-w-sm text-center text-xs text-muted-foreground">
                  This is still a booking, not an active parking session. Pay/confirm the booking and let staff scan Entry first; then the Exit QR button will appear here.
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Exit QR Not Available</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Exit QR is only available while the parking session is ACTIVE.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { AlertCircle, LoaderCircle, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { paymentApi } from "../../api/driver/paymentApi";
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

export default function CurrentSessionPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  async function loadSession() {
    setLoading(true);
    setError("");
    try {
      const res = await bookingApi.getMyBookings();
      const bookings = unwrapApiData(res.data, []);
      const active = bookings.find((item) => {
        const status = getBookingStatus(item);
        return (
          status.includes("pending") ||
          status.includes("confirmed") ||
          status.includes("checked_in") ||
          status.includes("active")
        );
      });
      setSession(active || null);
    } catch (loadError) {
      console.error("Failed to load current session", loadError);
      setSession(null);
      setError(loadError.response?.data?.message || "Khong tai duoc booking hien tai.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  async function handlePayDeposit() {
    if (!session?.bookingId) return;

    setPaying(true);
    setError("");
    try {
      const createRes = await paymentApi.createDeposit({
        bookingId: session.bookingId,
        depositAmount: session.depositAmount ?? 0,
        paymentMethod: "CASH",
      });

      const payment = unwrapApiData(createRes.data, null);
      if (payment?.paymentId) {
        await paymentApi.confirmDeposit(payment.paymentId);
      }

      await loadSession();
    } catch (paymentError) {
      console.error("Failed to pay deposit", paymentError);
      setError(paymentError.response?.data?.message || "Khong thanh toan duoc deposit cho booking nay.");
    } finally {
      setPaying(false);
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
  const isPendingPayment = status === "pending_payment" || status.includes("pending");
  const hasEntryQr = Boolean(session.qrToken);

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
            <p className="text-white/60 text-xs mb-1">ACTIVE SESSION</p>
            <h2 className="font-bold mb-1 text-[1.375rem]">
              {session.buildingName || session.parkingBuildingName || "Parking Building"}
            </h2>
            <p className="text-white/70 text-sm">
              {session.zoneName || "Zone"} - {session.slotCode || session.parkingSlotCode || "Slot"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs text-white dark:bg-white/10">
            <span className="size-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Active
          </span>
        </div>
        <div className="text-center mb-6">
          <div className="text-5xl font-bold font-mono mb-1">
            {formatDuration(
              session.startTime || session.createdAt || session.checkInTime,
              session.endTime || session.checkOutTime || new Date().toISOString()
            )}
          </div>
          <p className="text-white/60 text-sm">Duration</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 p-3 dark:bg-white/5">
            <p className="text-white/60 text-xs">Entry Time</p>
            <p className="font-semibold mt-0.5">
              {formatDateTime(session.startTime || session.checkInTime || session.createdAt)}
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
              ["Start", formatDateTime(session.startTime || session.createdAt || session.checkInTime)],
              ["End", formatDateTime(session.endTime || session.checkOutTime)],
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
          Navigate to Slot
        </button>

        {hasEntryQr ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-4">Your Entry QR Code</p>
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={session.qrToken} size={156} level="M" includeMargin={false} />
            </div>
            <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
              {shortToken(session.qrToken)}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Show this QR at the entry gate. It works after deposit payment is confirmed.
            </p>
          </>
        ) : isPendingPayment ? (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">Deposit Required</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Booking da tao nhung chua co QR. Thanh toan deposit de backend tao Entry QR.
            </p>
            <button
              type="button"
              onClick={() => void handlePayDeposit()}
              disabled={paying}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {paying ? (
                <>
                  <LoaderCircle size={14} className="mr-2 animate-spin" />
                  Processing
                </>
              ) : (
                `Pay Deposit (${formatCurrency(session.depositAmount || 0)})`
              )}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground mb-2">QR Not Available</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Backend chua tra ve QR cho booking/status hien tai.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

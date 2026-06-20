import { useEffect, useState } from "react";
import { AlertCircle, Clock3, LoaderCircle, MapPin, QrCode, ReceiptText } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { bookingApi } from "../../api/driver/bookingApi";
import { paymentApi } from "../../api/driver/paymentApi";
import { unwrapApiData } from "../../utils/api";
import {
  formatDateTime,
  getBookingStatus,
  getStatusClasses,
} from "./driverPortalUtils";

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase ${getStatusClasses(
        status
      )}`}
    >
      {String(status || "pending")}
    </span>
  );
}

function shortToken(value) {
  if (!value) return "";
  if (value.length <= 28) return value;
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingBookingId, setProcessingBookingId] = useState(null);

  async function loadBookings() {
    setLoading(true);
    setError("");
    try {
      const res = await bookingApi.getMyBookings();
      setBookings(unwrapApiData(res.data, []));
    } catch (loadError) {
      console.error("Failed to load booking history", loadError);
      setBookings([]);
      setError("Khong tai duoc booking history tu backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadBookingsSafe() {
      await loadBookings();
    }

    if (!cancelled) {
      void loadBookingsSafe();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePayDeposit(booking) {
    try {
      setProcessingBookingId(booking.bookingId);
      setError("");
      const createRes = await paymentApi.createDeposit({
        bookingId: booking.bookingId,
        depositAmount: booking.depositAmount ?? 0,
        paymentMethod: "CASH",
      });

      const payment = unwrapApiData(createRes.data, null);
      if (payment?.paymentId) {
        await paymentApi.confirmDeposit(payment.paymentId);
      }

      await loadBookings();
    } catch (paymentError) {
      console.error("Failed to pay deposit", paymentError);
      setError(
        paymentError.response?.data?.message || "Khong the thanh toan deposit cho booking nay."
      );
    } finally {
      setProcessingBookingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-border bg-card px-6 py-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Driver Portal
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Booking History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Xem cac booking da tao tu backend that, bao gom slot, thoi gian va trang thai.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">All Driver Bookings</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? "Loading..." : `${bookings.length} booking(s) returned from backend`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">
            Dang tai booking history...
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">
            Backend chua tra ve booking nao cho tai khoan nay.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {bookings.map((item, index) => (
              <div
                key={item.bookingId || item.id || index}
                className="grid gap-4 px-5 py-4 lg:grid-cols-[1.15fr_0.8fr_0.8fr_0.85fr]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <ReceiptText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        Booking #{item.bookingId}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.licensePlate || "Vehicle"} - {item.slotCode || "Slot"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin size={14} />
                    <span>Slot</span>
                  </div>
                  <p className="font-medium text-foreground">{item.slotCode || "--"}</p>
                  <p className="text-xs text-muted-foreground">
                    Deposit: {item.depositAmount ?? 0}
                  </p>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock3 size={14} />
                    <span>Schedule</span>
                  </div>
                  <p className="font-medium text-foreground">
                    {formatDateTime(item.bookingStartTime)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    to {formatDateTime(item.bookingEndTime)}
                  </p>
                </div>

                <div className="space-y-2 text-sm lg:text-right">
                  <StatusBadge status={getBookingStatus(item)} />
                  <p className="text-xs text-muted-foreground">
                    Created {formatDateTime(item.createdAt)}
                  </p>
                  {String(item.status || "").toUpperCase() === "PENDING_PAYMENT" ? (
                    <button
                      onClick={() => void handlePayDeposit(item)}
                      disabled={processingBookingId === item.bookingId}
                      className="inline-flex items-center justify-center rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {processingBookingId === item.bookingId ? (
                        <>
                          <LoaderCircle size={12} className="mr-1 animate-spin" />
                          Processing
                        </>
                      ) : (
                        "Pay Deposit"
                      )}
                    </button>
                  ) : null}
                </div>

                {item.qrToken ? (
                  <div className="rounded-2xl border border-border bg-background p-4 lg:col-span-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex size-36 shrink-0 items-center justify-center rounded-2xl bg-white p-3">
                        <QRCodeSVG value={item.qrToken} size={120} level="M" includeMargin={false} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <QrCode size={16} />
                          Entry QR
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Show this QR at the entry gate after deposit is paid.
                        </p>
                        <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                          {shortToken(item.qrToken)}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Issued {formatDateTime(item.qrIssuedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { bookingApi } from "../../api/driver/bookingApi";
import { unwrapApiData } from "../../utils/api";
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  getBookingStatus,
} from "./driverPortalUtils";

function QRCodeMock({ value }) {
  const grid = Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => ((row * 3 + col * 7 + row * col) % 3) === 0)
  );

  return (
    <div className="p-3 bg-white inline-block rounded-xl border border-border">
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: "repeat(10, 1fr)", width: 100 }}
      >
        {grid.flat().map((filled, index) => (
          <div
            key={index}
            className={filled ? "bg-slate-800 aspect-square" : "bg-white aspect-square"}
            style={{ width: 9, height: 9 }}
          />
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground text-center mt-1 font-mono">{value}</p>
    </div>
  );
}

export default function CurrentSessionPage() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await bookingApi.getMyBookings();
        const bookings = unwrapApiData(res.data, []);
        const active = bookings.find((item) => {
          const status = getBookingStatus(item);
          return (
            status.includes("active") ||
            status.includes("confirmed") ||
            status.includes("pending")
          );
        });
        setSession(active || null);
      } catch (error) {
        console.error("Failed to load current session", error);
        setSession(null);
      }
    }

    void loadSession();
  }, []);

  if (!session) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        No active parking session was returned from the backend.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-gradient-to-r from-primary to-[#4338CA] rounded-2xl p-7 text-white">
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
          <span className="flex items-center gap-1.5 bg-white/20 text-white text-xs px-2.5 py-1 rounded-full">
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
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">Entry Time</p>
            <p className="font-semibold mt-0.5">
              {formatDateTime(session.startTime || session.checkInTime || session.createdAt)}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs">Estimated Fee</p>
            <p className="font-semibold mt-0.5">
              {formatCurrency(session.amount || session.estimatedFee || session.totalAmount || 0)}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
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
        <p className="text-sm font-semibold text-foreground mb-4">Your Exit QR Code</p>
        <QRCodeMock value={`SES-${session.bookingId || session.id || "LIVE"}`} />
        <p className="text-xs text-muted-foreground mt-3">
          Scan at exit gate to finalize session and process payment.
        </p>
      </div>
    </div>
  );
}

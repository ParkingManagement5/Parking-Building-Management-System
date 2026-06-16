import { useEffect, useMemo, useState } from "react";
import { MapPin, SquareParking } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { unwrapApiData } from "../../utils/api";
import { getStatusClasses } from "./driverPortalUtils";

export default function DriverParkingSlotPage() {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await axiosClient.get("/slots/available?vehicleTypeId=1");
        setSlots(unwrapApiData(res.data, []));
      } catch (error) {
        console.error("Load slots failed:", error);
        setSlots([]);
      }
    }

    void loadSlots();
  }, []);

  const summary = useMemo(() => {
    const buildingCount = new Set(
      slots.map((item) => item.zone?.floor?.building?.name).filter(Boolean)
    ).size;

    return {
      total: slots.length,
      buildings: buildingCount,
    };
  }, [slots]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="size-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 mb-3">
            <SquareParking size={16} />
          </div>
          <div className="text-2xl font-bold text-foreground">{summary.total}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Available slots</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="size-9 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 mb-3">
            <MapPin size={16} />
          </div>
          <div className="text-2xl font-bold text-foreground">{summary.buildings}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Buildings with availability</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Building
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Floor
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Zone
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Slot Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Vehicle Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slots.map((item) => (
                <tr
                  key={item.id || item.slotId}
                  className="transition-colors hover:bg-muted/20"
                >
                  <td className="px-5 py-3.5 text-sm text-foreground">
                    {item.zone?.floor?.building?.name || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {item.zone?.floor?.name || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {item.zone?.name || "-"}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm font-medium text-foreground">
                    {item.slotCode || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {item.zone?.vehicleType?.name || "-"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClasses(
                        item.status || "available"
                      )}`}
                    >
                      {item.status || "AVAILABLE"}
                    </span>
                  </td>
                </tr>
              ))}
              {slots.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No available slots returned from the backend.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

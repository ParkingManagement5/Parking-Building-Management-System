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

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Building</th>
              <th>Floor</th>
              <th>Zone</th>
              <th>Slot Code</th>
              <th>Vehicle Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((item) => (
              <tr key={item.id || item.slotId}>
                <td>{item.zone?.floor?.building?.name || "-"}</td>
                <td>{item.zone?.floor?.name || "-"}</td>
                <td>{item.zone?.name || "-"}</td>
                <td>{item.slotCode || "-"}</td>
                <td>{item.zone?.vehicleType?.name || "-"}</td>
                <td>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(
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
                <td colSpan="6">No available slots returned from the backend.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

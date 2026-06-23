import { useEffect, useMemo, useState } from "react";
import { MapPin, SquareParking } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import { driverVehicleApi } from "../../api/driver/driverVehicleApi";
import { unwrapApiData } from "../../utils/api";
import { getStatusClasses } from "./driverPortalUtils";

export default function DriverParkingSlotPage() {
  const [slots, setSlots] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVehicles() {
      try {
        const res = await driverVehicleApi.getMyVehicles();
        const items = unwrapApiData(res.data, []);
        setVehicles(items);
        setSelectedVehicleId(String(items[0]?.id || items[0]?.vehicleId || ""));
      } catch (error) {
        console.error("Load vehicles failed:", error);
        setVehicles([]);
        setError("Could not load your vehicles.");
      }
    }

    void loadVehicles();
  }, []);

  useEffect(() => {
    async function loadSlots() {
      const selectedVehicle = vehicles.find((item) => String(item.id || item.vehicleId) === String(selectedVehicleId));
      const vehicleTypeId =
        selectedVehicle?.vehicleType?.vehicleTypeId ??
        selectedVehicle?.vehicleType?.id ??
        selectedVehicle?.vehicleTypeId;

      if (!vehicleTypeId) {
        setSlots([]);
        return;
      }

      try {
        const res = await axiosClient.get("/slots/available", {
          params: { vehicleTypeId },
        });
        setSlots(unwrapApiData(res.data, []));
        setError("");
      } catch (error) {
        console.error("Load slots failed:", error);
        setSlots([]);
        setError("Could not load available slots for the selected vehicle.");
      }
    }

    void loadSlots();
  }, [vehicles, selectedVehicleId]);

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
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_260px] md:items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground">Available Parking Slots</h2>
            <p className="text-sm text-muted-foreground">
              Slots are filtered by the selected vehicle type.
            </p>
          </div>
          <select
            value={selectedVehicleId}
            onChange={(event) => setSelectedVehicleId(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id || vehicle.vehicleId} value={vehicle.id || vehicle.vehicleId}>
                {vehicle.licensePlate} - {vehicle.vehicleType?.name || vehicle.vehicleTypeName || "Vehicle"}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
      </div>

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

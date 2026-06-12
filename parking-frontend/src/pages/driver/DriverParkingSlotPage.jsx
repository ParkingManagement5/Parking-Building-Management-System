import { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";

export default function DriverParkingSlotPage() {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const loadSlots = async () => {
      try {
        const res = await axiosClient.get("/slots/available?vehicleTypeId=1");
        setSlots(res.data?.data || res.data || []);
      } catch (error) {
        console.error("Load slots failed:", error);
      }
    };

    loadSlots();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Parking Slots</h1>
          <p>View available parking slots</p>
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
                <td>{item.zone?.floor?.floorName || "-"}</td>
                <td>{item.zone?.zoneName || "-"}</td>
                <td>{item.slotCode}</td>
                <td>{item.zone?.vehicleType?.name || "-"}</td>
                <td>
                  <span className="badge success">
                    {item.status || "AVAILABLE"}
                  </span>
                </td>
              </tr>
            ))}

            {slots.length === 0 && (
              <tr>
                <td colSpan="6">No available slots</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
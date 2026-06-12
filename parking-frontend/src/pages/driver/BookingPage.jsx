import { useState } from "react";

export default function BookingPage() {
  const [form, setForm] = useState({
    vehicleId: "",
    slotId: "",
    startTime: "",
    endTime: "",
  });

  const [booking, setBooking] = useState(null);

  const vehicles = [
    { vehicleId: 1, licensePlate: "51A-12345" },
    { vehicleId: 2, licensePlate: "59B1-88888" },
  ];

  const slots = [
    { slotId: 1, slotCode: "A-001", status: "Available" },
    { slotId: 2, slotCode: "A-002", status: "Available" },
  ];

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleBooking = (e) => {
    e.preventDefault();

    if (!form.vehicleId || !form.slotId || !form.startTime || !form.endTime) {
      alert("Please fill all required fields");
      return;
    }

    setBooking({
      bookingId: Date.now(),
      bookingCode: "BK" + Date.now(),
      qrCode: "QR-" + Date.now(),
      status: "Reserved",
      ...form,
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Booking</h1>
          <p>Reserve a parking slot</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-card">
          <h3>Create Booking</h3>

          <form onSubmit={handleBooking}>
            <div className="form-group">
              <label>Vehicle</label>
              <select
                name="vehicleId"
                value={form.vehicleId}
                onChange={handleChange}
              >
                <option value="">Select vehicle</option>
                {vehicles.map((item) => (
                  <option key={item.vehicleId} value={item.vehicleId}>
                    {item.licensePlate}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Parking Slot</label>
              <select
                name="slotId"
                value={form.slotId}
                onChange={handleChange}
              >
                <option value="">Select slot</option>
                {slots.map((item) => (
                  <option key={item.slotId} value={item.slotId}>
                    {item.slotCode}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <input
                type="datetime-local"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input
                type="datetime-local"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
              />
            </div>

            <button className="primary-btn" type="submit">
              Create Booking
            </button>
          </form>
        </div>

        {booking && (
          <div className="form-card">
            <h3>Booking Created</h3>
            <p>
              <strong>Booking Code:</strong> {booking.bookingCode}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span className="badge success">{booking.status}</span>
            </p>
            <p>
              <strong>QR Code:</strong> {booking.qrCode}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

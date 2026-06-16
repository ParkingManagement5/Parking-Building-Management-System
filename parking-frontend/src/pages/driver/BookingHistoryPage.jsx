export default function BookingHistoryPage() {
  const bookings = [
    {
      bookingId: 1,
      bookingCode: "BK1001",
      licensePlate: "51A-12345",
      slotCode: "A-001",
      startTime: "2026-06-06 08:00",
      endTime: "2026-06-06 12:00",
      status: "Completed",
    },
    {
      bookingId: 2,
      bookingCode: "BK1002",
      licensePlate: "59B1-88888",
      slotCode: "B-002",
      startTime: "2026-06-07 09:00",
      endTime: "2026-06-07 11:00",
      status: "Reserved",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Booking History</h1>
          <p>View your parking booking history</p>
        </div>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Booking Code</th>
              <th>License Plate</th>
              <th>Slot</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {bookings.map((item) => (
              <tr key={item.bookingId}>
                <td>{item.bookingId}</td>
                <td>{item.bookingCode}</td>
                <td>{item.licensePlate}</td>
                <td>{item.slotCode}</td>
                <td>{item.startTime}</td>
                <td>{item.endTime}</td>
                <td>
                  <span
                    className={`badge ${
                      item.status === "Completed" ? "success" : "info"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
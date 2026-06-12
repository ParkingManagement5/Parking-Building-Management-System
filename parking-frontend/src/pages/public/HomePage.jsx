export default function HomePage() {
  return (
    <div>
      <section className="public-hero">
        <div>
          <h1>Smart Parking Building Management System</h1>
          <p>
            Find parking slots, make bookings, manage vehicles and track parking
            sessions easily.
          </p>

          <div className="hero-actions">
            <a href="/public-slots" className="primary-btn">
              View Parking Slots
            </a>
            <a href="/login" className="secondary-btn">
              Login
            </a>
          </div>
        </div>
      </section>

      <section className="public-section">
        <h2>Core Services</h2>

        <div className="service-grid">
          <div className="service-card">
            <h3>Slot Availability</h3>
            <p>View available parking slots by building, floor and zone.</p>
          </div>

          <div className="service-card">
            <h3>Online Booking</h3>
            <p>Reserve parking slots and receive QR code for entry.</p>
          </div>

          <div className="service-card">
            <h3>Fast Check-in</h3>
            <p>Use QR verification and OCR license plate recognition.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Smart Parking Building Management System</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Find parking slots, make bookings, manage vehicles and track parking sessions easily.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/parking-info" className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
              View Parking Buildings
            </a>
            <a href="/login" className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:bg-muted">
              Sign in
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Core Services</h2>
          <p className="mt-1 text-sm text-muted-foreground">Core public capabilities currently exposed by the platform.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">Slot Availability</h3>
            <p className="mt-2 text-sm text-muted-foreground">View available parking slots by building, floor and zone.</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">Online Booking</h3>
            <p className="mt-2 text-sm text-muted-foreground">Reserve parking slots and receive QR code for entry.</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h3 className="text-lg font-semibold text-foreground">Fast Check-in</h3>
            <p className="mt-2 text-sm text-muted-foreground">Use QR verification and OCR license plate recognition.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

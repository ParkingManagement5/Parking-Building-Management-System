export default function DashboardPage() {
  const stats = [
    {
      title: "Total Slots",
      value: "120",
      description: "Total parking slots",
    },
    {
      title: "Available Slots",
      value: "85",
      description: "Ready for booking",
    },
    {
      title: "Occupied Slots",
      value: "35",
      description: "Currently in use",
    },
    {
      title: "Today Revenue",
      value: "2,500,000đ",
      description: "Total payment today",
    },
  ];

  const activities = [
    "Vehicle 51A-12345 checked in at Gate A",
    "Booking #BK1023 was created",
    "Vehicle 59B-88888 checked out",
    "Payment #PM2041 completed",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Parking Building Management System overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div className="rounded-3xl border border-border bg-card p-5" key={item.title}>
            <h3 className="text-sm font-medium text-muted-foreground">{item.title}</h3>
            <p className="mt-2 text-3xl font-bold text-foreground">{item.value}</p>
            <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold text-foreground">Parking Status</h3>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <strong className="text-foreground">70%</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: "70%" }}></div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Occupied</span>
              <strong className="text-foreground">30%</strong>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-rose-500" style={{ width: "30%" }}></div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          <h3 className="text-lg font-semibold text-foreground">Recent Activities</h3>

          <ul className="mt-5 space-y-3">
            {activities.map((item, index) => (
              <li key={index} className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function VehiclePage() {
  const vehicles = [
    {
      id: 1,
      owner: "Customer User",
      type: "Car",
      licensePlate: "51A-12345",
      status: "Active",
    },
    {
      id: 2,
      owner: "Customer User",
      type: "Motorbike",
      licensePlate: "59B1-88888",
      status: "Active",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vehicle Management</h1>
          <p>Manage customer vehicles</p>
        </div>
        <button className="primary-btn">+ Add Vehicle</button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">ID</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Owner</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Vehicle Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">License Plate</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {vehicles.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-5 py-3.5 text-sm text-foreground">{item.id}</td>
                  <td className="px-5 py-3.5 text-sm text-foreground">{item.owner}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{item.type}</td>
                  <td className="px-5 py-3.5 font-mono text-sm font-medium text-foreground">
                    {item.licensePlate}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/15">
                        View
                      </button>
                      <button className="rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/15">
                        Edit
                      </button>
                      <button className="rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-300">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

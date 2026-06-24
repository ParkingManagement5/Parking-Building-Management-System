import { Clock } from "lucide-react";

export default function ActivityLogPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">View system audit logs and user activities</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Clock className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-bold text-foreground">Coming soon</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Activity log backend is under development. This page will display system audit logs when the API is ready.
        </p>
      </div>
    </div>
  );
}

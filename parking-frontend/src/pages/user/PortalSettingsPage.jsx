import { Bell, Lock, Settings, Shield } from "lucide-react";

export default function PortalSettingsPage({ portal = "portal" }) {
  return (
    <div className="max-w-3xl space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Settings size={18} />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Portal Settings</h2>
            <p className="text-sm text-muted-foreground capitalize">
              Preferences for the {portal} portal. Backend actions can be connected later.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-muted/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Bell size={16} />
              <span className="font-medium text-sm">Notifications</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Control alerts, reminders and activity updates.
            </p>
            <label className="flex items-center justify-between text-sm">
              <span>Email notifications</span>
              <input type="checkbox" defaultChecked />
            </label>
          </div>

          <div className="bg-muted/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Shield size={16} />
              <span className="font-medium text-sm">Privacy</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              UI scaffold for future profile visibility and privacy rules.
            </p>
            <label className="flex items-center justify-between text-sm">
              <span>Hide personal email</span>
              <input type="checkbox" />
            </label>
          </div>

          <div className="bg-muted/40 rounded-2xl p-4 md:col-span-2">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Lock size={16} />
              <span className="font-medium text-sm">Security</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Password reset and advanced account security can be connected to backend later.
            </p>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              Open Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

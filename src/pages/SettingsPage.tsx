import { Card } from "../components/ui";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Settings</div>
        <div className="mt-1 text-sm text-slate-300">Workspace & app settings (stub).</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">General</div>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              Project: <span className="text-slate-100">rapidcallai</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              Region: <span className="text-slate-100">auto</span>
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Security</div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            Demo auth is local-only right now. If you want real login/register, I’ll add server auth + JWT.
          </div>
        </Card>
      </div>
    </div>
  );
}



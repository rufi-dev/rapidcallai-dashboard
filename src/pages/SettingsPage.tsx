import { useEffect, useState } from "react";
import { Card } from "../components/ui";
import { getMe } from "../lib/api";

export function SettingsPage() {
  const [workspaceName, setWorkspaceName] = useState<string>("Workspace");
  useEffect(() => {
    let mounted = true;
    getMe()
      .then((m) => {
        if (!mounted) return;
        setWorkspaceName(m.workspace?.name || "Workspace");
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold tracking-tight">Settings</div>
        <div className="mt-1 text-sm text-slate-300">Workspace & app settings.</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold">General</div>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              Workspace: <span className="text-slate-100">{workspaceName}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              Region: <span className="text-slate-100">auto</span>
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold">Security</div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            Login sessions are stored on the server (Postgres) and every request is scoped to your workspace.
          </div>
        </Card>
      </div>
    </div>
  );
}



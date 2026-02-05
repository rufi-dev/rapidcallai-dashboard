import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button, Card } from "../components/ui";
import {
  listAgents,
  listOutboundJobs,
  createOutboundJob,
  cancelOutboundJob,
  dncOutboundJob,
  listOutboundJobLogs,
  type AgentProfile,
  type OutboundJob,
  type OutboundJobLog,
} from "../lib/api";
import { GlowSpinner } from "../components/loading";

function fmtTs(ms: number | null | undefined): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export function OutboundCallsPage() {
  const nav = useNavigate();
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [jobs, setJobs] = useState<OutboundJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<OutboundJobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [agentId, setAgentId] = useState("");
  const [leadName, setLeadName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [campaign, setCampaign] = useState("");
  const [timezone, setTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const [recordingEnabled, setRecordingEnabled] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [a, j] = await Promise.all([listAgents(), listOutboundJobs({ limit: 200 })]);
      setAgents(a);
      setJobs(j);
      if (!agentId && a.length) setAgentId(a[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load outbound jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setLogs([]);
      return;
    }
    setLogsLoading(true);
    listOutboundJobLogs(selectedId)
      .then((rows) => setLogs(rows))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }, [selectedId]);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedId) ?? null, [jobs, selectedId]);

  return (
    <div className={selectedId ? "grid gap-6 xl:grid-cols-[1fr_520px] items-start" : "space-y-6"}>
      <div className="space-y-6">
        <Card className="p-5 space-y-4">
          <div className="text-lg font-semibold">Outbound calls</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-slate-400">Agent</div>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Phone (E.164)</div>
              <input
                value={phoneE164}
                onChange={(e) => setPhoneE164(e.target.value)}
                placeholder="+447700900123"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Lead name</div>
              <input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Campaign</div>
              <input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="spring-hiring"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Timezone</div>
              <input
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Europe/London"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={recordingEnabled}
                  onChange={(e) => setRecordingEnabled(e.target.checked)}
                />
                Enable recording
              </label>
            </div>
          </div>
          <div>
            <Button
              onClick={async () => {
                if (!agentId || !phoneE164.trim()) return;
                try {
                  setBusy(true);
                  const job = await createOutboundJob({
                    agentId,
                    leadName: leadName.trim(),
                    phoneE164: phoneE164.trim(),
                    timezone: timezone.trim() || "UTC",
                    recordingEnabled,
                    metadata: campaign.trim() ? { campaign: campaign.trim() } : {},
                  });
                  setJobs((prev) => [job, ...prev]);
                  setLeadName("");
                  setPhoneE164("");
                  toast.success("Job queued");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed to create job");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || !agentId || !phoneE164.trim()}
            >
              {busy ? "Queuing…" : "Queue outbound call"}
            </Button>
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-white/10 px-5 py-4 text-sm font-semibold">Jobs</div>
          <div className="p-4">
            {loading ? (
              <GlowSpinner label="Loading jobs…" />
            ) : jobs.length === 0 ? (
              <div className="text-sm text-slate-300">No outbound jobs yet.</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr>
                      <th className="px-2 py-2 text-left">Created</th>
                      <th className="px-2 py-2 text-left">Lead</th>
                      <th className="px-2 py-2 text-left">Phone</th>
                      <th className="px-2 py-2 text-left">Status</th>
                      <th className="px-2 py-2 text-left">Attempts</th>
                      <th className="px-2 py-2 text-left">Next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr
                        key={j.id}
                        className="border-b border-white/5 last:border-b-0 hover:bg-white/5 cursor-pointer"
                        onClick={() => setSelectedId(j.id)}
                      >
                        <td className="px-2 py-2 text-xs text-slate-400">{fmtTs(j.createdAt)}</td>
                        <td className="px-2 py-2 text-slate-100">{j.leadName || "—"}</td>
                        <td className="px-2 py-2 text-slate-300">{j.phoneE164}</td>
                        <td className="px-2 py-2 text-slate-200">{j.status}</td>
                        <td className="px-2 py-2 text-slate-300">
                          {j.attempts}/{j.maxAttempts}
                        </td>
                        <td className="px-2 py-2 text-slate-400">{fmtTs(j.nextAttemptAt ?? null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {selectedJob ? (
        <aside className="sticky top-[84px] h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Job</div>
            <button
              onClick={() => setSelectedId(null)}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              Close
            </button>
          </div>
          <div className="mt-4 flex-1 min-h-0 overflow-auto scrollbar-brand pr-1 space-y-4">
            <div className="rounded-3xl bg-slate-950/35 p-4 text-sm space-y-2">
              <div className="text-xs text-slate-400 font-mono">{selectedJob.id}</div>
              <div className="text-slate-100">{selectedJob.leadName || "Unnamed lead"}</div>
              <div className="text-slate-300">{selectedJob.phoneE164}</div>
              <div className="text-xs text-slate-400">Status: {selectedJob.status}</div>
              {selectedJob.lastError ? <div className="text-xs text-rose-300">{selectedJob.lastError}</div> : null}
              {selectedJob.callId ? (
                <div className="pt-2">
                  <Button variant="secondary" onClick={() => nav(`/app/call/${encodeURIComponent(selectedJob.callId!)}`)}>
                    Open call
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const next = await cancelOutboundJob(selectedJob.id);
                    setJobs((prev) => prev.map((j) => (j.id === next.id ? next : j)));
                    setSelectedId(next.id);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to cancel");
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const next = await dncOutboundJob(selectedJob.id, "User requested DNC");
                    setJobs((prev) => prev.map((j) => (j.id === next.id ? next : j)));
                    setSelectedId(next.id);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to set DNC");
                  }
                }}
              >
                DNC
              </Button>
            </div>
            <div className="rounded-3xl bg-slate-950/35 p-4">
              <div className="text-sm font-semibold">Logs</div>
              <div className="mt-3 space-y-2 text-sm">
                {logsLoading ? (
                  <GlowSpinner label="Loading logs…" />
                ) : logs.length === 0 ? (
                  <div className="text-slate-300">No logs yet.</div>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-2">
                      <div className="text-xs text-slate-400">{fmtTs(l.createdAt)}</div>
                      <div className="text-slate-200">{l.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

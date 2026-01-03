import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, Button } from "../components/ui";
import { getCall, type CallRecord } from "../lib/api";

function fmtTs(ms: number | null): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CallDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const callId = id ?? "";

  const [call, setCall] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getCall(callId);
        if (!mounted) return;
        setCall(c);
      } catch (e) {
        toast.error(`Failed to load call: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [callId]);

  const recordingUrl = useMemo(() => {
    if (!call?.recording || !("url" in call.recording)) return null;
    const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";
    return `${base}${call.recording.url}`;
  }, [call?.recording]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Call</div>
          <div className="mt-1 text-xs font-mono text-slate-400">{callId}</div>
        </div>
        <Button variant="secondary" onClick={() => nav("/app/calls")}>
          Back
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-sm text-slate-300">Loading…</div>
        ) : !call ? (
          <div className="p-6 text-sm text-slate-300">Not found.</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <div className="text-xs text-slate-400">Agent</div>
                <div className="text-slate-100">{call.agentName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">To</div>
                <div className="text-slate-100">{call.to}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Duration</div>
                <div className="text-slate-100">{formatDuration(call.durationSec)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Outcome</div>
                <div className="text-slate-100">{call.outcome}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Cost</div>
                <div className="text-slate-100">
                  {typeof call.costUsd === "number" ? `$${call.costUsd.toFixed(2)}` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Started</div>
                <div className="text-slate-100">{fmtTs(call.startedAt)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Ended</div>
                <div className="text-slate-100">{fmtTs(call.endedAt)}</div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="text-xs text-slate-400">Room</div>
                <div className="text-slate-100 font-mono text-xs">{call.roomName}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold">Recording</div>
              <div className="mt-2">
                {call.recording && "kind" in call.recording && call.recording.kind === "egress_s3" ? (
                  call.recording.status === "ready" && recordingUrl ? (
                    <audio controls src={recordingUrl} className="w-full" />
                  ) : (
                    <div className="text-sm text-slate-300">
                      Recording is <span className="text-slate-100">{call.recording.status}</span>…
                      <div className="mt-2">
                        <Button variant="secondary" onClick={() => window.location.reload()}>
                          Refresh
                        </Button>
                      </div>
                    </div>
                  )
                ) : recordingUrl ? (
                  <audio controls src={recordingUrl} className="w-full" />
                ) : (
                  <div className="text-sm text-slate-300">No recording saved yet.</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold">Transcript</div>
              <div className="mt-3 space-y-3">
                {call.transcript?.length ? (
                  call.transcript.map((t, idx) => (
                    <div
                      key={`${idx}-${t.firstReceivedTime ?? 0}`}
                      className={[
                        "rounded-2xl p-3",
                        t.role === "user"
                          ? "bg-brand-500/12 shadow-[0_0_0_1px_rgba(0,240,106,.16)]"
                          : "bg-slate-950/45 shadow-[0_0_0_1px_rgba(255,255,255,.06)]",
                      ].join(" ")}
                    >
                      <div className={t.role === "user" ? "text-xs text-brand-200" : "text-xs text-slate-300"}>
                        {t.speaker}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{t.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-300">No transcript saved yet.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}



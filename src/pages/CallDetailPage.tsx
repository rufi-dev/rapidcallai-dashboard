import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, Button } from "../components/ui";
import { getCall, getCallRecordingUrl, type CallRecord } from "../lib/api";

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
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  async function refreshRecording(c: CallRecord | null) {
    if (!c?.recording) {
      setPlaybackUrl(null);
      setRecordingStatus(null);
      setRecordingError(null);
      return;
    }

    setRecordingError(null);

    // Audio elements can't send Authorization headers; fetch a playback-ready URL.
    try {
      const rec = c.recording as any;
      const looksLikeEgressS3 =
        (rec && rec.kind === "egress_s3") ||
        (rec && rec.egressId && rec.bucket && rec.key) ||
        (rec && typeof rec.url === "string" && /\/api\/calls\/[^/]+\/recording$/.test(rec.url));

      if (looksLikeEgressS3) {
        const st = typeof rec.status === "string" ? rec.status : null;
        setRecordingStatus(st);
        if (st && st !== "ready") {
          setPlaybackUrl(null);
          return;
        }
        const r = await getCallRecordingUrl(callId);
        setPlaybackUrl(r.url);
        return;
      }

      if ("url" in c.recording && c.recording.url) {
        const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";
        setPlaybackUrl(`${base}${c.recording.url}`);
        return;
      }
    } catch (e) {
      setPlaybackUrl(null);
      setRecordingError(e instanceof Error ? e.message : "Failed to load recording");
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getCall(callId);
        if (!mounted) return;
        setCall(c);
        await refreshRecording(c);
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

  const canShowRecording = useMemo(() => Boolean(call?.recording), [call?.recording]);

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
              <div className="text-sm font-semibold">Cost breakdown (USD and USD/min)</div>
              {(() => {
                const cost = (call as any)?.metrics?.cost;
                const retail = cost?.retail;
                const cogs = cost?.cogs;
                const minutes = Number((call as any)?.metrics?.normalized?.callMinutes || (call.durationSec || 0) / 60 || 0);
                if (!retail?.breakdownUsd || !cogs?.breakdownUsd) {
                  return <div className="mt-2 text-sm text-slate-300">No detailed breakdown saved for this call yet.</div>;
                }
                const entries = Object.entries(retail.breakdownUsd as Record<string, number>)
                  .map(([k, v]) => ({ k, usd: Number(v || 0) }))
                  .filter((x) => x.usd > 0.000001)
                  .sort((a, b) => b.usd - a.usd);
                const denom = Math.max(0.0001, minutes);
                return (
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                    <div className="grid grid-cols-4 gap-0 bg-white/5 px-3 py-2 text-xs text-slate-300">
                      <div>Component</div>
                      <div className="text-right">Retail</div>
                      <div className="text-right">Retail / min</div>
                      <div className="text-right">COGS</div>
                    </div>
                    <div className="divide-y divide-white/10">
                      {entries.map((e) => {
                        const c = Number((cogs.breakdownUsd?.[e.k] as any) || 0);
                        return (
                          <div key={e.k} className="grid grid-cols-4 gap-0 px-3 py-2 text-sm">
                            <div className="text-slate-200">{e.k}</div>
                            <div className="text-right font-semibold text-white">${e.usd.toFixed(4)}</div>
                            <div className="text-right text-slate-200">${(e.usd / denom).toFixed(4)}</div>
                            <div className="text-right text-slate-300">${c.toFixed(4)}</div>
                          </div>
                        );
                      })}
                      <div className="grid grid-cols-4 gap-0 px-3 py-2 text-sm bg-white/5">
                        <div className="text-slate-200">Total</div>
                        <div className="text-right font-semibold text-white">${Number(retail.totalUsd || 0).toFixed(4)}</div>
                        <div className="text-right text-slate-200">${(Number(retail.totalUsd || 0) / denom).toFixed(4)}</div>
                        <div className="text-right text-slate-300">${Number(cogs.totalUsd || 0).toFixed(4)}</div>
                      </div>
                    </div>
                    <div className="px-3 py-2 text-xs text-slate-400">
                      Method: <span className="text-slate-200">{String(retail.method || "—")}</span>
                      {retail.impliedGrossMarginRate != null ? (
                        <>
                          {" "}
                          · Implied margin: <span className="text-slate-200">{(Number(retail.impliedGrossMarginRate) * 100).toFixed(0)}%</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <div className="text-sm font-semibold">Recording</div>
              <div className="mt-2">
                {!canShowRecording ? (
                  <div className="text-sm text-slate-300">No recording saved yet.</div>
                ) : playbackUrl ? (
                  <audio controls src={playbackUrl} className="w-full" />
                ) : (
                  <div className="text-sm text-slate-300">
                    {recordingStatus ? (
                      <>
                        Recording is <span className="text-slate-100">{recordingStatus}</span>…
                      </>
                    ) : (
                      <>Recording is not playable yet.</>
                    )}
                    {recordingError ? (
                      <div className="mt-2 text-xs text-rose-200">{recordingError}</div>
                    ) : null}
                    <div className="mt-2">
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            const c = await getCall(callId);
                            setCall(c);
                            await refreshRecording(c);
                          } catch (e) {
                            toast.error(`Failed to refresh call: ${e instanceof Error ? e.message : "Unknown error"}`);
                          }
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
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



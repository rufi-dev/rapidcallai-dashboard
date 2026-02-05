import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Card, Button, Textarea } from "../components/ui";
import {
  getCall,
  getCallRecordingUrl,
  exportCall,
  listCallEvaluations,
  createCallEvaluation,
  autoEvaluateCall,
  listCallLabels,
  addCallLabel,
  deleteCallLabel,
  type CallRecord,
  type CallEvaluation,
  type CallLabel,
} from "../lib/api";
import { SectionLoader } from "../components/loading";

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

function parseDetails(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed ? (parsed as Record<string, any>) : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as Record<string, any>;
  return null;
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
  const [evaluations, setEvaluations] = useState<CallEvaluation[]>([]);
  const [labels, setLabels] = useState<CallLabel[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [evalScore, setEvalScore] = useState<number>(80);
  const [evalNotes, setEvalNotes] = useState("");
  const [evalBusy, setEvalBusy] = useState(false);
  const [evalAutoBusy, setEvalAutoBusy] = useState(false);

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
        try {
          const [e, l] = await Promise.all([listCallEvaluations(callId), listCallLabels(callId)]);
          if (!mounted) return;
          setEvaluations(e);
          setLabels(l);
        } catch {
          // ignore; not critical for page load
        }
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
  const canAutoEval = useMemo(() => Boolean(call?.transcript?.length), [call?.transcript?.length]);

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
          <div className="p-6">
            <SectionLoader title="Loading call" subtitle="Fetching details + recording…" />
          </div>
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
              {call.metrics?.abTest?.variantName ? (
                <div>
                  <div className="text-xs text-slate-400">Variant</div>
                  <div className="text-slate-100">{call.metrics.abTest.variantName}</div>
                </div>
              ) : null}
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

            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div>
                <div className="text-sm font-semibold">Call evaluation</div>
                <div className="mt-2 text-xs text-slate-400">
                  Add a score and notes after reviewing the transcript or recording.
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs text-slate-400">Score (0–100)</div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={evalScore}
                      onChange={(e) => setEvalScore(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Notes</div>
                    <Textarea
                      value={evalNotes}
                      onChange={setEvalNotes}
                      rows={4}
                      placeholder="What went well? What should improve?"
                      className="scrollbar-brand"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        setEvalBusy(true);
                        const row = await createCallEvaluation(callId, { score: evalScore, notes: evalNotes });
                        setEvaluations((prev) => [row, ...prev]);
                        setEvalNotes("");
                        toast.success("Evaluation saved");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed to save evaluation");
                      } finally {
                        setEvalBusy(false);
                      }
                    }}
                    disabled={evalBusy}
                  >
                    {evalBusy ? "Saving…" : "Save evaluation"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        setEvalAutoBusy(true);
                        const row = await autoEvaluateCall(callId);
                        setEvaluations((prev) => [row, ...prev]);
                        toast.success("AI evaluation completed");
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "AI evaluation failed");
                      } finally {
                        setEvalAutoBusy(false);
                      }
                    }}
                    disabled={evalAutoBusy || !canAutoEval}
                  >
                    {evalAutoBusy ? "Running…" : "Run AI evaluation"}
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {evaluations.length === 0 ? (
                    <div className="text-sm text-slate-300">No evaluations yet.</div>
                  ) : (
                    evaluations.map((ev) => (
                      <div key={ev.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-400">
                            Score {ev.source === "auto" ? "• AI" : "• Manual"}
                          </div>
                          <div className="font-semibold text-slate-100">{ev.score}</div>
                        </div>
                        {ev.source === "auto" ? (() => {
                          const details = parseDetails(ev.details);
                          const summary = details?.summary ?? ev.notes;
                          const strengths = Array.isArray(details?.strengths) ? details.strengths : [];
                          const issues = Array.isArray(details?.issues) ? details.issues : [];
                          const fixes = Array.isArray(details?.suggestedFixes) ? details.suggestedFixes : [];
                          const nextTests = Array.isArray(details?.nextTests) ? details.nextTests : [];
                          return (
                            <div className="mt-2 space-y-2">
                              {summary ? <div className="text-slate-200">{summary}</div> : null}
                              {strengths.length ? (
                                <div>
                                  <div className="text-xs text-slate-400">Strengths</div>
                                  <ul className="mt-1 list-disc pl-5 text-slate-200">
                                    {strengths.slice(0, 6).map((s: string, i: number) => (
                                      <li key={`s-${i}`}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {issues.length ? (
                                <div>
                                  <div className="text-xs text-slate-400">Issues</div>
                                  <ul className="mt-1 list-disc pl-5 text-slate-200">
                                    {issues.slice(0, 6).map((s: string, i: number) => (
                                      <li key={`i-${i}`}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {fixes.length ? (
                                <div>
                                  <div className="text-xs text-slate-400">Suggested fixes</div>
                                  <ul className="mt-1 list-disc pl-5 text-slate-200">
                                    {fixes.slice(0, 6).map((s: string, i: number) => (
                                      <li key={`f-${i}`}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {nextTests.length ? (
                                <div>
                                  <div className="text-xs text-slate-400">Next tests</div>
                                  <ul className="mt-1 list-disc pl-5 text-slate-200">
                                    {nextTests.slice(0, 6).map((s: string, i: number) => (
                                      <li key={`n-${i}`}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </div>
                          );
                        })() : ev.notes ? (
                          <div className="mt-2 text-slate-200 whitespace-pre-wrap">{ev.notes}</div>
                        ) : null}
                        <div className="mt-2 text-xs text-slate-500">{fmtTs(ev.createdAt)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold">Labels & export</div>
                <div className="mt-2 text-xs text-slate-400">Tag calls for later analysis or export the conversation.</div>
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      placeholder="e.g. qualified, escalated, billing_issue"
                      className="flex-1 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                    />
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const v = labelInput.trim();
                        if (!v) return;
                        try {
                          const row = await addCallLabel(callId, v);
                          setLabels((prev) => [row, ...prev]);
                          setLabelInput("");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed to add label");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {labels.length === 0 ? (
                      <div className="text-sm text-slate-300">No labels yet.</div>
                    ) : (
                      labels.map((l) => (
                        <button
                          key={l.id}
                          onClick={async () => {
                            try {
                              await deleteCallLabel(callId, l.label);
                              setLabels((prev) => prev.filter((x) => x.id !== l.id));
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Failed to remove label");
                            }
                          }}
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                          title="Click to remove"
                        >
                          {l.label}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={async () => {
                        try {
                          const out = await exportCall(callId);
                          const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `call-${callId}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Export failed");
                        }
                      }}
                      variant="secondary"
                    >
                      Export JSON
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}



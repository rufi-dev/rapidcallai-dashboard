import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { PhoneCall } from "lucide-react";
import { getCall, getCallRecordingUrl, listCalls, type CallRecord, type CallSummary } from "../lib/api";
import { toast } from "sonner";
import { GlowSpinner, SectionLoader } from "../components/loading";

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtTs(ms: number | null): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export function CallHistoryPage() {
  const nav = useNavigate();
  const params = useParams();
  const selectedFromUrl = params.id ?? null;

  const [calls, setCalls] = useState<CallSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const [selectedId, setSelectedId] = useState<string | null>(selectedFromUrl);
  const [detail, setDetail] = useState<CallRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await listCalls();
        if (!mounted) return;
        setCalls(rows);
        setPage(1);
      } catch (e) {
        toast.error(`Failed to load calls: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedId(selectedFromUrl);
  }, [selectedFromUrl]);

  // IMPORTANT: reset playback URL when switching calls; otherwise we reuse the previous call's audio src.
  useEffect(() => {
    setPlaybackUrl(null);
    setPlaybackError(null);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setPlaybackUrl(null);
      setPlaybackError(null);
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    let mounted = true;
    setDetailLoading(true);
    (async () => {
      try {
        const c = await getCall(selectedId);
        if (!mounted) return;
        setDetail(c);

        // Only poll while an egress recording is still processing.
        // Polling after it's ready causes detail/playback URL to refresh, which can interrupt <audio> playback.
        const rec = (c as any)?.recording;
        const looksLikeEgressS3 =
          (rec && rec.kind === "egress_s3") || (rec && rec.egressId && rec.bucket && rec.key);
        const st = looksLikeEgressS3 && typeof rec.status === "string" ? rec.status : null;
        const shouldPoll = Boolean(looksLikeEgressS3 && st && st !== "ready" && st !== "failed");
        if (!shouldPoll && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (e) {
        toast.error(`Failed to load call: ${e instanceof Error ? e.message : "Unknown error"}`);
      } finally {
        if (mounted) setDetailLoading(false);
      }
    })();

    // Poll while recording is not ready (egress can take a bit to finalize).
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const c = await getCall(selectedId);
        setDetail(c);
        const rec = (c as any)?.recording;
        const looksLikeEgressS3 =
          (rec && rec.kind === "egress_s3") || (rec && rec.egressId && rec.bucket && rec.key);
        const st = looksLikeEgressS3 && typeof rec.status === "string" ? rec.status : null;
        if (!looksLikeEgressS3 || st === "ready" || st === "failed") {
          if (pollRef.current) {
            window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);

    return () => {
      mounted = false;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selectedId]);

  const countLabel = useMemo(() => (loading ? "Loading…" : `${calls.length} calls`), [calls.length, loading]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(calls.length / PAGE_SIZE)), [calls.length]);
  const pagedCalls = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return calls.slice(start, start + PAGE_SIZE);
  }, [calls, page]);

  const panelOpen = Boolean(selectedId);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setPlaybackError(null);
      if (!selectedId || !detail?.recording) {
        if (mounted) setPlaybackUrl(null);
        return;
      }

      // Don't regenerate the playback URL if we already have one; updating <audio src> interrupts playback.
      if (playbackUrl) return;

      const rec = detail.recording as any;
      const looksLikeEgressS3 =
        (rec && rec.kind === "egress_s3") ||
        (rec && rec.egressId && rec.bucket && rec.key) ||
        (rec && typeof rec.url === "string" && /\/api\/calls\/[^/]+\/recording$/.test(rec.url));

      try {
        if (looksLikeEgressS3) {
          const st = typeof rec.status === "string" ? rec.status : null;
          if (st && st !== "ready") {
            if (mounted) setPlaybackUrl(null);
            return;
          }
          const r = await getCallRecordingUrl(selectedId);
          if (mounted) setPlaybackUrl(r.url);
          return;
        }

        // Legacy/manual upload (served from /recordings)
        if (rec && typeof rec.url === "string" && rec.url) {
          const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";
          if (mounted) setPlaybackUrl(`${base}${rec.url}`);
          return;
        }

        if (mounted) setPlaybackUrl(null);
      } catch (e) {
        if (!mounted) return;
        setPlaybackUrl(null);
        setPlaybackError(e instanceof Error ? e.message : "Failed to load recording");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [detail?.recording, playbackUrl, selectedId]);

  return (
    <div className={panelOpen ? "grid gap-6 xl:grid-cols-[1fr_520px] items-start" : "space-y-6"}>
      <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Call history</div>
          <div className="mt-1 text-sm text-slate-300">Sessions from web tests (and later real phone calls).</div>
        </div>
        <div className="rounded-2xl bg-brand-500/10 px-4 py-2 text-sm text-brand-200 shadow-glow">
          <span className="inline-flex items-center gap-2">
            <PhoneCall size={16} /> {countLabel}
          </span>
        </div>
      </div>

      <Card>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr className="border-b border-white/10">
                <th className="px-3 py-3 font-medium">Time</th>
                <th className="px-3 py-3 font-medium">Call</th>
                <th className="px-3 py-3 font-medium">Agent</th>
                <th className="px-3 py-3 font-medium">To</th>
                <th className="px-3 py-3 font-medium">Duration</th>
                <th className="px-3 py-3 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-300">
                    <GlowSpinner label="Loading calls…" className="justify-center" />
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-300">
                    No calls yet. Start a Talk session and you’ll see it here.
                  </td>
                </tr>
              ) : (
                pagedCalls.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/5 cursor-pointer"
                    onClick={() => nav(`/app/calls/${encodeURIComponent(c.id)}`)}
                    title="Open call"
                  >
                    <td className="px-3 py-3 text-xs text-slate-400">{fmtTs(c.startedAt ?? null)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-300">{c.id}</td>
                    <td className="px-3 py-3 text-slate-100">{c.agentName}</td>
                    <td className="px-3 py-3 text-slate-300">{c.to || "—"}</td>
                    <td className="px-3 py-3 text-slate-300">{formatDuration(c.durationSec)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-200">{c.outcome}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && calls.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-3 text-sm">
            <div className="text-xs text-slate-400">
              Page <span className="text-slate-200">{page}</span> of{" "}
              <span className="text-slate-200">{totalPages}</span> • {PAGE_SIZE} per page
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setPage(1)} disabled={page <= 1}>
                First
              </Button>
              <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                Prev
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
              <Button variant="secondary" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>
                Last
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
      </div>

      {panelOpen ? (
        <aside className="sticky top-[84px] h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Call</div>
            <button
              onClick={() => nav("/app/calls")}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
              title="Close"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex-1 min-h-0 overflow-auto scrollbar-brand pr-1">
            {detailLoading ? (
              <SectionLoader title="Loading call" subtitle="Fetching details + recording…" />
            ) : !detail ? (
              <div className="rounded-3xl bg-slate-950/40 p-5 text-sm text-slate-300">Not found.</div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl bg-slate-950/35 p-4 text-sm">
                  <div className="text-xs text-slate-400 font-mono">{detail.id}</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Agent</div>
                      <div className="text-slate-100">{detail.agentName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">To</div>
                      <div className="text-slate-100">{detail.to}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Outcome</div>
                      <div className="text-slate-100">{detail.outcome}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Duration</div>
                      <div className="text-slate-100">{formatDuration(detail.durationSec)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Started</div>
                      <div className="text-slate-100">{fmtTs(detail.startedAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Ended</div>
                      <div className="text-slate-100">{fmtTs(detail.endedAt)}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-black/20 p-4">
                  <div className="text-sm font-semibold">Recording</div>
                  <div className="mt-2">
                    {playbackUrl ? <audio controls src={playbackUrl} className="w-full" /> : null}

                    {!playbackUrl ? (
                      detail.recording ? (
                        <div className="text-sm text-slate-300">
                          {"kind" in detail.recording && detail.recording.kind === "egress_s3" ? (
                            <>
                              Recording is{" "}
                              <span className="text-slate-100">{(detail.recording as any).status ?? "processing"}</span>…
                            </>
                          ) : (
                            <>Recording is not playable yet.</>
                          )}
                          {playbackError ? <div className="mt-2 text-xs text-rose-200">{playbackError}</div> : null}
                          <div className="mt-2">
                            <Button variant="secondary" onClick={() => setSelectedId((x) => x)}>
                              Refresh
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-300">No recording saved yet.</div>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="rounded-3xl bg-black/20 p-4">
                  <div className="text-sm font-semibold">Transcript</div>
                  <div className="mt-3 space-y-3">
                    {detail.transcript?.length ? (
                      detail.transcript.map((t, idx) => (
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
          </div>
        </aside>
      ) : null}
    </div>
  );
}



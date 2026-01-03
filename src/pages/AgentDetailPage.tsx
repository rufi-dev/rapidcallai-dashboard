import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ControlBar, LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { ClipboardCopy, CloudUpload, Save, Undo2, Wand2, X } from "lucide-react";
import { type Participant, RoomEvent, type TrackPublication, type TranscriptionSegment } from "livekit-client";
import { toast } from "sonner";

import { Button, Card, Textarea } from "../components/ui";
import {
  endCall,
  getAgent,
  getAgentAnalytics,
  startAgent,
  updateAgent,
  type AgentAnalytics,
  type AgentProfile,
  type CallTranscriptItem,
  type StartResponse,
} from "../lib/api";
import { useHeaderSlots } from "../components/headerSlots";

type TranscriptItem = {
  id: string;
  speaker: string;
  text: string;
  final: boolean;
  firstReceivedTime: number;
  role: "agent" | "user";
};

function TranscriptPanel(props: { agentName?: string; onTranscript?: (items: CallTranscriptItem[]) => void }) {
  const room = useRoomContext();
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const mapRef = useRef<Map<string, TranscriptItem>>(new Map());
  const [tick, setTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onTranscription(segments: TranscriptionSegment[], participant?: Participant, _pub?: TrackPublication) {
      const identity = participant?.identity;
      const speaker =
        participant?.name ||
        (identity && identity.startsWith("agent-") ? props.agentName || "Agent" : identity) ||
        "Unknown";
      const role: "agent" | "user" = identity && identity.startsWith("agent-") ? "agent" : "user";
      const map = mapRef.current;
      for (const s of segments) {
        map.set(s.id, {
          id: s.id,
          speaker,
          text: s.text,
          final: s.final,
          firstReceivedTime: s.firstReceivedTime,
          role,
        });
      }
      const next = Array.from(map.values()).sort((a, b) => a.firstReceivedTime - b.firstReceivedTime);
      setItems(next);
      props.onTranscript?.(
        next.map((it) => ({
          speaker: it.speaker,
          role: it.role,
          text: it.text,
          final: it.final,
          firstReceivedTime: it.firstReceivedTime,
        }))
      );
      setTick((t) => t + 1);
    }

    room.on(RoomEvent.TranscriptionReceived, onTranscription);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, onTranscription);
    };
  }, [room]);

  useEffect(() => {
    // Always autoscroll on any transcription update (even if segments are updated in-place).
    const el = scrollRef.current;
    if (!el) return;
    // Use element-only scrolling (never scroll the page/body).
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
      // Run once more after layout settles to avoid leaving a few pixels unscrolled.
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, [tick]);

  return (
    <div className="h-full min-h-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent p-4 flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Transcript</div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-brand mt-4 flex-1 min-h-0 space-y-3 overflow-auto pr-1 rounded-2xl bg-slate-950/30 p-3"
      >
        {items.length === 0 ? (
          <div className="rounded-2xl bg-slate-950/40 p-4 text-sm text-slate-300">
            No transcript yet…
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className={[
                "rounded-2xl p-3",
                it.role === "user"
                  ? "bg-brand-500/12 shadow-[0_0_0_1px_rgba(0,240,106,.16)]"
                  : "bg-slate-950/45 shadow-[0_0_0_1px_rgba(255,255,255,.06)]",
              ].join(" ")}
            >
              <div className={it.role === "user" ? "text-xs text-brand-200" : "text-xs text-slate-300"}>{it.speaker}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{it.text}</div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex justify-end shrink-0">
        <Button
          variant="secondary"
          onClick={() => {
            mapRef.current.clear();
            setItems([]);
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}

export function AgentDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const agentId = id ?? "";
  const { setHeader, clearHeader } = useHeaderSlots();

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentAnalytics, setAgentAnalytics] = useState<AgentAnalytics | null>(null);

  const [draftPrompt, setDraftPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [welcomeMode, setWelcomeMode] = useState<"ai" | "user">("user");
  const [aiMessageMode, setAiMessageMode] = useState<"dynamic" | "custom">("dynamic");
  const [aiMessageText, setAiMessageText] = useState("");
  const [aiDelaySeconds, setAiDelaySeconds] = useState(0);

  const [panelOpen, setPanelOpen] = useState(false);
  const [session, setSession] = useState<StartResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const transcriptRef = useRef<CallTranscriptItem[]>([]);
  const endInFlightRef = useRef(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const a = await getAgent(agentId);
      setAgent(a);
      setDraftPrompt(a.promptDraft ?? a.promptPublished ?? "");
      setWelcomeMode(a.welcome?.mode ?? "user");
      setAiMessageMode(a.welcome?.aiMessageMode ?? "dynamic");
      setAiMessageText(a.welcome?.aiMessageText ?? "");
      setAiDelaySeconds(a.welcome?.aiDelaySeconds ?? 0);

      // Best-effort analytics load for header stats
      try {
        const an = await getAgentAnalytics(agentId);
        setAgentAnalytics(an);
      } catch {
        setAgentAnalytics(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!agentId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const isDirty = useMemo(() => {
    const saved = agent?.promptDraft ?? agent?.promptPublished ?? "";
    const savedWelcome = agent?.welcome ?? {};
    return (
      saved !== draftPrompt ||
      (savedWelcome.mode ?? "user") !== welcomeMode ||
      (savedWelcome.aiMessageMode ?? "dynamic") !== aiMessageMode ||
      (savedWelcome.aiMessageText ?? "") !== aiMessageText ||
      (savedWelcome.aiDelaySeconds ?? 0) !== aiDelaySeconds
    );
  }, [agent, draftPrompt, welcomeMode, aiMessageMode, aiMessageText, aiDelaySeconds]);
  const canSave = useMemo(() => draftPrompt.trim().length > 0 && isDirty && !saving, [draftPrompt, isDirty, saving]);

  async function onSave() {
    if (!agent) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAgent(agent.id, {
        promptDraft: draftPrompt,
        welcome: {
          mode: welcomeMode,
          aiMessageMode,
          aiMessageText,
          aiDelaySeconds,
        },
      });
      setAgent(updated);
      toast.success("Saved draft");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  async function onPublish() {
    if (!agent) return;
    setPublishing(true);
    setError(null);
    try {
      const updated = await updateAgent(agent.id, { publish: true });
      setAgent(updated);
      toast.success("Published");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish");
      toast.error("Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  function onRevert() {
    setDraftPrompt(agent?.promptDraft ?? agent?.promptPublished ?? "");
    setWelcomeMode(agent?.welcome?.mode ?? "user");
    setAiMessageMode(agent?.welcome?.aiMessageMode ?? "dynamic");
    setAiMessageText(agent?.welcome?.aiMessageText ?? "");
    setAiDelaySeconds(agent?.welcome?.aiDelaySeconds ?? 0);
  }

  async function onTalk() {
    if (!agent) return;
    setStarting(true);
    setError(null);
    try {
      const s = await startAgent(agent.id, {
        welcome: {
          mode: welcomeMode,
          aiMessageMode,
          aiMessageText,
          aiDelaySeconds,
        },
      });
      setSession(s);
      transcriptRef.current = [];
      setPanelOpen(true);
      toast.success("Session started");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start session");
      setPanelOpen(true);
      toast.error("Failed to start session");
    } finally {
      setStarting(false);
    }
  }

  async function finalizeCall(outcome: string) {
    if (!session?.callId) return;
    if (endInFlightRef.current) return;
    endInFlightRef.current = true;
    try {
      await endCall(session.callId, { outcome, transcript: transcriptRef.current });
    } catch (e) {
      // Don't block UX; still let session close.
      console.warn("endCall failed", e);
    } finally {
      endInFlightRef.current = false;
    }
  }

  // Put agent name/id + actions in the global header (sidebar hidden on this route)
  useEffect(() => {
    const name = agent?.name ?? "Agent";
    const latest = agentAnalytics?.latest;
    const headerStats =
      latest && (latest.latencyMs != null || latest.tokensTotal != null || latest.costUsd != null)
        ? [
            latest.latencyMs != null ? `Latency ${Math.round(latest.latencyMs)}ms` : null,
            latest.tokensTotal != null ? `Tokens ${latest.tokensTotal.toLocaleString()}` : null,
            typeof latest.costUsd === "number" ? `Cost $${latest.costUsd.toFixed(4)}` : null,
          ]
            .filter(Boolean)
            .join(" • ")
        : latest
          ? "Metrics pending…"
          : null;

    setHeader({
      left: (
        <div className="min-w-0">
          <div className="text-xs text-slate-400">Workspace</div>
          <div className="mt-1 flex items-center gap-3">
            <button
              onClick={() => nav("/app/agents")}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Back
            </button>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold tracking-tight text-white">{name}</div>
              {headerStats ? <div className="mt-1 text-xs text-slate-300">{headerStats}</div> : null}
              <div className="mt-1 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-1.5 text-xs text-slate-300">
                <span className="font-mono">{agentId}</span>
                <button
                  className="text-brand-300 hover:text-brand-200"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(agentId);
                      toast.success("Copied agent ID");
                    } catch {
                      toast.error("Failed to copy");
                    }
                  }}
                  title="Copy"
                >
                  <ClipboardCopy size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      right: (
        <>
          <Button onClick={onPublish} disabled={publishing || !draftPrompt.trim()}>
            <CloudUpload size={16} /> {publishing ? "Publishing…" : "Publish"}
          </Button>
          {isDirty ? (
            <>
              <Button variant="secondary" onClick={onRevert}>
                <Undo2 size={16} /> Revert
              </Button>
              <Button onClick={onSave} disabled={!canSave}>
                <Save size={16} /> {saving ? "Saving…" : "Save draft"}
              </Button>
            </>
          ) : null}
          <Button onClick={onTalk} disabled={starting || !agent || draftPrompt.trim().length === 0}>
            <Wand2 size={16} /> {starting ? "Starting…" : "Talk"}
          </Button>
        </>
      ),
    });

    return () => clearHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    agentId,
    agent?.name,
    agentAnalytics?.latest?.callId,
    agentAnalytics?.latest?.latencyMs,
    agentAnalytics?.latest?.tokensTotal,
    agentAnalytics?.latest?.costUsd,
    isDirty,
    saving,
    publishing,
    starting,
    draftPrompt,
    welcomeMode,
    aiMessageMode,
    aiMessageText,
    aiDelaySeconds,
  ]);

  return (
    <div className={panelOpen ? "grid gap-6 xl:grid-cols-[1fr_520px] items-start" : "space-y-6"}>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-6">
        <Card className="p-0">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Prompt</div>
                <div className="text-sm text-slate-300">Edit your agent prompt.</div>
              </div>
                <div className="text-xs text-slate-400">{loading ? "Loading…" : "Draft editor"}</div>
            </div>
          </div>
          <div className="p-5">
            <Textarea
              value={draftPrompt}
              onChange={setDraftPrompt}
              rows={14}
              placeholder="Write your full system prompt here..."
                className="scrollbar-brand min-h-[340px] max-h-[60vh] overflow-auto"
            />
            <div className="mt-2 text-xs text-slate-400">
              {isDirty ? "Unsaved changes" : "Saved"} • Prompt required to start a session
            </div>

            {/* Welcome Message moved to bottom of prompt */}
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/30 p-4">
              <div className="text-sm font-semibold">Welcome Message</div>
              <div className="mt-1 text-xs text-slate-400">Controls how the session starts</div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 text-xs text-slate-400">Start mode</div>
                  <select
                    value={welcomeMode}
                    onChange={(e) => setWelcomeMode(e.target.value as "ai" | "user")}
                    className="select-brand w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    <option value="ai">AI speaks first</option>
                    <option value="user">User speaks first</option>
                  </select>
                </div>

                {welcomeMode === "ai" ? (
                  <>
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Message type</div>
                      <select
                        value={aiMessageMode}
                        onChange={(e) => setAiMessageMode(e.target.value as "dynamic" | "custom")}
                        className="select-brand w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      >
                        <option value="dynamic">Dynamic (from prompt)</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-slate-400">Pause before speaking (seconds)</div>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={aiDelaySeconds}
                        onChange={(e) => setAiDelaySeconds(Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      />
                    </div>

                    {aiMessageMode === "custom" ? (
                      <div>
                        <div className="mb-1 text-xs text-slate-400">Custom welcome message</div>
                        <Textarea
                          value={aiMessageText}
                          onChange={setAiMessageText}
                          rows={3}
                          placeholder="Hi! How can I help today?"
                          className="scrollbar-brand"
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {panelOpen ? (
        <aside className="sticky top-[84px] h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Talk</div>
            <button
              onClick={async () => {
                await finalizeCall("closed");
                setSession(null);
                setPanelOpen(false);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
              title="Close"
            >
              <span className="inline-flex items-center gap-2">
                <X size={14} /> Close
              </span>
            </button>
          </div>

          <div className="mt-4 flex-1 min-h-0 overflow-hidden">
            {!session ? (
              <div className="h-full rounded-3xl bg-slate-950/40 p-5 text-sm text-slate-300">
                No active session yet. Click “Talk” in the header.
              </div>
            ) : (
              <div className="h-full rounded-3xl bg-black/20 p-4">
                <LiveKitRoom
                  serverUrl={session.livekitUrl}
                  token={session.token}
                  connect={true}
                  audio={true}
                  video={false}
                  onDisconnected={async () => {
                    await finalizeCall("ended");
                    setSession(null);
                  }}
                  className="h-full"
                >
                  <RoomAudioRenderer />
                  <div className="flex h-full min-h-0 flex-col gap-4">
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <TranscriptPanel
                        agentName={agent?.name}
                        onTranscript={(t) => {
                          transcriptRef.current = t;
                        }}
                      />
                    </div>
                    {/* Controls moved to the bottom */}
                    <div className="mt-auto pt-1">
                      <ControlBar variation="minimal" />
                    </div>
                  </div>
                </LiveKitRoom>
              </div>
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}



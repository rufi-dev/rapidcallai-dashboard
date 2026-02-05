import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";
import { Check, ChevronDown, ClipboardCopy, CloudUpload, Mic, MicOff, Play, Save, Search, Undo2, Wand2 } from "lucide-react";
import { type Participant, RoomEvent, type TrackPublication, type TranscriptionSegment } from "livekit-client";
import { toast } from "sonner";
import { GlowSpinner } from "../components/loading";

import { Button, Card, Textarea } from "../components/ui";
import {
  endCall,
  getAgent,
  getAgentAnalytics,
  listKbFolders,
  previewTts,
  startAgent,
  updateAgent,
  type AgentAnalytics,
  type AgentProfile,
  type CallTranscriptItem,
  type KbFolder,
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

const ELEVENLABS_MODELS = [
  { id: "eleven_flash_v2_5", name: "Flash v2.5", note: "Default (per LiveKit docs)" },
  { id: "eleven_multilingual_v2", name: "Multilingual v2", note: "Higher quality" },
  { id: "eleven_turbo_v2_5", name: "Turbo v2.5", note: "Lower latency" },
  { id: "eleven_monolingual_v1", name: "Monolingual v1", note: "Legacy (English)" },
] as const;

const ELEVENLABS_VOICES = [
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    description: "Mature, Reassuring, Confident",
    sampleText: "Hello, I'm Sarah. I bring a confident and warm approach to our conversation. How may I assist you today?",
    languages: ["English", "French", "Arabic", "German", "Dutch", "Spanish"],
  },
  {
    id: "CwhRBWXzGAHq8TQ4Fs17",
    name: "Roger",
    description: "Laid-Back, Casual, Resonant",
    sampleText: "Hey there! I'm Roger, and I'm here to help you with whatever you need. What can I do for you today?",
    languages: ["English", "French", "German", "Dutch", "Spanish"],
  },
  {
    id: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    description: "Enthusiast, Quirky Attitude",
    sampleText: "Hi! I'm Laura, and I'm super excited to help you out! What brings you here today?",
    languages: ["English", "French", "Arabic", "Chinese", "German"],
  },
  {
    id: "IKne3meq5aSn9XLyUdCD",
    name: "Charlie",
    description: "Deep, Confident, Energetic",
    sampleText: "Hello! I'm Charlie, and I'm ready to tackle any challenge with you. What would you like to explore?",
    languages: ["English", "Portuguese", "Spanish", "Chinese", "Filipino"],
  },
  {
    id: "G17SuINrv2H9FC6nvetn",
    name: "Christopher",
    description: "Gentle and Trustworthy",
    sampleText: "Good day! I'm Christopher, and I'm here to provide you with reliable and thoughtful assistance. How can I help?",
    languages: [
      "English",
      "Czech",
      "German",
      "Hindi",
      "Polish",
      "Greek",
      "French",
      "Arabic",
      "Croatian",
      "Romanian",
      "Ukrainian",
      "Hungarian",
      "Russian",
      "Dutch",
      "Slovak",
      "Tamil",
      "Swedish",
      "Norwegian",
      "Danish",
      "Spanish",
    ],
  },
] as const;

const CARTESIA_MODELS = [{ id: "sonic-2", name: "Sonic 2", note: "Low latency, expressive" }] as const;

const CARTESIA_VOICES = [
  { id: "0834f3df-e650-4766-a20c-5a93a43aa6e3", name: "Leo" },
  { id: "6776173b-fd72-460d-89b3-d85812ee518d", name: "Jace" },
  { id: "c961b81c-a935-4c17-bfb3-ba2239de8c2f", name: "Kyle" },
  { id: "f4a3a8e4-694c-4c45-9ca0-27caf97901b5", name: "Gavin" },
  { id: "cbaf8084-f009-4838-a096-07ee2e6612b1", name: "Maya" },
  { id: "6ccbfb76-1fc6-48f7-b71d-91ac6298247b", name: "Tessa" },
  { id: "cc00e582-ed66-4004-8336-0175b85c85f6", name: "Dana" },
  { id: "26403c37-80c1-4a1a-8692-540551ca2ae5", name: "Marian" },
] as const;

function TranscriptPanel(props: { agentName?: string; onTranscript?: (items: CallTranscriptItem[]) => void }) {
  const room = useRoomContext();
  const [items, setItems] = useState<TranscriptItem[]>([]);
  const mapRef = useRef<Map<string, TranscriptItem>>(new Map());
  const [tick, setTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function isAgentIdentity(identity: string | undefined): boolean {
    if (!identity) return false;
    // Prefer the official participant attribute set by LiveKit Agents.
    const p = room.remoteParticipants.get(identity);
    if (p && typeof (p as any).attributes?.["lk.agent.state"] !== "undefined") return true;
    // Fallback to previous heuristic.
    return identity.startsWith("agent-");
  }

  function resolveRole(identity: string | undefined): "agent" | "user" {
    const localId = room.localParticipant?.identity;
    if (identity && localId && identity === localId) return "user";
    return isAgentIdentity(identity) ? "agent" : "user";
  }

  useEffect(() => {
    function onTranscription(segments: TranscriptionSegment[], participant?: Participant, _pub?: TrackPublication) {
      const identity = participant?.identity;
      const role = resolveRole(identity);
      const speaker =
        role === "agent"
          ? props.agentName || participant?.name || identity || "Agent"
          : participant?.name || "Web User";

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
        className="scrollbar-hidden mt-4 flex-1 min-h-0 space-y-3 overflow-auto rounded-2xl bg-slate-950/30 p-3"
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
    </div>
  );
}

function RoomStatusPill(props: { onReadyChange?: (ready: boolean) => void }) {
  const room = useRoomContext();
  const [agentReady, setAgentReady] = useState(false);

  useEffect(() => {
    function recompute() {
      // In the Talk panel, the room should only contain: (1) the web user, (2) the agent.
      // Some deployments use non "agent-*" identities (e.g. "VoiceAgent"), so we fall back to:
      // - any remote participant present => agent is connected
      // - or explicit lk.agent.state attribute/prefix when available
      const anyRemote = room.remoteParticipants.size > 0;
      const hasMarkedAgent = Array.from(room.remoteParticipants.values()).some((p) => {
        const attrs = (p as any).attributes ?? {};
        if (typeof attrs["lk.agent.state"] !== "undefined") return true;
        return String(p.identity || "").startsWith("agent-");
      });
      const hasAgent = anyRemote || hasMarkedAgent;
      setAgentReady(hasAgent);
      props.onReadyChange?.(hasAgent);
    }

    recompute();
    room.on(RoomEvent.ParticipantConnected, recompute);
    room.on(RoomEvent.ParticipantDisconnected, recompute);
    room.on(RoomEvent.TranscriptionReceived, recompute);
    return () => {
      room.off(RoomEvent.ParticipantConnected, recompute);
      room.off(RoomEvent.ParticipantDisconnected, recompute);
      room.off(RoomEvent.TranscriptionReceived, recompute);
    };
  }, [room]);

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs",
        agentReady ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-slate-200",
      ].join(" ")}
    >
      {agentReady ? (
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
      ) : (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-brand-300" />
      )}
      {agentReady ? "Connected" : "Connecting…"}
    </div>
  );
}

function TalkLoadingOverlay(props: { show: boolean }) {
  if (!props.show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 px-5 py-4 text-sm text-slate-200 shadow-xl backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-brand-300" />
          <div>
            <div className="font-medium text-slate-100">Connecting…</div>
            <div className="mt-0.5 text-xs text-slate-300">This can take a few seconds</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TalkControls(props: { onExit: () => void }) {
  const room = useRoomContext();
  const [micEnabled, setMicEnabled] = useState(true);

  useEffect(() => {
    const lp: any = room.localParticipant as any;
    setMicEnabled(Boolean(lp?.isMicrophoneEnabled ?? true));
  }, [room]);

  async function toggleMic() {
    const lp: any = room.localParticipant as any;
    const current = Boolean(lp?.isMicrophoneEnabled ?? micEnabled);
    try {
      await room.localParticipant.setMicrophoneEnabled(!current);
      setMicEnabled(!current);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle microphone");
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={toggleMic}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
        title={micEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
        {micEnabled ? "Mute" : "Unmute"}
      </button>

      <button
        onClick={props.onExit}
        className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/15"
        title="Exit"
      >
        Exit
      </button>
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

  const [llmModel, setLlmModel] = useState<string>("");

  const [welcomeMode, setWelcomeMode] = useState<"ai" | "user">("user");
  const [aiMessageMode, setAiMessageMode] = useState<"dynamic" | "custom">("dynamic");
  const [aiMessageText, setAiMessageText] = useState("");
  const [aiDelaySeconds, setAiDelaySeconds] = useState(0);
  const [maxCallMinutes, setMaxCallMinutes] = useState<number>(0);
  const [kbFolders, setKbFolders] = useState<KbFolder[]>([]);
  const [kbFoldersLoading, setKbFoldersLoading] = useState(false);
  const [knowledgeFolderIds, setKnowledgeFolderIds] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<"prompt" | "model" | "voice" | "transcriber" | "tools">("prompt");

  // Default to ElevenLabs (user requested) and allow switching to Cartesia.
  const [voiceProvider, setVoiceProvider] = useState<"cartesia" | "elevenlabs">("elevenlabs");
  const [voiceModel, setVoiceModel] = useState<string>(ELEVENLABS_MODELS[0].id);
  const [voiceId, setVoiceId] = useState<string>(ELEVENLABS_VOICES[0].id);
  const [previewText, setPreviewText] = useState<string>(
    "Hi! This is a quick voice preview from your assistant. How can I help you today?"
  );
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [session, setSession] = useState<StartResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [agentReady, setAgentReady] = useState(false);
  const [talkTimeoutMs, setTalkTimeoutMs] = useState<number | null>(null);
  const transcriptRef = useRef<CallTranscriptItem[]>([]);
  const endInFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const LLM_MODEL_OPTIONS = [
    "gpt-5-mini",
    "gpt-5",
    "gpt-5.2",
    "gpt-4.1",
    "gpt-4o",
  ];

  function LlmModelDropdown(props: {
    value: string;
    onChange: (v: string) => void;
  }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const boxRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      function onDoc(e: MouseEvent) {
        const el = boxRef.current;
        if (!el) return;
        if (e.target && el.contains(e.target as Node)) return;
        setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const options = useMemo(() => {
      const rows = LLM_MODEL_OPTIONS.map((id) => ({ id, label: id.replaceAll("-", " ") }));
      const needle = q.trim().toLowerCase();
      if (!needle) return rows;
      return rows.filter((r) => r.id.toLowerCase().includes(needle) || r.label.toLowerCase().includes(needle));
    }, [q]);

    const selectedId = props.value;

    return (
      <div ref={boxRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-950/30"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              {selectedId ? selectedId : "Default"}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              This sets the LLM model used by this agent.
            </div>
          </div>
          <div className="text-slate-400">
            <ChevronDown size={18} className={open ? "rotate-180 transition" : "transition"} />
          </div>
        </button>

        {open ? (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/10 p-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search models…"
                  className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="max-h-[340px] overflow-auto">
              <button
                onClick={() => {
                  props.onChange("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">Default</div>
                  <div className="text-xs text-slate-500">Use server default model</div>
                </div>
                {selectedId === "" ? <Check size={16} className="text-brand-300" /> : null}
              </button>

              <div className="h-px bg-white/10" />

              {options.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-400">No results</div>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      props.onChange(opt.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{opt.id}</div>
                      <div className="text-xs text-slate-500">{opt.label}</div>
                    </div>
                    {selectedId === opt.id ? <Check size={16} className="text-brand-300" /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  async function onPreviewVoice() {
    setPreviewBusy(true);
    setPreviewError(null);
    try {
      const blob = await previewTts({
        provider: voiceProvider,
        model: voiceModel,
        voiceId,
        text: previewText.trim() || "Hello! This is a voice preview.",
      });
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      const audio = new Audio(url);
      audio.volume = 1;
      await audio.play();
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Preview failed");
      toast.error("Voice preview failed");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const a = await getAgent(agentId);
      setAgent(a);
      setDraftPrompt(a.promptDraft ?? a.promptPublished ?? "");
      setLlmModel(String(a.llmModel || ""));
      setKnowledgeFolderIds(Array.isArray((a as any)?.knowledgeFolderIds) ? ((a as any).knowledgeFolderIds as string[]) : []);
      setWelcomeMode(a.welcome?.mode ?? "user");
      setAiMessageMode(a.welcome?.aiMessageMode ?? "dynamic");
      setAiMessageText(a.welcome?.aiMessageText ?? "");
      setAiDelaySeconds(a.welcome?.aiDelaySeconds ?? 0);
      setMaxCallMinutes(a.maxCallSeconds ? Math.round(Number(a.maxCallSeconds) / 60) : 0);

      const vp = (a.voice?.provider as "cartesia" | "elevenlabs" | undefined) ?? "elevenlabs";
      setVoiceProvider(vp);
      if (vp === "elevenlabs") {
        setVoiceModel(String(a.voice?.model || ELEVENLABS_MODELS[0].id));
        setVoiceId(String(a.voice?.voiceId || ELEVENLABS_VOICES[0].id));
        setPreviewText(ELEVENLABS_VOICES.find((v) => v.id === String(a.voice?.voiceId))?.sampleText || ELEVENLABS_VOICES[0].sampleText);
      } else {
        setVoiceModel(String(a.voice?.model || CARTESIA_MODELS[0].id));
        setVoiceId(String(a.voice?.voiceId || CARTESIA_VOICES[0].id));
      }

      // Best-effort analytics load for header stats
      try {
        const an = await getAgentAnalytics(agentId);
        setAgentAnalytics(an);
      } catch {
        setAgentAnalytics(null);
      }

      // Best-effort: load KB folders for linking.
      try {
        setKbFoldersLoading(true);
        const f = await listKbFolders();
        setKbFolders(f);
      } catch {
        setKbFolders([]);
      } finally {
        setKbFoldersLoading(false);
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
    const savedVoice = agent?.voice ?? {};
    const savedMaxCallMinutes = agent?.maxCallSeconds ? Math.round(Number(agent.maxCallSeconds) / 60) : 0;
    const savedKb = Array.isArray((agent as any)?.knowledgeFolderIds) ? (((agent as any).knowledgeFolderIds as string[]) || []) : [];
    const kbSame =
      savedKb.length === knowledgeFolderIds.length &&
      [...savedKb].sort().join(",") === [...knowledgeFolderIds].sort().join(",");
    return (
      saved !== draftPrompt ||
      String(agent?.llmModel || "") !== llmModel ||
      !kbSame ||
      (savedWelcome.mode ?? "user") !== welcomeMode ||
      (savedWelcome.aiMessageMode ?? "dynamic") !== aiMessageMode ||
      (savedWelcome.aiMessageText ?? "") !== aiMessageText ||
      (savedWelcome.aiDelaySeconds ?? 0) !== aiDelaySeconds ||
      savedMaxCallMinutes !== maxCallMinutes ||
      (savedVoice.provider ?? "cartesia") !== voiceProvider ||
      (savedVoice.model ?? (voiceProvider === "elevenlabs" ? ELEVENLABS_MODELS[0].id : CARTESIA_MODELS[0].id)) !== voiceModel ||
      (savedVoice.voiceId ?? "") !== voiceId
    );
  }, [agent, draftPrompt, llmModel, knowledgeFolderIds, welcomeMode, aiMessageMode, aiMessageText, aiDelaySeconds, maxCallMinutes, voiceProvider, voiceModel, voiceId]);
  const canSave = useMemo(() => draftPrompt.trim().length > 0 && isDirty && !saving, [draftPrompt, isDirty, saving]);

  async function onSave() {
    if (!agent) return;
    setSaving(true);
    setError(null);
    try {
      const llmModelTrim = String(llmModel || "").trim();
      const updated = await updateAgent(agent.id, {
        promptDraft: draftPrompt,
        ...(llmModelTrim ? { llmModel: llmModelTrim } : {}),
        knowledgeFolderIds,
        maxCallSeconds: Math.max(0, Math.round(Number(maxCallMinutes || 0) * 60)),
        welcome: {
          mode: welcomeMode,
          aiMessageMode,
          aiMessageText,
          aiDelaySeconds,
        },
        voice: {
          provider: voiceProvider,
          model: voiceModel,
          voiceId,
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
      // Publish should behave like "save + publish" (so user doesn't have to save draft separately).
      const llmModelTrim = String(llmModel || "").trim();
      const updated = await updateAgent(agent.id, {
        promptDraft: draftPrompt,
        publish: true,
        ...(llmModelTrim ? { llmModel: llmModelTrim } : {}),
        knowledgeFolderIds,
        maxCallSeconds: Math.max(0, Math.round(Number(maxCallMinutes || 0) * 60)),
        welcome: {
          mode: welcomeMode,
          aiMessageMode,
          aiMessageText,
          aiDelaySeconds,
        },
        voice: {
          provider: voiceProvider,
          model: voiceModel,
          voiceId,
        },
      });
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
    setLlmModel(String(agent?.llmModel || ""));
    setWelcomeMode(agent?.welcome?.mode ?? "user");
    setAiMessageMode(agent?.welcome?.aiMessageMode ?? "dynamic");
    setAiMessageText(agent?.welcome?.aiMessageText ?? "");
    setAiDelaySeconds(agent?.welcome?.aiDelaySeconds ?? 0);
    setMaxCallMinutes(agent?.maxCallSeconds ? Math.round(Number(agent.maxCallSeconds) / 60) : 0);
    const vp = (agent?.voice?.provider as "cartesia" | "elevenlabs" | undefined) ?? "cartesia";
    setVoiceProvider(vp);
    setVoiceModel(String(agent?.voice?.model || (vp === "elevenlabs" ? ELEVENLABS_MODELS[0].id : CARTESIA_MODELS[0].id)));
    setVoiceId(String(agent?.voice?.voiceId || (vp === "elevenlabs" ? ELEVENLABS_VOICES[0].id : CARTESIA_VOICES[0].id)));
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
      setAgentReady(false);
      setTalkTimeoutMs(Date.now() + 15000);
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

  // If the agent doesn't join, don't spin forever—show a clear next step.
  useEffect(() => {
    if (!session?.roomName) return;
    if (!talkTimeoutMs) return;
    if (agentReady) return;
    const msLeft = talkTimeoutMs - Date.now();
    const t = window.setTimeout(() => {
      if (agentReady) return;
      const extra = session.expectedAgentName
        ? `Expected agent name: ${session.expectedAgentName}.`
        : `No explicit agent name was requested. This means LiveKit Cloud dispatch rules must match the room name prefix (currently rooms look like "${session.roomName}").`;
      setError(
        `The agent did not join the room within 15 seconds. ${extra} ` +
          `Fix: add/verify a LiveKit Cloud dispatch rule for the "call-" prefix, or set LIVEKIT_WEB_AGENT_NAME on the API to explicitly request an agent.`
      );
    }, Math.max(0, msLeft));
    return () => window.clearTimeout(t);
  }, [session?.roomName, session?.expectedAgentName, talkTimeoutMs, agentReady]);

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
      latest && (latest.latencyMs != null || latest.tokensTotal != null)
        ? [
            latest.latencyMs != null ? `Latency ${Math.round(latest.latencyMs)}ms` : null,
            latest.tokensTotal != null ? `Tokens ${latest.tokensTotal.toLocaleString()}` : null,
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
        <div className="col-span-full rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "prompt", label: "Prompt" },
              { id: "model", label: "Model" },
              { id: "voice", label: "Voice" },
              { id: "transcriber", label: "Transcriber" },
              { id: "tools", label: "Tools" },
            ] as const
          ).map((t) => {
            const on = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={[
                  "rounded-2xl px-4 py-2 text-sm transition",
                  "border border-white/10",
                  on ? "bg-brand-500/15 text-brand-100 shadow-glow" : "bg-white/5 text-slate-200 hover:bg-white/10",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Prompt */}
        {activeTab === "prompt" ? (
        <Card className="p-0">
          <div className="border-b border-white/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Prompt</div>
                <div className="text-sm text-slate-300">Edit your agent prompt.</div>
              </div>
                <div className="text-xs text-slate-400">{loading ? <GlowSpinner label="Loading…" /> : "Draft editor"}</div>
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
          </div>
        </Card>
        ) : null}

        {/* Model */}
        {activeTab === "model" ? (
          <Card className="p-0">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">Model</div>
                  <div className="text-sm text-slate-300">Session behavior and defaults.</div>
                </div>
                <div className="text-xs text-slate-400">Configuration</div>
              </div>
            </div>
            <div className="p-5">
              <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">LLM</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Persisted per agent.
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Model</div>
                    <LlmModelDropdown value={llmModel} onChange={setLlmModel} />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">Knowledge folders</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Select one or more folders from your Knowledge Base. The agent will use them during calls.
                    </div>
                  </div>
                  <a
                    href="/app/knowledge"
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Manage
                  </a>
                </div>

                <div className="mt-4">
                  {kbFoldersLoading ? (
                    <GlowSpinner label="Loading folders…" />
                  ) : kbFolders.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                      No knowledge folders yet. Create one in Knowledge Base.
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {kbFolders.map((f) => {
                        const on = knowledgeFolderIds.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            onClick={() =>
                              setKnowledgeFolderIds((prev) =>
                                on ? prev.filter((x) => x !== f.id) : [...prev, f.id]
                              )
                            }
                            className={[
                              "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition",
                              on ? "border-brand-500/40 bg-brand-500/10 text-white" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
                            ].join(" ")}
                          >
                            <div className="min-w-0 truncate">{f.name}</div>
                            {on ? <Check size={16} className="text-brand-300" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/30 p-4">
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

              <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-sm font-semibold">Safety limits</div>
                <div className="mt-1 text-xs text-slate-400">Protect against stuck calls and abnormal durations</div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Max call duration (minutes)</div>
                    <input
                      type="number"
                      min={0}
                      max={24 * 60}
                      step={1}
                      value={Number.isFinite(maxCallMinutes) ? maxCallMinutes : 0}
                      onChange={(e) => setMaxCallMinutes(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Set to <span className="text-slate-200">0</span> for unlimited. Recommended:{" "}
                      <span className="text-slate-200">15</span>–<span className="text-slate-200">30</span>.
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                    When a call hits this limit, the agent ends the session and finalizes the call record so it won’t stay{" "}
                    <span className="text-slate-100">in progress</span>.
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                STT/TTS model selection + pricing can be added next (Deepgram/ElevenLabs/Cartesia/LiveKit).
              </div>
            </div>
          </Card>
        ) : null}

        {/* Voice */}
        {activeTab === "voice" ? (
          <Card className="p-0">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">Voice</div>
                  <div className="text-sm text-slate-300">Choose provider, model, and voice. Preview before saving.</div>
                </div>
                <button
                  onClick={onPreviewVoice}
                  disabled={previewBusy || !voiceId || !previewText.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
                  title="Play voice preview"
                >
                  <Play size={14} />
                  {previewBusy ? <GlowSpinner label="Generating…" /> : "Preview"}
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
                <div className="mt-1 text-xs text-slate-400">Provider → model → voice</div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Provider</div>
                    <select
                      value={voiceProvider}
                      onChange={(e) => {
                        const next = e.target.value as "cartesia" | "elevenlabs";
                        setVoiceProvider(next);
                        setPreviewError(null);
                        if (next === "elevenlabs") {
                          setVoiceModel(ELEVENLABS_MODELS[0].id);
                          setVoiceId(ELEVENLABS_VOICES[0].id);
                          setPreviewText(ELEVENLABS_VOICES[0].sampleText);
                        } else {
                          setVoiceModel(CARTESIA_MODELS[0].id);
                          setVoiceId(CARTESIA_VOICES[0].id);
                        }
                      }}
                      className="select-brand w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    >
                      <option value="cartesia">Cartesia</option>
                      <option value="elevenlabs">ElevenLabs</option>
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-slate-400">Model</div>
                    <select
                      value={voiceModel}
                      onChange={(e) => setVoiceModel(e.target.value)}
                      className="select-brand w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    >
                      {(voiceProvider === "elevenlabs" ? ELEVENLABS_MODELS : CARTESIA_MODELS).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.note}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="mb-1 text-xs text-slate-400">Voice</div>
                    <select
                      value={voiceId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setVoiceId(nextId);
                        setPreviewError(null);
                        if (voiceProvider === "elevenlabs") {
                          const v = ELEVENLABS_VOICES.find((x) => x.id === nextId);
                          if (v) setPreviewText(v.sampleText);
                        }
                      }}
                      className="select-brand w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    >
                      {(voiceProvider === "elevenlabs" ? ELEVENLABS_VOICES : CARTESIA_VOICES).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                          {"description" in v ? ` — ${(v as any).description}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                  {voiceProvider === "elevenlabs" ? (
                    (() => {
                      const v = ELEVENLABS_VOICES.find((x) => x.id === voiceId) ?? ELEVENLABS_VOICES[0];
                      return (
                        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                          <div>
                            <div className="text-sm font-semibold text-white">{v.name}</div>
                            <div className="mt-1 text-xs text-slate-300">{v.description}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {v.languages.slice(0, 7).map((l) => (
                                <span
                                  key={l}
                                  className="rounded-xl border border-white/10 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-200"
                                >
                                  {l}
                                </span>
                              ))}
                              {v.languages.length > 7 ? (
                                <span className="rounded-xl border border-white/10 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-400">
                                  +{v.languages.length - 7} more
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 md:text-right">
                            Voice ID: <span className="font-mono">{v.id}</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    (() => {
                      const v = CARTESIA_VOICES.find((x) => x.id === voiceId) ?? CARTESIA_VOICES[0];
                      return (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{v.name}</div>
                            <div className="mt-1 text-xs text-slate-300">Emotion-forward voice • Great for assistants</div>
                          </div>
                          <div className="text-xs text-slate-400">
                            Voice ID: <span className="font-mono">{v.id}</span>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  <div className="mt-4">
                    <div className="mb-1 text-xs text-slate-400">Preview sentence</div>
                    <textarea
                      value={previewText}
                      onChange={(e) => setPreviewText(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      placeholder="Type a sentence to preview…"
                    />
                  </div>

                  {previewError ? (
                    <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
                      {previewError}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400">
                      Tip: preview uses your server keys. Set <span className="font-mono">ELEVENLABS_API_KEY</span> /{" "}
                      <span className="font-mono">CARTESIA_API_KEY</span> on the server to enable audio.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Transcriber */}
        {activeTab === "transcriber" ? (
          <Card className="p-0">
            <div className="border-b border-white/10 p-5">
              <div className="text-lg font-semibold">Transcriber</div>
              <div className="mt-1 text-sm text-slate-300">Configure STT settings (coming soon).</div>
            </div>
            <div className="p-5">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                Placeholder tab — we can add Deepgram/LiveKit STT selection here next.
              </div>
            </div>
          </Card>
        ) : null}

        {/* Tools */}
        {activeTab === "tools" ? (
          <Card className="p-0">
            <div className="border-b border-white/10 p-5">
              <div className="text-lg font-semibold">Tools</div>
              <div className="mt-1 text-sm text-slate-300">Manage function tools (coming soon).</div>
            </div>
            <div className="p-5">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                Placeholder tab — we can add tool toggles + descriptions here.
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {panelOpen ? (
        <aside className="sticky top-[84px] h-[calc(100vh-120px)] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Talk</div>
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
                    setAgentReady(false);
                    setTalkTimeoutMs(null);
                  }}
                  className="h-full"
                >
                  <RoomAudioRenderer />
                  <div className="flex h-full min-h-0 flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <RoomStatusPill onReadyChange={(ready) => setAgentReady(ready)} />
                      {!agentReady ? <div className="text-xs text-slate-400">Connecting may take a few seconds…</div> : null}
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                      <TranscriptPanel
                        agentName={agent?.name}
                        onTranscript={(t) => {
                          transcriptRef.current = t;
                        }}
                      />
                    </div>
                    <div className="mt-auto pt-1">
                      <TalkControls
                        onExit={async () => {
                          await finalizeCall("ended");
                          setSession(null);
                          setPanelOpen(false);
                          setAgentReady(false);
                          setTalkTimeoutMs(null);
                        }}
                      />
                    </div>
                  </div>
                  <TalkLoadingOverlay show={!agentReady} />
                </LiveKitRoom>
              </div>
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}



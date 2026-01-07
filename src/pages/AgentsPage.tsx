import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createAgent, deleteAgent, generateAgentPrompt, listAgents, type AgentProfile } from "../lib/api";
import { Button, Card, Input, Textarea } from "../components/ui";
import { toast } from "sonner";
import { Drawer } from "../components/Drawer";
import { CheckCircle2, Sparkles, Wand2 } from "lucide-react";

type TemplateId = "receptionist" | "sales" | "support" | "appointment" | "survey";

type Template = {
  id: TemplateId;
  name: string;
  tagline: string;
  bullets: string[];
};

const TEMPLATES: Template[] = [
  {
    id: "receptionist",
    name: "Receptionist",
    tagline: "Answer calls, route requests, capture details.",
    bullets: ["Greets warmly", "Collects name + reason", "Routes / escalates cleanly"],
  },
  {
    id: "sales",
    name: "Sales / Lead Qualifier",
    tagline: "Qualify leads, handle objections, push to next step.",
    bullets: ["Qualifies quickly", "One question at a time", "Strong CTA to book"],
  },
  {
    id: "support",
    name: "Customer Support",
    tagline: "Troubleshoot with empathy, keep it short, escalate if needed.",
    bullets: ["Clarify issue", "Suggest next steps", "Escalate with summary"],
  },
  {
    id: "appointment",
    name: "Appointment Setter",
    tagline: "Book calls/visits based on hours + location.",
    bullets: ["Checks availability", "Confirms details", "Shares booking link"],
  },
  {
    id: "survey",
    name: "Questionnaire",
    tagline: "Collect structured answers and summarize perfectly.",
    bullets: ["Guided questions", "Clean summaries", "Consent-friendly"],
  },
];

type GeneratorState = {
  templateId: TemplateId;
  agentName: string;
  businessName: string;
  industry: string;
  location: string;
  timezone: string;
  languages: string;
  primaryGoal: string;
  targetCustomer: string;
  tone: "warm" | "professional" | "friendly";
  greetingStyle: string;
  offerings: string;
  hours: string;
  bookingLink: string;
  requiredFields: string;
  faqs: string;
  disallowed: string;
  escalation: string;
  policies: string;
  extra: string;
};

function buildPrompt(s: GeneratorState): string {
  const template = TEMPLATES.find((t) => t.id === s.templateId);
  const toneLine =
    s.tone === "warm"
      ? "Warm, concise, confident, respectful. Sounds human."
      : s.tone === "professional"
        ? "Professional, concise, calm, efficient. Sounds human."
        : "Friendly, concise, energetic, helpful. Sounds human.";

  const required = (s.requiredFields || "name, phone number, reason for calling, preferred time")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return [
    "## ROLE",
    `You are "${s.agentName || "Voice Assistant"}", the voice assistant for ${s.businessName || "our business"}.`,
    `Industry: ${s.industry || "—"} • Location: ${s.location || "—"} • Timezone: ${s.timezone || "—"}`,
    `Languages: ${s.languages || "English"}`,
    "",
    "## GOAL",
    `${s.primaryGoal || (template ? template.tagline : "Help the caller efficiently.")}`,
    s.targetCustomer ? `Target customer: ${s.targetCustomer}` : "",
    "",
    "## STYLE",
    toneLine,
    "Voice-only. Speak naturally. Do NOT use emojis, markdown, or bullet symbols in spoken output.",
    "Keep responses short. Ask ONE clear question at a time.",
    "Confirm important details once (name/number/time).",
    "Avoid long monologues. If unsure, ask a clarifying question.",
    "Never invent details about pricing/policies/medical/legal—ask or escalate.",
    s.greetingStyle ? `Greeting style: ${s.greetingStyle}` : "",
    "",
    template
      ? [
          "## FLOW",
          `Use this flow for a "${template.name}" call:`,
          ...template.bullets.map((b, i) => `${i + 1}. ${b}`),
          "",
          "Conversation stages:",
          "1) Warm greeting + identify intent",
          "2) Ask the minimum questions to progress",
          "3) Offer the next step (book / transfer / follow-up)",
          "4) Confirm details + close politely",
          "",
        ].join("\n")
      : "",
    "## BUSINESS CONTEXT",
    s.offerings ? `Offerings / services:\n${s.offerings}` : "",
    s.hours ? `Hours: ${s.hours}` : "",
    s.bookingLink ? `Booking link: ${s.bookingLink}` : "",
    s.policies ? `Policies / constraints:\n${s.policies}` : "",
    "",
    "## REQUIRED DATA TO CAPTURE",
    required.length ? required.map((x) => `- ${x}` as const).join("\n") : "- name\n- phone number\n- reason for calling\n- preferred time",
    "",
    "## FAQs (ANSWER BRIEFLY)",
    s.faqs
      ? s.faqs
      : "If asked common questions, answer briefly. If you don't know, say you can connect them to a human or take a message.",
    "",
    "## DO NOT",
    s.disallowed
      ? s.disallowed
      : "Do not provide medical/legal advice. Do not claim guarantees. Do not mention internal system details. Do not be verbose.",
    "",
    "## ESCALATION",
    s.escalation
      ? s.escalation
      : "If the caller needs a human, collect: name, callback number, and a 1-sentence summary. Then confirm next steps.",
    "",
    "## CALL SUMMARY (INTERNAL — do NOT speak this unless asked)",
    "After the call ends, produce a short structured summary in your mind:",
    "Caller: <name> • Phone: <number>",
    "Intent: <why they called>",
    "Key details: <2-4 bullets>",
    "Next step: <booked / transferred / follow-up needed>",
    "",
    "## PERSONALIZATION NOTES",
    "If the caller shares their name, use it naturally.",
    "If you collect details, confirm them back once (short).",
    "",
    "## EXAMPLES (STYLE ONLY)",
    'Example greeting: "Hi! Thanks for calling. How can I help today?"',
    'Example capture: "What’s the best number to reach you? And what day/time works best?"',
    'Example close: "Perfect — I’ve got that. Anything else before we wrap up?"',
    "",
    s.extra ? "## EXTRA INSTRUCTIONS\n" + s.extra : "",
  ]
    .filter((x) => String(x || "").trim().length > 0)
    .join("\n");
}

export function AgentsPage() {
  const nav = useNavigate();
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [genStep, setGenStep] = useState<1 | 2 | 3>(1);
  const [genBusy, setGenBusy] = useState(false);
  const [genAiBusy, setGenAiBusy] = useState(false);
  const [genAiError, setGenAiError] = useState<string | null>(null);
  const [gen, setGen] = useState<GeneratorState>(() => ({
    templateId: "appointment",
    agentName: "",
    businessName: "",
    industry: "",
    location: "",
    timezone: "UTC",
    languages: "English",
    primaryGoal: "",
    targetCustomer: "",
    tone: "professional",
    greetingStyle: "Warm, confident, and respectful. Use the caller’s time wisely.",
    offerings: "",
    hours: "",
    bookingLink: "",
    requiredFields: "name, phone number, reason for calling, preferred time",
    faqs: "",
    disallowed: "",
    escalation: "",
    policies: "",
    extra: "",
  }));
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setAgents(await listAgents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function onCreate() {
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createAgent({ name: name.trim(), promptDraft: "" });
      setAgents((prev) => [created, ...prev]);
      setName("");
      toast.success("Agent created");
      nav(`/app/agents/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent");
      toast.error("Failed to create agent");
    } finally {
      setCreating(false);
    }
  }

  function openGenerator() {
    setGenOpen(true);
    setGenStep(1);
    setGenAiError(null);
    setGenAiBusy(false);
    const initialName = name.trim() || "";
    const g = { ...gen, agentName: gen.agentName || initialName };
    setGen(g);
    setGeneratedPrompt(buildPrompt(g));
  }

  async function runAiGenerate(next: GeneratorState) {
    setGenAiBusy(true);
    setGenAiError(null);
    try {
      const r = await generateAgentPrompt({
        templateId: next.templateId,
        agentName: next.agentName,
        businessName: next.businessName,
        industry: next.industry,
        location: next.location,
        timezone: next.timezone,
        languages: next.languages,
        primaryGoal: next.primaryGoal,
        targetCustomer: next.targetCustomer,
        tone: next.tone,
        greetingStyle: next.greetingStyle,
        offerings: next.offerings,
        hours: next.hours,
        bookingLink: next.bookingLink,
        requiredFields: next.requiredFields,
        faqs: next.faqs,
        disallowed: next.disallowed,
        escalation: next.escalation,
        policies: next.policies,
        extra: next.extra,
      });
      setGeneratedPrompt(r.promptDraft);
    } catch (e) {
      setGenAiError(e instanceof Error ? e.message : "Generation failed");
      // fallback to local template builder (still useful)
      setGeneratedPrompt(buildPrompt(next));
    } finally {
      setGenAiBusy(false);
    }
  }

  async function createFromGenerator() {
    const agentName = (gen.agentName || gen.businessName || "New Agent").trim();
    const promptDraft = generatedPrompt.trim();
    if (!promptDraft) return;
    setGenBusy(true);
    setError(null);
    try {
      const created = await createAgent({ name: agentName, promptDraft });
      setAgents((prev) => [created, ...prev]);
      toast.success("Generated agent created");
      setGenOpen(false);
      nav(`/app/agents/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent");
      toast.error("Failed to create generated agent");
    } finally {
      setGenBusy(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      toast.success("Agent deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete agent");
      toast.error("Failed to delete agent");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Create an agent by name, then open it to customize the prompt and talk.
          </p>
        </div>
        <Button onClick={refresh} variant="secondary">
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Create agent</div>
            <div className="text-sm text-slate-300">Give it a name. You’ll edit prompt inside the agent page.</div>
          </div>
          <div className="w-full max-w-md">
            <Input value={name} onChange={setName} placeholder="e.g. Sales helper" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openGenerator} disabled={genBusy}>
              <Sparkles size={16} /> Generate
            </Button>
            <Button onClick={onCreate} disabled={!canCreate || creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </Card>

      <Drawer
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title={genStep === 1 ? "Generate: choose a template" : genStep === 2 ? "Generate: personalize" : "Generate: review"}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400">Step {genStep} / 3</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGenStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
                disabled={genStep === 1}
              >
                Back
              </button>
              <button
                onClick={async () => {
                  if (genStep === 1) {
                    setGenStep(2);
                    return;
                  }
                  if (genStep === 2) {
                    await runAiGenerate(gen);
                    setGenStep(3);
                    return;
                  }
                }}
                className="rounded-xl bg-indigo-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                disabled={genStep === 3 || genAiBusy}
              >
                {genAiBusy && genStep === 2 ? "Generating…" : "Next"}
              </button>
            </div>
          </div>

          {genStep === 1 ? (
            <div className="grid gap-3">
              {TEMPLATES.map((t) => {
                const selected = gen.templateId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      const next = { ...gen, templateId: t.id };
                      setGen(next);
                      setGeneratedPrompt(buildPrompt(next));
                    }}
                    className={[
                      "text-left rounded-3xl border p-4 transition",
                      selected
                        ? "border-brand-500/40 bg-brand-500/10 shadow-glow"
                        : "border-white/10 bg-white/5 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{t.name}</div>
                        <div className="mt-1 text-xs text-slate-300">{t.tagline}</div>
                      </div>
                      {selected ? (
                        <div className="text-brand-200">
                          <CheckCircle2 size={18} />
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-2">
                      {t.bullets.map((b) => (
                        <div key={b} className="text-xs text-slate-300">
                          • {b}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {genStep === 2 ? (
            <div className="space-y-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">Basics</div>
                <div className="mt-3 grid gap-3">
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Agent name</div>
                    <Input
                      value={gen.agentName}
                      onChange={(v) => {
                        const next = { ...gen, agentName: v };
                        setGen(next);
                      }}
                      placeholder="e.g. Sofia • Ortho Assistant"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Business name</div>
                    <Input value={gen.businessName} onChange={(v) => setGen({ ...gen, businessName: v })} placeholder="e.g. Lightning Orthodontics" />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Industry</div>
                      <Input value={gen.industry} onChange={(v) => setGen({ ...gen, industry: v })} placeholder="e.g. Dental / Ortho" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Location</div>
                      <Input value={gen.location} onChange={(v) => setGen({ ...gen, location: v })} placeholder="City, Country" />
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Timezone</div>
                      <Input value={gen.timezone} onChange={(v) => setGen({ ...gen, timezone: v })} placeholder="e.g. America/New_York" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Languages</div>
                      <Input value={gen.languages} onChange={(v) => setGen({ ...gen, languages: v })} placeholder="e.g. English, Arabic" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">Personalize</div>
                <div className="mt-3 grid gap-3">
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Primary goal (what should happen on a good call?)</div>
                    <Textarea
                      value={gen.primaryGoal}
                      onChange={(v) => setGen({ ...gen, primaryGoal: v })}
                      rows={3}
                      placeholder="e.g. Book a free consultation and collect name + phone + preferred time."
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Offerings / services (optional)</div>
                    <Textarea
                      value={gen.offerings}
                      onChange={(v) => setGen({ ...gen, offerings: v })}
                      rows={3}
                      placeholder="e.g. Free consultation, braces, Invisalign, retainers, pricing discussion handled by staff…"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Tone</div>
                      <select
                        value={gen.tone}
                        onChange={(e) => setGen({ ...gen, tone: e.target.value as any })}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value="professional">Professional</option>
                        <option value="warm">Warm</option>
                        <option value="friendly">Friendly</option>
                      </select>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Target customer (optional)</div>
                      <Input value={gen.targetCustomer} onChange={(v) => setGen({ ...gen, targetCustomer: v })} placeholder="e.g. Parents of teens" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Greeting style (optional)</div>
                    <Input
                      value={gen.greetingStyle}
                      onChange={(v) => setGen({ ...gen, greetingStyle: v })}
                      placeholder='e.g. "Short, warm, confident. Ask one question at a time."'
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Office hours (optional)</div>
                      <Input value={gen.hours} onChange={(v) => setGen({ ...gen, hours: v })} placeholder="Mon–Fri 9am–6pm" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-slate-400">Booking link (optional)</div>
                      <Input value={gen.bookingLink} onChange={(v) => setGen({ ...gen, bookingLink: v })} placeholder="https://..." />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Required info to capture (comma-separated)</div>
                    <Input
                      value={gen.requiredFields}
                      onChange={(v) => setGen({ ...gen, requiredFields: v })}
                      placeholder="name, phone number, reason, preferred time, email…"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">FAQs you want the agent to answer (optional)</div>
                    <Textarea
                      value={gen.faqs}
                      onChange={(v) => setGen({ ...gen, faqs: v })}
                      rows={4}
                      placeholder="Examples:\n- Do you accept insurance?\n- What’s the address?\n- How long is a consultation?\n- What should I bring?"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Disallowed topics / strict rules (optional)</div>
                    <Textarea
                      value={gen.disallowed}
                      onChange={(v) => setGen({ ...gen, disallowed: v })}
                      rows={3}
                      placeholder="Examples:\n- No medical advice\n- Never quote prices\n- No discounts\n- Don’t mention internal tools"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Policies / constraints (optional)</div>
                    <Textarea value={gen.policies} onChange={(v) => setGen({ ...gen, policies: v })} rows={3} placeholder="Pricing policy, refunds, what you can/can't say..." />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Escalation rule (optional)</div>
                    <Textarea value={gen.escalation} onChange={(v) => setGen({ ...gen, escalation: v })} rows={2} placeholder="When should it handoff to a human?" />
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-slate-400">Extra instructions (optional)</div>
                    <Textarea value={gen.extra} onChange={(v) => setGen({ ...gen, extra: v })} rows={3} placeholder="Anything unique about your business or how you want the agent to behave…" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {genStep === 3 ? (
            <div className="space-y-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white">Generated prompt (editable)</div>
                <div className="mt-2 text-xs text-slate-400">
                  You can edit this before creating the agent. After creation, you can refine it in the Prompt tab.
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400">
                    {genAiError ? "AI unavailable — using fallback prompt." : "AI-generated prompt ready."}
                  </div>
                  <button
                    onClick={() => runAiGenerate(gen)}
                    disabled={genAiBusy}
                    className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    {genAiBusy ? "Regenerating…" : "Regenerate"}
                  </button>
                </div>
                {genAiError ? (
                  <div className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
                    {genAiError}
                  </div>
                ) : null}
                <div className="mt-4">
                  <Textarea
                    value={generatedPrompt}
                    onChange={setGeneratedPrompt}
                    rows={16}
                    className="min-h-[360px]"
                  />
                </div>
              </div>

              <Button onClick={createFromGenerator} disabled={genBusy || !generatedPrompt.trim()}>
                <Wand2 size={16} /> {genBusy ? "Creating…" : "Create agent from Generate"}
              </Button>
            </div>
          ) : null}
        </div>
      </Drawer>

      <div className="mt-10">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="text-lg font-semibold">Your agents</div>
            <div className="text-sm text-slate-300">
              {loading ? "Loading…" : `${agents.length} saved`}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{a.name}</div>
                  <div className="mt-1 text-xs text-slate-400">id: {a.id}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => onDelete(a.id)}
                    className="px-3"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-300">
                Prompt:{" "}
                <span className="text-slate-100">
                  {(a.promptDraft && a.promptDraft.trim()) || (a.promptPublished && a.promptPublished.trim())
                    ? "set"
                    : "not set"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <Button onClick={() => nav(`/app/agents/${a.id}`)}>Open</Button>
                <div className="text-xs text-slate-400">
                  Edit prompt & talk
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}



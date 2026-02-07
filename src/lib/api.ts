import { getToken, signOut } from "./auth";

export type AgentProfile = {
  id: string;
  name: string;
  promptDraft?: string;
  promptPublished?: string;
  llmModel?: string; // persisted per-agent LLM model (e.g., "gpt-5.2")
  autoEvalEnabled?: boolean;
  knowledgeFolderIds?: string[];
  maxCallSeconds?: number; // hard cap; 0 = unlimited
  welcome?: {
    mode?: "ai" | "user";
    aiMessageMode?: "dynamic" | "custom";
    aiMessageText?: string;
    aiDelaySeconds?: number;
  };
  voice?: {
    provider?: "elevenlabs" | "cartesia";
    model?: string | null;
    voiceId?: string | null;
  };
  backgroundAudio?: {
    preset?: "none" | "office" | "keyboard";
    ambientVolume?: number;
    thinkingVolume?: number;
  };
  createdAt: number;
  publishedAt?: number | null;
  updatedAt?: number;
};

export type AgentVariant = {
  id: string;
  agentId: string;
  workspaceId: string;
  name: string;
  prompt: string;
  trafficPercent: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
};

export type StartResponse = {
  livekitUrl: string;
  roomName: string;
  token: string;
  agent: { id: string; name: string };
  callId: string;
  expectedAgentName?: string | null;
};

export type CallTranscriptItem = {
  speaker: string;
  role: "agent" | "user";
  text: string;
  final?: boolean;
  firstReceivedTime?: number;
};

export type CallRecord = {
  id: string;
  agentId: string;
  agentName: string;
  to: string; // phone number or "webtest"
  roomName: string;
  startedAt: number;
  endedAt: number | null;
  durationSec: number | null;
  outcome: string;
  costUsd: number | null;
  transcript: CallTranscriptItem[];
  recording:
    | null
    | {
        kind: "egress_s3";
        egressId: string;
        bucket: string;
        key: string;
        status: "recording" | "stopping" | "ready" | "failed";
        url: string; // `/api/calls/:id/recording` (redirects to signed URL)
      }
    | {
        // legacy/manual upload (older implementation)
        filename: string;
        mime: string;
        sizeBytes: number;
        url: string;
      };
  createdAt: number;
  updatedAt: number;
  // Server attaches rich metrics (usage + normalized billing + cost breakdowns). Not all calls have this.
  metrics?: any;
};

export type CallEvaluation = {
  id: string;
  callId: string;
  workspaceId: string;
  score: number;
  source?: "manual" | "auto";
  notes: string;
  details?: any;
  createdAt: number;
  updatedAt: number;
};

export type OutboundJob = {
  id: string;
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
  status: "queued" | "dialing" | "in_call" | "completed" | "failed" | "canceled";
  leadName: string;
  phoneE164: string;
  timezone: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: number | null;
  lastError?: string;
  roomName?: string | null;
  agentId: string;
  recordingEnabled: boolean;
  dnc: boolean;
  dncReason?: string;
  metadata?: any;
  providerCallId?: string | null;
  callId?: string | null;
  lockedAt?: number | null;
  lockedBy?: string | null;
};

export type OutboundJobLog = {
  id: string;
  jobId: string;
  workspaceId: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: any;
  createdAt: number;
};

export type CallLabel = {
  id: string;
  callId: string;
  workspaceId: string;
  label: string;
  createdAt: number;
};

export type CallSummary = {
  id: string;
  agentId: string;
  agentName: string;
  to: string;
  roomName: string;
  startedAt: number;
  endedAt: number | null;
  durationSec: number | null;
  outcome: string;
  costUsd: number | null;
  recordingUrl: string | null;
  createdAt: number;
  updatedAt: number;
};

export type AnalyticsTotals = {
  callCount: number;
  completedCallCount: number;
  avgDurationSec: number | null;
  avgLatencyMs: number | null;
  totalTokens: number | null;
};

export type AnalyticsSeriesPoint = {
  day: string; // YYYY-MM-DD (UTC)
  calls: number;
  minutes: number;
};

export type BillingStatus = {
  workspaceId: string;
  mode: "trial" | "paid";
  isTrial: boolean;
  isPaid: boolean;
  hasPaymentMethod: boolean;
  telephonyEnabled: boolean;
  stripe?: { customerId: string | null; subscriptionId: string | null };
  trial: {
    creditUsd: number;
    approxMinutesRemaining: number;
    allowPstn: boolean;
    allowNumberPurchase: boolean;
  };
  pricing: {
    baseUsdPerMin: number;
    defaultLlmModel: string;
    includedTokensPerMin: number;
    tokenOverageUsdPer1K: number;
    llmSurchargeUsdPerMinByModel: Record<string, number>;
    telephonyUsdPerMin: number;
    telephonyMarkupRate: number;
    phoneNumberMonthlyFeeUsd: number;
  };
};

export type UpcomingInvoiceLine = {
  id: string;
  description: string;
  amountCents: number;
  quantity: number | null;
  unitAmountCents: number | null;
  priceId: string | null;
  proration?: boolean;
  periodStart: number | null;
  periodEnd: number | null;
};

export type UpcomingInvoiceResponse = {
  currency: string;
  totalCents: number;
  totalUsd: number;
  dueNowCents?: number;
  dueNowUsd?: number;
  nextInvoiceCents?: number;
  nextInvoiceUsd?: number;
  lines: UpcomingInvoiceLine[];
  sums: { linesCents: number; matchesTotal: boolean };
};

export type BillingUsageSummaryLine = {
  key: "voice_base_minutes" | "voice_model_upgrade_minutes" | "telephony_minutes" | "llm_token_overage_1k" | string;
  description: string;
  unit: string;
  quantity: number | null;
  unitAmountCents: number | null;
  amountCents: number | null;
  priceId: string | null;
};

export type BillingUsageSummaryResponse = {
  ok: true;
  skipped?: boolean;
  reason?: string;
  periodStartMs: number | null;
  periodEndMs: number | null;
  totalCents: number;
  totalUsd: number;
  lines: BillingUsageSummaryLine[];
};

export type BillingInvoiceLine = {
  id: string | null;
  name: string;
  quantity: number | null;
  amountCents: number | null;
  amountUsd: number | null;
  details: any;
  externalIds?: any;
};

export type BillingInvoice = {
  id: string;
  number: string | null;
  status: string | null; // "gathering" (upcoming) or "issued" (history) etc
  currency: string;
  createdAtMs: number | null;
  issuedAtMs: number | null;
  periodFromMs: number | null;
  periodToMs: number | null;
  totalCents: number | null;
  totalUsd: number | null;
  url: string | null;
  lines: BillingInvoiceLine[];
  externalIds?: any;
  statusDetails?: any;
  validationIssues?: any;
  workflow?: any;
};

export type BillingInvoicesResponse = {
  ok: true;
  skipped?: boolean;
  reason?: string;
  upcoming: BillingInvoice | null;
  history: BillingInvoice[];
};

export type MetricsSnapshot = {
  // basic webrtc-ish metrics we store today
  latency?: {
    llm_ttft_ms_avg?: number | null;
    eou_transcription_ms_avg?: number | null;
    eou_end_ms_avg?: number | null;
    agent_turn_latency_ms_avg?: number | null;
  };
  // usage numbers
  usage?: {
    llm_prompt_tokens?: number;
    llm_prompt_cached_tokens?: number;
    llm_completion_tokens?: number;
    stt_audio_duration?: number;
    tts_characters_count?: number;
  };
};

export type AgentUsageSummary = {
  agentId: string;
  range: { from: number; to: number; tz: string };
  totals: {
    durationSec: number;
    minutes: number;
    llmPromptTokens: number;
    llmPromptCachedTokens: number;
    llmCompletionTokens: number;
    sttAudioSeconds: number;
    ttsCharacters: number;
  };
};

export type AgentAnalytics = {
  agentId: string;
  totals: AnalyticsTotals & { callCount: number; completedCallCount: number };
  latest: null | {
    callId: string;
    endedAt: number | null;
    durationSec: number | null;
    tokensTotal: number | null;
    latencyMs: number | null;
  };
};

export type Workspace = {
  id: string;
  name: string;
  userId?: string | null;
  twilioSubaccountSid: string | null;
  createdAt: number;
  updatedAt: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt?: number;
  updatedAt?: number;
};

export type PhoneNumber = {
  id: string;
  workspaceId: string;
  e164: string;
  label: string;
  provider: "twilio";
  status: "unconfigured" | "ready" | "active" | "partial" | "error";
  twilioNumberSid: string | null;
  livekitInboundTrunkId: string | null;
  livekitOutboundTrunkId: string | null;
  livekitSipUsername?: string | null;
  livekitSipPassword?: string | null;
  inboundAgentId: string | null;
  outboundAgentId: string | null;
  allowedInboundCountries: string[];
  allowedOutboundCountries: string[];
  createdAt: number;
  updatedAt: number;
};

export type TwilioAvailableNumber = {
  phoneNumber: string;
  friendlyName: string | null;
  locality: string | null;
  region: string | null;
  isoCountry: string;
  capabilities: null | Record<string, unknown>;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

async function readError(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    if (!txt) return `${res.status}`;
    return txt;
  } catch {
    return `${res.status}`;
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers || undefined);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const csrf = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("csrf_token="))
    ?.split("=")[1];
  if (csrf) headers.set("x-csrf-token", decodeURIComponent(csrf));
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  if (res.status === 401) {
    // Token is no longer valid on the server (expired/deleted) -> force re-login.
    signOut();
  }
  return res;
}

export async function register(input: { name: string; email: string; password: string }): Promise<{
  token: string;
  user: User;
  workspace: Workspace;
}> {
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`register failed: ${await readError(res)}`);
  return (await res.json()) as { token: string; user: User; workspace: Workspace };
}

export async function login(input: { email: string; password: string }): Promise<{
  token: string;
  user: User;
  workspace: Workspace;
}> {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`login failed: ${await readError(res)}`);
  return (await res.json()) as { token: string; user: User; workspace: Workspace };
}

export async function logout(): Promise<void> {
  const res = await apiFetch("/api/auth/logout", { method: "POST" });
  if (!res.ok) throw new Error(`logout failed: ${await readError(res)}`);
}

export async function getMe(): Promise<{ user: User; workspace: Workspace }> {
  const res = await apiFetch("/api/me");
  if (!res.ok) throw new Error(`getMe failed: ${await readError(res)}`);
  return (await res.json()) as { user: User; workspace: Workspace };
}

export async function listAgents(): Promise<AgentProfile[]> {
  const res = await apiFetch(`/api/agents`);
  if (!res.ok) throw new Error(`listAgents failed: ${await readError(res)}`);
  const data = (await res.json()) as { agents: AgentProfile[] };
  return data.agents;
}

export async function createAgent(input: {
  name: string;
  promptDraft?: string;
  promptPublished?: string;
  llmModel?: string;
  maxCallSeconds?: number;
  welcome?: AgentProfile["welcome"];
  voice?: AgentProfile["voice"];
}): Promise<AgentProfile> {
  const res = await apiFetch(`/api/agents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createAgent failed: ${await readError(res)}`);
  const data = (await res.json()) as { agent: AgentProfile };
  return data.agent;
}

export async function getAgent(id: string): Promise<AgentProfile> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`getAgent failed: ${await readError(res)}`);
  const data = (await res.json()) as { agent: AgentProfile };
  return data.agent;
}

export async function updateAgent(
  id: string,
  input: {
    name?: string;
    promptDraft?: string;
    publish?: boolean;
    llmModel?: string;
    autoEvalEnabled?: boolean;
    knowledgeFolderIds?: string[];
    maxCallSeconds?: number;
    welcome?: AgentProfile["welcome"];
    voice?: AgentProfile["voice"];
    backgroundAudio?: AgentProfile["backgroundAudio"];
  }
): Promise<AgentProfile> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`updateAgent failed: ${await readError(res)}`);
  const data = (await res.json()) as { agent: AgentProfile };
  return data.agent;
}

export async function listAgentVariants(id: string): Promise<AgentVariant[]> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}/variants`);
  if (!res.ok) throw new Error(`listAgentVariants failed: ${await readError(res)}`);
  const data = (await res.json()) as { variants: AgentVariant[] };
  return data.variants;
}

export async function createAgentVariant(
  id: string,
  input: { name: string; prompt: string; trafficPercent: number; enabled?: boolean }
): Promise<AgentVariant> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}/variants`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createAgentVariant failed: ${await readError(res)}`);
  const data = (await res.json()) as { variant: AgentVariant };
  return data.variant;
}

export async function updateAgentVariant(
  agentId: string,
  variantId: string,
  input: { name?: string; prompt?: string; trafficPercent?: number; enabled?: boolean }
): Promise<AgentVariant> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(agentId)}/variants/${encodeURIComponent(variantId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`updateAgentVariant failed: ${await readError(res)}`);
  const data = (await res.json()) as { variant: AgentVariant };
  return data.variant;
}

export async function deleteAgentVariant(agentId: string, variantId: string): Promise<void> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(agentId)}/variants/${encodeURIComponent(variantId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`deleteAgentVariant failed: ${await readError(res)}`);
}

export async function previewTts(input: {
  provider: "elevenlabs" | "cartesia";
  model?: string;
  voiceId: string;
  text: string;
}): Promise<Blob> {
  const res = await apiFetch(`/api/tts/preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`previewTts failed: ${await readError(res)}`);
  return await res.blob();
}

export async function generateAgentPrompt(input: {
  templateId: string;
  agentName?: string;
  businessName?: string;
  industry?: string;
  location?: string;
  timezone?: string;
  languages?: string;
  primaryGoal?: string;
  targetCustomer?: string;
  tone?: string;
  greetingStyle?: string;
  offerings?: string;
  hours?: string;
  bookingLink?: string;
  requiredFields?: string;
  faqs?: string;
  disallowed?: string;
  escalation?: string;
  policies?: string;
  extra?: string;
}): Promise<{ promptDraft: string }> {
  const res = await apiFetch(`/api/agents/generate-prompt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`generateAgentPrompt failed: ${await readError(res)}`);
  return (await res.json()) as { promptDraft: string };
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteAgent failed: ${await readError(res)}`);
}

export async function startAgent(
  id: string,
  input?: { welcome?: AgentProfile["welcome"] }
): Promise<StartResponse> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}/start`, {
    method: "POST",
    headers: input ? { "content-type": "application/json" } : undefined,
    body: input ? JSON.stringify(input) : undefined,
  });
  if (!res.ok) throw new Error(`startAgent failed: ${await readError(res)}`);
  return (await res.json()) as StartResponse;
}

export async function listCalls(): Promise<CallSummary[]> {
  const res = await apiFetch(`/api/calls`);
  if (!res.ok) throw new Error(`listCalls failed: ${await readError(res)}`);
  const data = (await res.json()) as { calls: CallSummary[] };
  return data.calls;
}

export async function getCall(id: string): Promise<CallRecord> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`getCall failed: ${await readError(res)}`);
  const data = (await res.json()) as { call: CallRecord };
  return data.call;
}

export async function exportCall(id: string): Promise<{ call: CallRecord }> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/export`);
  if (!res.ok) throw new Error(`exportCall failed: ${await readError(res)}`);
  return (await res.json()) as { call: CallRecord };
}

export async function listCallEvaluations(id: string): Promise<CallEvaluation[]> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/evaluations`);
  if (!res.ok) throw new Error(`listCallEvaluations failed: ${await readError(res)}`);
  const data = (await res.json()) as { evaluations: CallEvaluation[] };
  return data.evaluations;
}

export async function createCallEvaluation(
  id: string,
  input: { score: number; notes?: string }
): Promise<CallEvaluation> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/evaluations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createCallEvaluation failed: ${await readError(res)}`);
  const data = (await res.json()) as { evaluation: CallEvaluation };
  return data.evaluation;
}

export async function autoEvaluateCall(id: string): Promise<CallEvaluation> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/auto-evaluate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`autoEvaluateCall failed: ${await readError(res)}`);
  const data = (await res.json()) as { evaluation: CallEvaluation };
  return data.evaluation;
}

export async function listCallLabels(id: string): Promise<CallLabel[]> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/labels`);
  if (!res.ok) throw new Error(`listCallLabels failed: ${await readError(res)}`);
  const data = (await res.json()) as { labels: CallLabel[] };
  return data.labels;
}

export async function addCallLabel(id: string, label: string): Promise<CallLabel> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/labels`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(`addCallLabel failed: ${await readError(res)}`);
  const data = (await res.json()) as { label: CallLabel };
  return data.label;
}

export async function deleteCallLabel(id: string, label: string): Promise<void> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/labels`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(`deleteCallLabel failed: ${await readError(res)}`);
}

export async function listOutboundJobs(input?: { status?: string; limit?: number; offset?: number }): Promise<OutboundJob[]> {
  const qs = new URLSearchParams();
  if (input?.status) qs.set("status", input.status);
  if (typeof input?.limit === "number") qs.set("limit", String(input.limit));
  if (typeof input?.offset === "number") qs.set("offset", String(input.offset));
  const path = qs.toString() ? `/api/outbound/jobs?${qs.toString()}` : "/api/outbound/jobs";
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`listOutboundJobs failed: ${await readError(res)}`);
  const data = (await res.json()) as { jobs: OutboundJob[] };
  return data.jobs;
}

export async function createOutboundJob(input: {
  agentId: string;
  leadName?: string;
  phoneE164: string;
  timezone?: string;
  maxAttempts?: number;
  recordingEnabled?: boolean;
  metadata?: any;
}): Promise<OutboundJob> {
  const res = await apiFetch(`/api/outbound/jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createOutboundJob failed: ${await readError(res)}`);
  const data = (await res.json()) as { job: OutboundJob };
  return data.job;
}

export async function cancelOutboundJob(id: string): Promise<OutboundJob> {
  const res = await apiFetch(`/api/outbound/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" });
  if (!res.ok) throw new Error(`cancelOutboundJob failed: ${await readError(res)}`);
  const data = (await res.json()) as { job: OutboundJob };
  return data.job;
}

export async function dncOutboundJob(id: string, reason?: string): Promise<OutboundJob> {
  const res = await apiFetch(`/api/outbound/jobs/${encodeURIComponent(id)}/dnc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`dncOutboundJob failed: ${await readError(res)}`);
  const data = (await res.json()) as { job: OutboundJob };
  return data.job;
}

export async function listOutboundJobLogs(id: string): Promise<OutboundJobLog[]> {
  const res = await apiFetch(`/api/outbound/jobs/${encodeURIComponent(id)}/logs`);
  if (!res.ok) throw new Error(`listOutboundJobLogs failed: ${await readError(res)}`);
  const data = (await res.json()) as { logs: OutboundJobLog[] };
  return data.logs;
}

export async function endCall(
  id: string,
  input: { outcome?: string; costUsd?: number; transcript?: CallTranscriptItem[] }
): Promise<CallRecord> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/end`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`endCall failed: ${await readError(res)}`);
  const data = (await res.json()) as { call: CallRecord };
  return data.call;
}

export async function getAnalytics(): Promise<{ totals: AnalyticsTotals }> {
  const res = await apiFetch(`/api/analytics`);
  if (!res.ok) throw new Error(`getAnalytics failed: ${await readError(res)}`);
  return (await res.json()) as { totals: AnalyticsTotals };
}

export async function getAnalyticsRange(input: {
  from: number;
  to: number;
}): Promise<{ range: { from: number; to: number; tz: string }; totals: AnalyticsTotals; series: AnalyticsSeriesPoint[] }> {
  const qs = new URLSearchParams({ from: String(input.from), to: String(input.to) });
  const res = await apiFetch(`/api/analytics?${qs.toString()}`);
  if (!res.ok) throw new Error(`getAnalyticsRange failed: ${await readError(res)}`);
  return (await res.json()) as { range: { from: number; to: number; tz: string }; totals: AnalyticsTotals; series: AnalyticsSeriesPoint[] };
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const res = await apiFetch(`/api/billing/status`);
  if (!res.ok) throw new Error(`getBillingStatus failed: ${await readError(res)}`);
  return (await res.json()) as BillingStatus;
}

export async function ensureStripeSubscription(): Promise<{
  ok: true;
  workspace: { id: string; stripeCustomerId: string | null; stripeSubscriptionId: string | null; stripePhoneNumbersItemId: string | null };
}> {
  const res = await apiFetch(`/api/billing/ensure-subscription`, { method: "POST" });
  if (!res.ok) throw new Error(`ensureStripeSubscription failed: ${await readError(res)}`);
  return (await res.json()) as {
    ok: true;
    workspace: { id: string; stripeCustomerId: string | null; stripeSubscriptionId: string | null; stripePhoneNumbersItemId: string | null };
  };
}

export async function startBillingUpgrade(): Promise<{ ok: true; url: string }> {
  const res = await apiFetch(`/api/billing/upgrade`, { method: "POST" });
  if (!res.ok) throw new Error(`startBillingUpgrade failed: ${await readError(res)}`);
  return (await res.json()) as { ok: true; url: string };
}

export async function verifyBillingUpgrade(): Promise<{ ok: boolean; status: string }> {
  const res = await apiFetch(`/api/billing/verify-upgrade`, { method: "POST" });
  if (!res.ok) throw new Error(`verifyBillingUpgrade failed: ${await readError(res)}`);
  return (await res.json()) as { ok: boolean; status: string };
}

export async function getUpcomingInvoice(): Promise<UpcomingInvoiceResponse> {
  const res = await apiFetch(`/api/billing/upcoming-invoice`);
  if (!res.ok) throw new Error(`getUpcomingInvoice failed: ${await readError(res)}`);
  return (await res.json()) as UpcomingInvoiceResponse;
}

export async function getBillingUsageSummary(): Promise<BillingUsageSummaryResponse> {
  const res = await apiFetch(`/api/billing/usage-summary`);
  if (!res.ok) throw new Error(`getBillingUsageSummary failed: ${await readError(res)}`);
  return (await res.json()) as BillingUsageSummaryResponse;
}

export async function getBillingInvoices(): Promise<BillingInvoicesResponse> {
  const res = await apiFetch(`/api/billing/invoices`);
  if (!res.ok) throw new Error(`getBillingInvoices failed: ${await readError(res)}`);
  return (await res.json()) as BillingInvoicesResponse;
}

export async function getCallRecordingUrl(id: string): Promise<{ url: string }> {
  const res = await apiFetch(`/api/calls/${encodeURIComponent(id)}/recording-url`);
  if (!res.ok) throw new Error(`getCallRecordingUrl failed: ${await readError(res)}`);
  return (await res.json()) as { url: string };
}

export async function getAgentAnalytics(id: string): Promise<AgentAnalytics> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}/analytics`);
  if (!res.ok) throw new Error(`getAgentAnalytics failed: ${await readError(res)}`);
  return (await res.json()) as AgentAnalytics;
}

export async function getAgentUsageSummary(id: string): Promise<AgentUsageSummary> {
  const res = await apiFetch(`/api/agents/${encodeURIComponent(id)}/usage-summary`);
  if (!res.ok) throw new Error(`getAgentUsageSummary failed: ${await readError(res)}`);
  return (await res.json()) as AgentUsageSummary;
}

// --- Knowledge Base ---
export type KbFolder = { id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number };
export type KbDoc = {
  id: string;
  folderId: string;
  kind: "text" | "pdf" | string;
  title: string;
  contentText: string;
  sourceFilename: string | null;
  mime: string | null;
  sizeBytes: number | null;
  createdAt: number;
  updatedAt: number;
};

export async function listKbFolders(): Promise<KbFolder[]> {
  const res = await apiFetch(`/api/kb/folders`);
  if (!res.ok) throw new Error(`listKbFolders failed: ${await readError(res)}`);
  const data = (await res.json()) as { folders: KbFolder[] };
  return data.folders;
}

export async function createKbFolder(input: { name: string; parentId?: string | null }): Promise<KbFolder> {
  const res = await apiFetch(`/api/kb/folders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createKbFolder failed: ${await readError(res)}`);
  const data = (await res.json()) as { folder: KbFolder };
  return data.folder;
}

export async function deleteKbFolder(id: string): Promise<void> {
  const res = await apiFetch(`/api/kb/folders/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteKbFolder failed: ${await readError(res)}`);
}

export async function listKbDocs(folderId: string): Promise<KbDoc[]> {
  const res = await apiFetch(`/api/kb/folders/${encodeURIComponent(folderId)}/docs`);
  if (!res.ok) throw new Error(`listKbDocs failed: ${await readError(res)}`);
  const data = (await res.json()) as { docs: KbDoc[] };
  return data.docs;
}

export async function createKbTextDoc(folderId: string, input: { title?: string; contentText: string }): Promise<KbDoc> {
  const res = await apiFetch(`/api/kb/folders/${encodeURIComponent(folderId)}/text`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createKbTextDoc failed: ${await readError(res)}`);
  const data = (await res.json()) as { doc: KbDoc };
  return data.doc;
}

export async function uploadKbPdf(folderId: string, input: { title?: string; file: File }): Promise<KbDoc> {
  const fd = new FormData();
  fd.append("file", input.file);
  if (input.title) fd.append("title", input.title);
  const res = await apiFetch(`/api/kb/folders/${encodeURIComponent(folderId)}/pdf`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`uploadKbPdf failed: ${await readError(res)}`);
  const data = (await res.json()) as { doc: KbDoc };
  return data.doc;
}

export async function deleteKbDoc(id: string): Promise<void> {
  const res = await apiFetch(`/api/kb/docs/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteKbDoc failed: ${await readError(res)}`);
}

export async function listPhoneNumbers(_workspaceId?: string): Promise<PhoneNumber[]> {
  // server now scopes by auth; workspaceId is ignored (kept for backward compat).
  const res = await apiFetch(`/api/phone-numbers`);
  if (!res.ok) throw new Error(`listPhoneNumbers failed: ${await readError(res)}`);
  const data = (await res.json()) as { phoneNumbers: PhoneNumber[] };
  return data.phoneNumbers;
}

export async function createPhoneNumber(input: {
  e164: string;
  label?: string;
}): Promise<PhoneNumber> {
  const res = await apiFetch(`/api/phone-numbers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`createPhoneNumber failed: ${await readError(res)}`);
  const data = (await res.json()) as { phoneNumber: PhoneNumber };
  return data.phoneNumber;
}

export async function updatePhoneNumber(
  id: string,
  input: {
    label?: string;
    inboundAgentId?: string | null;
    outboundAgentId?: string | null;
    livekitInboundTrunkId?: string | null;
    livekitOutboundTrunkId?: string | null;
    livekitSipUsername?: string | null;
    livekitSipPassword?: string | null;
    allowedInboundCountries?: string[] | string;
    allowedOutboundCountries?: string[] | string;
  }
): Promise<PhoneNumber> {
  const res = await apiFetch(`/api/phone-numbers/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`updatePhoneNumber failed: ${await readError(res)}`);
  const data = (await res.json()) as { phoneNumber: PhoneNumber };
  return data.phoneNumber;
}

export async function deletePhoneNumber(id: string): Promise<void> {
  const res = await apiFetch(`/api/phone-numbers/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deletePhoneNumber failed: ${await readError(res)}`);
}

export async function ensureTwilioSubaccount(workspaceId: string): Promise<Workspace> {
  const res = await apiFetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/twilio/subaccount`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`ensureTwilioSubaccount failed: ${await readError(res)}`);
  const data = (await res.json()) as { workspace: Workspace };
  return data.workspace;
}

export async function searchTwilioNumbers(input: {
  workspaceId: string;
  country: string;
  type: "local" | "tollfree";
  contains?: string;
  limit?: number;
}): Promise<TwilioAvailableNumber[]> {
  const qs = new URLSearchParams();
  qs.set("country", input.country);
  qs.set("type", input.type);
  if (input.contains) qs.set("contains", input.contains);
  if (input.limit) qs.set("limit", String(input.limit));
  const res = await apiFetch(
    `/api/workspaces/${encodeURIComponent(input.workspaceId)}/twilio/available-numbers?${qs.toString()}`
  );
  if (!res.ok) throw new Error(`searchTwilioNumbers failed: ${await readError(res)}`);
  const data = (await res.json()) as { numbers: TwilioAvailableNumber[] };
  return data.numbers;
}

export async function buyTwilioNumber(input: {
  workspaceId: string;
  phoneNumber: string;
  label?: string;
}): Promise<{ phoneNumber: PhoneNumber; provisioned: boolean; provisionErrors?: string[] }> {
  const res = await apiFetch(`/api/workspaces/${encodeURIComponent(input.workspaceId)}/twilio/buy-number`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phoneNumber: input.phoneNumber, label: input.label }),
  });
  if (!res.ok) throw new Error(`buyTwilioNumber failed: ${await readError(res)}`);
  return (await res.json()) as { phoneNumber: PhoneNumber; provisioned: boolean; provisionErrors?: string[] };
}

export async function reprovisionOutbound(phoneNumberId: string): Promise<{ ok: boolean; trunkId?: string; errors?: string[] }> {
  const res = await apiFetch(`/api/phone-numbers/${encodeURIComponent(phoneNumberId)}/reprovision-outbound`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`reprovisionOutbound failed: ${await readError(res)}`);
  return (await res.json()) as { ok: boolean; trunkId?: string; errors?: string[] };
}



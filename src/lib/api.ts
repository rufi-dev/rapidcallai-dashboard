import { getToken, signOut } from "./auth";

export type AgentProfile = {
  id: string;
  name: string;
  promptDraft?: string;
  promptPublished?: string;
  llmModel?: string; // persisted per-agent LLM model (e.g., "gpt-5.2")
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
  createdAt: number;
  publishedAt?: number | null;
  updatedAt?: number;
};

export type StartResponse = {
  livekitUrl: string;
  roomName: string;
  token: string;
  agent: { id: string; name: string };
  callId: string;
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
  totalCostUsd: number | null;
  totalTokens: number | null;
};

export type AnalyticsSeriesPoint = {
  day: string; // YYYY-MM-DD (UTC)
  calls: number;
  minutes: number;
};

export type BillingSummary = {
  currency: "USD";
  periodStartMs: number;
  periodEndMs: number;
  upcomingInvoiceUsd: number | null;
  breakdown:
    | null
    | {
        llmUsd: number;
        sttUsd: number;
        ttsUsd: number;
      };
  usageTotals: {
    llmPromptTokens: number;
    llmPromptCachedTokens: number;
    llmCompletionTokens: number;
    sttAudioSeconds: number;
    ttsCharacters: number;
  };
  pricingConfigured: {
    llm: boolean;
    stt: boolean;
    tts: boolean;
  };
};

export type BillingCatalog = {
  source: "default" | "env" | string;
  llmModels: Array<{
    id: string;
    inputUsdPer1M: number | null;
    cachedInputUsdPer1M: number | null;
    outputUsdPer1M: number | null;
  }>;
  retail?: { markupMultiplier?: number };
  docs?: { openaiPricing?: string };
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
    costUsd: number | null;
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
  status: "unconfigured" | "ready" | "error";
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
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
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
    welcome?: AgentProfile["welcome"];
    voice?: AgentProfile["voice"];
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

export async function getBillingSummary(): Promise<BillingSummary> {
  const res = await apiFetch(`/api/billing/summary`);
  if (!res.ok) throw new Error(`getBillingSummary failed: ${await readError(res)}`);
  return (await res.json()) as BillingSummary;
}

export async function getBillingCatalog(): Promise<BillingCatalog> {
  const res = await apiFetch(`/api/billing/catalog`);
  if (!res.ok) throw new Error(`getBillingCatalog failed: ${await readError(res)}`);
  return (await res.json()) as BillingCatalog;
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
}): Promise<{ phoneNumber: PhoneNumber }> {
  const res = await apiFetch(`/api/workspaces/${encodeURIComponent(input.workspaceId)}/twilio/buy-number`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phoneNumber: input.phoneNumber, label: input.label }),
  });
  if (!res.ok) throw new Error(`buyTwilioNumber failed: ${await readError(res)}`);
  return (await res.json()) as { phoneNumber: PhoneNumber };
}


